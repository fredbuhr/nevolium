#!/usr/bin/env python3
"""Qualify an encrypted off-host Restic backup of the private production target.

The runner writes disposable markers to PostgreSQL, NATS and SeaweedFS, fingerprints
the existing OpenBao workload-token record, calls the existing quiesced backup and
restore procedures, removes the source markers, and restores the remote snapshot into
a new Compose project. Credentials never appear in reports or logs.
"""

from __future__ import annotations

import argparse
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import stat
import subprocess
import tempfile
import time
from urllib.parse import urlsplit
import uuid

from common import Evidence


FREE_TIER_GUARD_BYTES = 9 * 1024**3
EXPECTED_BRANCH = "hardening/d04-real-engine-qualification"
NATS_PROBE = r"""
import asyncio, sys
import nats
from nats.js.errors import NotFoundError

async def main():
    action, stream, subject, value = sys.argv[1:]
    nc = await nats.connect("nats://nats:4222", connect_timeout=10)
    try:
        js = nc.jetstream()
        if action == "seed":
            await js.add_stream(name=stream, subjects=[subject])
            ack = await js.publish(subject, value.encode())
            assert ack.seq == 1
        elif action == "read":
            message = await js.get_msg(stream, seq=1)
            assert message.subject == subject and message.data == value.encode()
        elif action == "delete":
            try:
                await js.delete_stream(stream)
            except NotFoundError:
                pass
        else:
            raise ValueError(action)
    finally:
        await nc.close()

asyncio.run(main())
"""
SEAWEED_PROBE = r"""
import hashlib, sys
import httpx

action, path, value = sys.argv[1:]
url = "http://seaweedfs:8888/" + path.lstrip("/")
with httpx.Client(timeout=20, trust_env=False) as client:
    if action == "seed":
        response = client.post(url, files={"file": ("proof.bin", value.encode())})
        response.raise_for_status()
    elif action == "read":
        response = client.get(url)
        response.raise_for_status()
        assert response.content == value.encode()
        print(hashlib.sha256(response.content).hexdigest())
    elif action == "delete":
        response = client.delete(url)
        if response.status_code not in {200, 202, 204, 404}:
            response.raise_for_status()
    else:
        raise ValueError(action)
"""


class CommandFailure(RuntimeError):
    pass


class Runner:
    def __init__(self, args: argparse.Namespace) -> None:
        self.root = args.project_root.resolve()
        self.env_file = args.env_file.absolute()
        self.restic_env_file = args.restic_env_file.absolute()
        self.openbao_recovery_file = args.openbao_recovery_file.absolute()
        self.report_root = args.report_dir.absolute()
        self.commit = ""
        self.private_log: Path | None = None
        self.redactions: set[str] = set()
        self.restic_values: dict[str, str] = {}
        self.source: list[str] = []
        self.source_ops: list[str] = []
        self.isolated: list[str] = []
        self.isolated_ops: list[str] = []
        self.isolated_project = ""
        self.recovery_probe_image = ""
        self.openbao_workload_record_sha256 = ""
        self.isolated_started = False
        self.source_markers_created = False
        self.probe_id = uuid.uuid4()
        self.probe_value = secrets.token_urlsafe(32)
        suffix = self.probe_id.hex[:12]
        self.nats_stream = f"D04_RECOVERY_{suffix.upper()}"
        self.nats_subject = f"d04.recovery.{suffix}"
        self.seaweed_path = f"d04-recovery/{suffix}.bin"

    def emit(self, event: str, **values: object) -> None:
        print(json.dumps({"event": event, **values}, separators=(",", ":")), flush=True)

    def scrub(self, value: str) -> str:
        result = value
        for secret in sorted(self.redactions, key=len, reverse=True):
            if secret:
                result = result.replace(secret, "[REDACTED]")
        return result

    def run(
        self,
        command: list[str],
        *,
        input_text: str | None = None,
        env: dict[str, str] | None = None,
        allowed: tuple[int, ...] = (0,),
        timeout: int = 300,
    ) -> subprocess.CompletedProcess[str]:
        try:
            result = subprocess.run(
                command,
                cwd=self.root,
                input=input_text,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                timeout=timeout,
            )
        except subprocess.TimeoutExpired as exc:
            raise CommandFailure(f"commande hors delai ({timeout}s)") from exc
        if self.private_log:
            with self.private_log.open("a") as stream:
                stream.write(f"$ {self.scrub(' '.join(command))}\n")
                stream.write(self.scrub(result.stdout))
                stream.write(self.scrub(result.stderr))
        if result.returncode not in allowed:
            tail = (result.stderr or result.stdout).strip().splitlines()[-3:]
            detail = self.scrub(" | ".join(tail))[:700]
            raise CommandFailure(
                f"commande refusee (code {result.returncode})"
                + (f" : {detail}" if detail else "")
            )
        return result

    @staticmethod
    def private_file(path: Path) -> None:
        if not path.is_file() or path.is_symlink() or path.parent.is_symlink():
            raise RuntimeError(f"fichier prive absent ou invalide : {path.name}")
        metadata = path.stat()
        if metadata.st_uid != 0 or stat.S_IMODE(metadata.st_mode) != 0o600:
            raise RuntimeError(f"{path.name} doit appartenir a root en mode 0600")

    @staticmethod
    def env_values(path: Path) -> dict[str, str]:
        values: dict[str, str] = {}
        for raw in path.read_text().splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            key, separator, value = line.partition("=")
            if not separator:
                continue
            if key in values:
                raise RuntimeError(f"variable dupliquee dans {path.name} : {key}")
            values[key] = value
        return values

    @staticmethod
    def atomic_private_write(path: Path, text: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        descriptor, temporary = tempfile.mkstemp(prefix=path.name + ".", dir=path.parent)
        try:
            os.fchmod(descriptor, 0o600)
            with os.fdopen(descriptor, "w") as stream:
                stream.write(text)
                stream.flush()
                os.fsync(stream.fileno())
            os.chown(temporary, 0, 0)
            os.replace(temporary, path)
            os.chmod(path, 0o600)
        except Exception:
            try:
                os.unlink(temporary)
            except FileNotFoundError:
                pass
            raise

    def configure_restic(self) -> dict[str, str]:
        if not self.restic_env_file.exists():
            print("Configuration privee B2/Restic (toutes les saisies sont masquees).", flush=True)
            bucket = getpass.getpass("Bucket Name B2 : ").strip()
            endpoint = getpass.getpass("Endpoint S3 B2 : ").strip()
            key_id = getpass.getpass("keyID de la cle nevolium-restic : ").strip()
            app_key = getpass.getpass("applicationKey de la cle nevolium-restic : ").strip()
            password = getpass.getpass(
                "Mot de passe Restic deja conserve dans votre gestionnaire : "
            ).strip()
            confirmation = getpass.getpass("Confirmer le mot de passe Restic : ").strip()
            if password != confirmation:
                raise RuntimeError("les deux mots de passe Restic different")

            endpoint = endpoint.removeprefix("https://").removeprefix("http://").rstrip("/")
            if not re.fullmatch(r"[a-z0-9][a-z0-9.-]{4,61}[a-z0-9]", bucket):
                raise RuntimeError("nom de bucket B2 inattendu")
            if not re.fullmatch(r"s3\.[a-z0-9-]+\.backblazeb2\.com", endpoint):
                raise RuntimeError("endpoint S3 Backblaze B2 inattendu")
            if not re.fullmatch(r"[A-Za-z0-9_-]{8,128}", key_id):
                raise RuntimeError("keyID B2 inattendu")
            if not re.fullmatch(r"[A-Za-z0-9_-]{20,256}", app_key):
                raise RuntimeError("applicationKey B2 inattendue")
            if not re.fullmatch(r"[A-Za-z0-9_-]{24,128}", password):
                raise RuntimeError(
                    "mot de passe Restic : 24 a 128 lettres, chiffres, _ ou - requis"
                )
            region = endpoint.split(".", 2)[1]
            repository = f"s3:https://{endpoint}/{bucket}/nevolium-production"
            values = {
                "RESTIC_REPOSITORY": repository,
                "RESTIC_PASSWORD": password,
                "RESTIC_AWS_ACCESS_KEY_ID": key_id,
                "RESTIC_AWS_SECRET_ACCESS_KEY": app_key,
                "RESTIC_AWS_DEFAULT_REGION": region,
            }
            self.atomic_private_write(
                self.restic_env_file,
                "# Nevolium off-host Restic repository; root only.\n"
                + "\n".join(f"{key}={value}" for key, value in values.items())
                + "\n",
            )
        self.private_file(self.restic_env_file)
        values = self.env_values(self.restic_env_file)
        required = {
            "RESTIC_REPOSITORY",
            "RESTIC_PASSWORD",
            "RESTIC_AWS_ACCESS_KEY_ID",
            "RESTIC_AWS_SECRET_ACCESS_KEY",
            "RESTIC_AWS_DEFAULT_REGION",
        }
        if set(values) != required or not all(values.values()):
            raise RuntimeError("configuration Restic privee incomplete ou inattendue")
        repository = values["RESTIC_REPOSITORY"]
        if not repository.startswith("s3:https://"):
            raise RuntimeError("le depot Restic doit utiliser B2 via HTTPS/S3")
        parsed = urlsplit(repository.removeprefix("s3:"))
        if not parsed.hostname or not parsed.hostname.endswith(".backblazeb2.com"):
            raise RuntimeError("le depot Restic n'est pas hors hote chez Backblaze B2")
        self.redactions.update(values.values())
        self.restic_values = values
        return values

    def prepare(self) -> Evidence:
        if os.geteuid() != 0:
            raise RuntimeError("executer ce runner avec sudo")
        for name in (
            "compose.yaml",
            "compose.production.yaml",
            "compose.web-mcp.yaml",
            "compose.web-mcp.production.yaml",
            "compose.ops.yaml",
            "scripts/ops/backup.sh",
            "scripts/ops/restore.sh",
        ):
            if not (self.root / name).is_file():
                raise RuntimeError(f"fichier requis absent : {name}")
        self.private_file(self.env_file)
        self.private_file(self.openbao_recovery_file)
        git_env = dict(os.environ, GIT_OPTIONAL_LOCKS="0")
        branch = self.run(
            ["git", "branch", "--show-current"], env=git_env
        ).stdout.strip()
        if branch != EXPECTED_BRANCH:
            raise RuntimeError("branche D04 attendue absente")
        if self.run(
            ["git", "status", "--porcelain"], env=git_env
        ).stdout.strip():
            raise RuntimeError("checkout non propre")
        self.commit = self.run(
            ["git", "rev-parse", "HEAD"], env=git_env
        ).stdout.strip()
        values = self.configure_restic()

        stamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
        report_dir = self.report_root / f"d04-off-host-recovery-{stamp}.{self.probe_id.hex[:6]}"
        report_dir.mkdir(parents=True, mode=0o700)
        os.chmod(report_dir, 0o700)
        self.private_log = report_dir / "private.log"
        self.private_log.touch(mode=0o600)
        self.isolated_project = f"nevolium-d04-restore-{self.probe_id.hex[:10]}"

        common = [
            "docker", "compose", "--project-directory", str(self.root),
            "--env-file", str(self.env_file), "--env-file", str(self.restic_env_file),
        ]
        source_files = [
            self.root / "compose.yaml",
            self.root / "compose.production.yaml",
            self.root / "compose.web-mcp.yaml",
            self.root / "compose.web-mcp.production.yaml",
        ]
        isolated_files = [
            self.root / "compose.yaml",
            self.root / "compose.production.yaml",
        ]
        self.source = common + [value for path in source_files for value in ("-f", str(path))]
        self.source_ops = self.source + ["-f", str(self.root / "compose.ops.yaml"), "--profile", "ops"]
        isolated_common = [*common, "-p", self.isolated_project]
        self.isolated = isolated_common + [
            value for path in isolated_files for value in ("-f", str(path))
        ]
        self.isolated_ops = self.isolated + [
            "-f", str(self.root / "compose.ops.yaml"), "--profile", "ops"
        ]
        self.redactions.add(values["RESTIC_REPOSITORY"])

        evidence = Evidence("target-off-host-recovery", report_dir / "recovery.json")
        images: dict[str, str] = {}
        for service in ("nevolium-core", "postgres", "nats", "seaweedfs", "openbao"):
            container = self.run(self.source + ["ps", "-q", service]).stdout.strip()
            if not container:
                raise RuntimeError(f"service source absent : {service}")
            images[service] = self.run(
                ["docker", "inspect", "--format", "{{.Image}}", container]
            ).stdout.strip()
        probe_image = self.run(
            ["docker", "image", "inspect", "--format", "{{.Id}}", "nevolium-nevolium-core:latest"]
        ).stdout.strip()
        if probe_image != images["nevolium-core"]:
            raise RuntimeError("l'image du probe differe du Core actif")
        self.recovery_probe_image = probe_image
        evidence.data.update(
            commit=self.commit,
            scope="private-target-to-backblaze-b2-isolated-compose",
            provider_calls_paid=False,
            source_host_fingerprint=self.boot_fingerprint(),
            destination={
                "backend": "backblaze-b2-s3",
                "region": values["RESTIC_AWS_DEFAULT_REGION"],
                "repository_sha256": hashlib.sha256(
                    values["RESTIC_REPOSITORY"].encode()
                ).hexdigest(),
            },
            isolated_project_sha256=hashlib.sha256(
                self.isolated_project.encode()
            ).hexdigest(),
            free_tier_guard_bytes=FREE_TIER_GUARD_BYTES,
            source_images=images,
            recovery_probe_image=probe_image,
            report_dir=str(report_dir),
            planned_postgres_artifact_id=str(self.probe_id),
        )
        evidence.save()
        self.emit("configuration_ready", report=str(evidence.output))
        return evidence

    @staticmethod
    def boot_fingerprint() -> str:
        return hashlib.sha256(Path("/proc/sys/kernel/random/boot_id").read_bytes()).hexdigest()

    def query(self, sql: str, *, isolated: bool = False) -> str:
        base = self.isolated if isolated else self.source
        return self.run(
            base + [
                "exec", "-T", "postgres", "sh", "-ec",
                'exec psql -X -q -v ON_ERROR_STOP=1 -At -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
            ],
            input_text=sql,
        ).stdout.strip()

    def active_work(self) -> str:
        return self.query("""
SELECT concat_ws('|',
  (SELECT count(*) FROM workflow_executions
    WHERE status NOT IN ('completed','failed','cancelled')),
  (SELECT count(*) FROM model_reservations
    WHERE status IN ('reserved','started') AND expires_at > now()),
  (SELECT count(*) FROM work_admissions
    WHERE status='active' AND lease_until > now()),
  (SELECT count(*) FROM outbox_events WHERE published_at IS NULL));
""")

    def counts(self) -> str:
        return self.query("""
SELECT concat_ws('|',
  (SELECT count(*) FROM tasks),
  (SELECT count(*) FROM workflow_executions),
  (SELECT count(*) FROM model_usage_records),
  (SELECT count(*) FROM model_reservations),
  (SELECT count(*) FROM tool_invocations),
  (SELECT count(*) FROM artifacts),
  (SELECT count(*) FROM model_reservations WHERE status='uncertain'));
""")

    def restic(self, args: list[str], *, isolated: bool = False, timeout: int = 1800,
               allowed: tuple[int, ...] = (0,)) -> subprocess.CompletedProcess[str]:
        base = self.isolated_ops if isolated else self.source_ops
        return self.run(base + ["run", "--rm", "-T", "restic", *args],
                        timeout=timeout, allowed=allowed)

    def snapshots(self, *, isolated: bool = False) -> list[dict[str, object]]:
        result = self.restic(["snapshots", "--json"], isolated=isolated)
        value = json.loads(result.stdout)
        if not isinstance(value, list):
            raise RuntimeError("liste de snapshots Restic inattendue")
        return value

    def initialize_repository(self) -> dict[str, object]:
        result = self.restic(["snapshots", "--json"], allowed=(0, 10))
        if result.returncode == 10:
            self.restic(["init"])
        snapshots = self.snapshots()
        version = self.restic(["version"]).stdout.strip().splitlines()[0]
        return {"restic": version, "existing_snapshots": len(snapshots)}

    def source_probe(self, script: str, args: list[str]) -> str:
        return self.run(
            self.source + ["exec", "-T", "nevolium-core", "python", "-c", script, *args],
            timeout=90,
        ).stdout.strip()

    def isolated_probe(self, script: str, args: list[str]) -> str:
        if not self.recovery_probe_image.startswith("sha256:"):
            raise RuntimeError("identifiant immuable de l'image du probe absent")
        return self.run(
            [
                "docker", "run", "--rm",
                "--network", f"{self.isolated_project}_canonical",
                "--read-only",
                "--tmpfs", "/tmp:size=67108864,mode=1777",
                "--security-opt", "no-new-privileges:true",
                "--cap-drop", "ALL",
                "--entrypoint", "python",
                self.recovery_probe_image,
                "-c", script, *args,
            ],
            timeout=90,
        ).stdout.strip()

    def bao_as(
        self,
        base: list[str],
        token: str,
        args: list[str],
        *,
        input_text: str | None = None,
        allowed: tuple[int, ...] = (0,),
    ) -> subprocess.CompletedProcess[str]:
        token_path = f"/tmp/d04-recovery-token-{self.probe_id.hex[:8]}"
        self.redactions.add(token)
        self.run(
            base + ["exec", "-T", "openbao", "sh", "-ec", "umask 077; cat > \"$1\"", "sh", token_path],
            input_text=token + "\n",
        )
        try:
            return self.run(
                base + [
                    "exec", "-T", "openbao", "sh", "-ec",
                    'export BAO_TOKEN="$(cat "$1")"; shift; exec bao "$@"',
                    "sh", token_path, *args,
                ],
                input_text=input_text,
                allowed=allowed,
            )
        finally:
            self.run(
                base + ["exec", "-T", "openbao", "rm", "-f", token_path],
                allowed=(0, 1),
            )

    def recovery_material(self, path: Path | None = None) -> list[str]:
        source = path or self.openbao_recovery_file
        value = json.loads(source.read_text())
        if not isinstance(value, dict):
            raise RuntimeError("materiel de recuperation OpenBao inattendu")
        keys = value.get("unseal_keys_b64") or value.get("keys_base64")
        root_token = value.get("root_token")
        threshold = value.get("unseal_threshold", value.get("secret_threshold", 2))
        if not isinstance(keys, list) or len(keys) != 3 or not all(
            isinstance(key, str) and key for key in keys
        ) or threshold != 2:
            raise RuntimeError("materiel de recuperation OpenBao inattendu")
        self.redactions.update(keys)
        if isinstance(root_token, str) and root_token:
            self.redactions.add(root_token)
        return keys

    def workload_record(self, base: list[str]) -> dict[str, object]:
        production = self.env_values(self.env_file)
        workload_token = production.get("OPENBAO_TOKEN", "")
        if not workload_token:
            raise RuntimeError("OPENBAO_TOKEN absent")
        self.redactions.add(workload_token)
        value = json.loads(
            self.bao_as(
                base,
                workload_token,
                ["token", "lookup", "-format=json"],
            ).stdout
        )
        data = value.get("data") if isinstance(value, dict) else None
        if not isinstance(data, dict):
            raise RuntimeError("reponse lookup-self OpenBao inattendue")
        try:
            period = int(data.get("period") or 0)
        except (TypeError, ValueError):
            raise RuntimeError("periode du jeton OpenBao inattendue") from None
        if (
            not isinstance(data.get("accessor"), str)
            or not data["accessor"]
            or data.get("display_name") != "nevolium-core"
            or data.get("policies") != ["nevolium-core"]
            or period != 604800
            or data.get("renewable") is not True
            or data.get("orphan") is not True
        ):
            raise RuntimeError("identite durable du jeton OpenBao inattendue")
        stable = {
            key: data.get(key)
            for key in (
                "accessor",
                "creation_time",
                "creation_ttl",
                "display_name",
                "entity_id",
                "explicit_max_ttl",
                "issue_time",
                "meta",
                "num_uses",
                "orphan",
                "path",
                "period",
                "policies",
                "renewable",
                "type",
            )
        }
        serialized = json.dumps(stable, sort_keys=True, separators=(",", ":"))
        return {
            "record_sha256": hashlib.sha256(serialized.encode()).hexdigest(),
            "accessor_sha256": hashlib.sha256(data["accessor"].encode()).hexdigest(),
            "policy": "nevolium-core",
            "period_seconds": period,
            "orphan": True,
            "renewable": True,
        }

    def unseal_openbao(self, base: list[str], keys: list[str]) -> None:
        deadline = time.monotonic() + 180
        state: dict[str, object] = {}
        while time.monotonic() < deadline:
            status = self.run(
                base + ["exec", "-T", "openbao", "bao", "status", "-format=json"],
                allowed=(0, 1, 2),
            )
            try:
                state = json.loads(status.stdout)
            except json.JSONDecodeError:
                state = {}
            if state.get("initialized"):
                break
            time.sleep(2)
        else:
            raise RuntimeError("OpenBao non joignable apres 180 secondes")
        if state.get("sealed"):
            for key in keys[:2]:
                self.run(
                    base + [
                        "exec", "-T", "openbao", "bao", "write", "-format=json",
                        "sys/unseal", "key=-",
                    ],
                    input_text=key + "\n",
                )
        state = json.loads(self.run(
            base + ["exec", "-T", "openbao", "bao", "status", "-format=json"]
        ).stdout)
        if state.get("sealed") or not state.get("initialized"):
            raise RuntimeError("OpenBao n'est pas initialise et descelle")

    def wait_probe(self, script: str, args: list[str], *, isolated: bool) -> str:
        deadline = time.monotonic() + 120
        last_error: Exception | None = None
        while time.monotonic() < deadline:
            try:
                return (
                    self.isolated_probe(script, args)
                    if isolated
                    else self.source_probe(script, args)
                )
            except (CommandFailure, subprocess.TimeoutExpired) as exc:
                last_error = exc
                time.sleep(2)
        raise RuntimeError("service restaure non pret apres 120 secondes") from last_error

    def seed_markers(self) -> dict[str, object]:
        self.recovery_material()
        # Arm cleanup before sending a write: the database may commit even when
        # the command response is missing, malformed or interrupted.
        self.source_markers_created = True
        inserted = self.query(f"""
INSERT INTO artifacts (id, project_id, kind, title, content)
SELECT '{self.probe_id}'::uuid, id, 'd04-recovery-proof',
       'D04 off-host recovery proof',
       jsonb_build_object('value', '{self.probe_value}')
FROM projects ORDER BY created_at, id LIMIT 1
RETURNING id;
""")
        if inserted != str(self.probe_id):
            raise RuntimeError("marqueur PostgreSQL non cree")
        self.source_probe(
            NATS_PROBE,
            ["seed", self.nats_stream, self.nats_subject, self.probe_value],
        )
        self.source_probe(
            SEAWEED_PROBE,
            ["seed", self.seaweed_path, self.probe_value],
        )
        openbao = self.workload_record(self.source)
        self.openbao_workload_record_sha256 = str(openbao["record_sha256"])
        return {
            "postgres_artifact_id": str(self.probe_id),
            "jetstream": {"stream": self.nats_stream, "sequence": 1},
            "seaweed_object_sha256": hashlib.sha256(self.probe_value.encode()).hexdigest(),
            "openbao_workload": openbao,
        }

    def cleanup_source_markers(self) -> dict[str, bool]:
        if not self.source_markers_created:
            return {"needed": False}
        keys = self.recovery_material()
        outcomes: dict[str, bool] = {}
        try:
            self.unseal_openbao(self.source, keys)
            outcomes["openbao_unseal"] = True
        except Exception:
            outcomes["openbao_unseal"] = False
        try:
            self.query(f"DELETE FROM artifacts WHERE id='{self.probe_id}'::uuid;")
            outcomes["postgres"] = True
        except Exception:
            outcomes["postgres"] = False
        try:
            self.wait_probe(
                NATS_PROBE,
                ["delete", self.nats_stream, self.nats_subject, self.probe_value],
                isolated=False,
            )
            outcomes["nats"] = True
        except Exception:
            outcomes["nats"] = False
        try:
            self.wait_probe(
                SEAWEED_PROBE,
                ["delete", self.seaweed_path, self.probe_value],
                isolated=False,
            )
            outcomes["seaweed"] = True
        except Exception:
            outcomes["seaweed"] = False
        self.source_markers_created = not all(outcomes.values())
        if not all(outcomes.values()):
            raise RuntimeError("nettoyage incomplet des marqueurs source")
        return outcomes

    def raw_volume_size(self) -> dict[str, int]:
        result = self.run(
            self.source_ops + [
                "run", "--rm", "-T", "--entrypoint", "/bin/sh", "volume-restore",
                "-ec", "du -sk /restore/postgres /restore/nats /restore/seaweed /restore/openbao",
            ]
        )
        sizes: dict[str, int] = {}
        for line in result.stdout.splitlines():
            kib, path = line.split(maxsplit=1)
            sizes[Path(path).name] = int(kib) * 1024
        if set(sizes) != {"postgres", "nats", "seaweed", "openbao"}:
            raise RuntimeError("inventaire des volumes incomplet")
        if sum(sizes.values()) >= FREE_TIER_GUARD_BYTES:
            raise RuntimeError("volumes trop grands pour la garde gratuite B2 de 9 Gio")
        return sizes

    def backup(self) -> dict[str, object]:
        before = {str(row["id"]) for row in self.snapshots()}
        env = dict(
            os.environ,
            NEVOLIUM_COMPOSE_ENV_FILE=str(self.env_file),
            NEVOLIUM_RESTIC_ENV_FILE=str(self.restic_env_file),
            NEVOLIUM_COMPOSE_OVERLAYS=(
                "compose.production.yaml:compose.web-mcp.yaml:compose.web-mcp.production.yaml"
            ),
        )
        self.run(["bash", "scripts/ops/backup.sh"], env=env, timeout=1800)
        keys = self.recovery_material()
        self.unseal_openbao(self.source, keys)
        after = self.snapshots()
        new_primary = [row for row in after if str(row["id"]) not in before]
        if len(new_primary) != 1:
            raise RuntimeError("le backup doit creer exactement un snapshot principal")
        primary = str(new_primary[0]["id"])

        before_recovery = {str(row["id"]) for row in after}
        with tempfile.TemporaryDirectory(
            prefix="nevolium-d04-recovery.", dir="/run"
        ) as directory:
            os.chmod(directory, 0o700)
            sanitized = Path(directory) / "openbao-recovery.json"
            self.atomic_private_write(
                sanitized,
                json.dumps(
                    {"unseal_keys_b64": keys, "unseal_threshold": 2},
                    separators=(",", ":"),
                )
                + "\n",
            )
            self.run(
                self.source_ops + [
                    "run", "--rm", "-T", "-v",
                    f"{sanitized}:/recovery/openbao-recovery.json:ro",
                    "restic", "backup", "/recovery/openbao-recovery.json",
                    "--tag", "nevolium", "--tag", "d04-openbao-recovery-material",
                ],
                timeout=600,
            )
        final = self.snapshots()
        recovery = [row for row in final if str(row["id"]) not in before_recovery]
        if len(recovery) != 1:
            raise RuntimeError("le backup doit creer exactement un snapshot de recuperation OpenBao")
        return {"data_snapshot": primary, "openbao_recovery_snapshot": str(recovery[0]["id"])}

    def full_check(self) -> dict[str, object]:
        self.restic(["check", "--read-data"], timeout=1800)
        stats = json.loads(self.restic(["stats", "--mode", "raw-data", "--json"]).stdout)
        size = int(stats.get("total_size") or 0)
        if size <= 0 or size >= FREE_TIER_GUARD_BYTES:
            raise RuntimeError("taille Restic absente ou hors garde gratuite de 9 Gio")
        return {"all_packs_read": True, "raw_data_bytes": size, "snapshot_count": len(self.snapshots())}

    def restore(self, snapshots: dict[str, object]) -> dict[str, object]:
        expected_project = f"nevolium-d04-restore-{self.probe_id.hex[:10]}"
        if self.isolated_project != expected_project:
            raise RuntimeError("projet de restauration isole invalide")
        collision = self.run([
            "docker", "ps", "-aq", "--filter",
            f"label=com.docker.compose.project={self.isolated_project}",
        ]).stdout.strip()
        if collision:
            raise RuntimeError("collision avec le projet de restauration isole")
        self.restic(["check", "--read-data"], isolated=True, timeout=1800)
        env = dict(
            os.environ,
            COMPOSE_PROJECT_NAME=self.isolated_project,
            NEVOLIUM_COMPOSE_ENV_FILE=str(self.env_file),
            NEVOLIUM_RESTIC_ENV_FILE=str(self.restic_env_file),
            NEVOLIUM_COMPOSE_OVERLAYS="compose.production.yaml",
            NEVOLIUM_CONFIRM_RESTORE="YES",
        )
        self.run(
            ["bash", "scripts/ops/restore.sh", str(snapshots["data_snapshot"])],
            env=env,
            timeout=1800,
        )
        recovery_target = self.root / ".nevolium-backup-staging" / "recovery-material"
        if recovery_target.exists():
            shutil.rmtree(recovery_target)
        self.restic(
            [
                "restore", str(snapshots["openbao_recovery_snapshot"]),
                "--target", "/staging/recovery-material",
                "--include", "/recovery/openbao-recovery.json",
            ],
            isolated=True,
            timeout=600,
        )
        restored_recovery = recovery_target / "recovery" / "openbao-recovery.json"
        if not restored_recovery.is_file():
            raise RuntimeError("materiel OpenBao absent du depot chiffre")

        self.run(self.isolated + ["up", "-d", "postgres", "nats", "seaweedfs", "openbao"], timeout=300)
        self.isolated_started = True
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            try:
                if self.query("SELECT 1;", isolated=True) == "1":
                    break
            except Exception:
                pass
            time.sleep(2)
        else:
            raise RuntimeError("PostgreSQL restaure non pret")

        keys = self.recovery_material(restored_recovery)
        self.unseal_openbao(self.isolated, keys)

        sql_value = self.query(
            f"SELECT content->>'value' FROM artifacts WHERE id='{self.probe_id}'::uuid;",
            isolated=True,
        )
        if sql_value != self.probe_value:
            raise RuntimeError("marqueur PostgreSQL restaure invalide")
        self.wait_probe(
            NATS_PROBE,
            ["read", self.nats_stream, self.nats_subject, self.probe_value],
            isolated=True,
        )
        seaweed_digest = self.wait_probe(
            SEAWEED_PROBE,
            ["read", self.seaweed_path, self.probe_value],
            isolated=True,
        ).splitlines()[-1]
        expected_digest = hashlib.sha256(self.probe_value.encode()).hexdigest()
        if seaweed_digest != expected_digest:
            raise RuntimeError("objet SeaweedFS restaure invalide")
        openbao = self.workload_record(self.isolated)
        if openbao["record_sha256"] != self.openbao_workload_record_sha256:
            raise RuntimeError("enregistrement workload OpenBao restaure invalide")
        shutil.rmtree(recovery_target)
        return {
            "fresh_volumes": True,
            "postgres_artifact": True,
            "jetstream_sequence_1": True,
            "seaweed_original_bytes_sha256": expected_digest,
            "openbao_unsealed_from_encrypted_recovery_material": True,
            "openbao_workload_record_restored": True,
        }

    def cleanup_isolated(self, *, success: bool) -> None:
        recovery_target = self.root / ".nevolium-backup-staging" / "recovery-material"
        if recovery_target.exists():
            shutil.rmtree(recovery_target)
        if not self.isolated:
            return
        if success:
            self.run(
                self.isolated + ["--profile", "*", "down", "-v", "--remove-orphans"],
                allowed=(0, 1),
                timeout=300,
            )
        elif self.isolated_started:
            self.run(self.isolated + ["stop"], allowed=(0, 1), timeout=180)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", type=Path, default=Path("/opt/nevolium/source"))
    parser.add_argument("--env-file", type=Path, default=Path("/etc/nevolium/production.env"))
    parser.add_argument("--restic-env-file", type=Path, default=Path("/etc/nevolium/restic.env"))
    parser.add_argument(
        "--openbao-recovery-file",
        type=Path,
        default=Path("/run/nevolium/openbao-recovery.json"),
    )
    parser.add_argument(
        "--report-dir", type=Path, default=Path("/var/lib/nevolium/qualification")
    )
    args = parser.parse_args()
    runner = Runner(args)
    evidence: Evidence | None = None
    success = False
    counts_before = ""
    try:
        evidence = runner.prepare()
        active = runner.active_work()
        if active != "0|0|0|0":
            raise RuntimeError(f"travaux ou outbox actifs : {active}")
        counts_before = runner.counts()
        evidence.data["counts_before"] = counts_before
        evidence.save()
        runner.emit("preflight_ok", counts=counts_before, active=active)
        evidence.case("b2-restic-repository", 120, runner.initialize_repository)
        evidence.case("free-tier-source-size", 180, runner.raw_volume_size)
        evidence.data["markers"] = evidence.case(
            "seed-source-recovery-evidence", 180, runner.seed_markers
        )
        evidence.save()
        snapshots = evidence.case("quiesced-encrypted-off-host-backup", 1800, runner.backup)
        evidence.data["snapshots"] = snapshots
        evidence.save()
        evidence.case("remove-disposable-source-markers", 180, runner.cleanup_source_markers)
        if runner.counts() != counts_before or runner.active_work() != "0|0|0|0":
            raise RuntimeError("etat canonique source modifie apres nettoyage")
        evidence.case("off-host-full-pack-check", 1800, runner.full_check)
        readback = evidence.case("fresh-isolated-four-store-restore", 2400, lambda: runner.restore(snapshots))
        evidence.data["readback"] = readback
        runner.cleanup_isolated(success=True)
        runner.isolated_started = False
        if runner.counts() != counts_before or runner.active_work() != "0|0|0|0":
            raise RuntimeError("production modifiee par la restauration isolee")
        evidence.data.update(
            counts_after=runner.counts(),
            source_unchanged=True,
            isolated_environment_removed=True,
            d04_gate="passed",
        )
        evidence.finish()
        success = True
        runner.emit(
            "qualification_passed",
            report=str(evidence.output),
            restic_environment=str(runner.restic_env_file),
        )
    except (CommandFailure, KeyError, OSError, RuntimeError, ValueError, json.JSONDecodeError) as exc:
        if evidence:
            evidence.data["failure_class"] = type(exc).__name__
            evidence.data["d04_gate"] = "incomplete"
            evidence.save()
        runner.emit(
            "qualification_stopped",
            error_class=type(exc).__name__,
            detail=runner.scrub(str(exc))[:700],
            report=str(evidence.output) if evidence else "not-created",
            private_log=str(runner.private_log) if runner.private_log else "not-created",
        )
        raise SystemExit(1) from None
    finally:
        if runner.source_markers_created:
            try:
                runner.cleanup_source_markers()
            except Exception:
                runner.emit("source_marker_cleanup_requires_inspection")
        try:
            runner.cleanup_isolated(success=success)
        except Exception:
            runner.emit("isolated_cleanup_requires_inspection")


if __name__ == "__main__":
    main()
