"""Static and unit contracts for the private-target recovery runner."""

import argparse
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

from common import Evidence
from target_recovery import FREE_TIER_GUARD_BYTES, Runner


class Contract(unittest.TestCase):
    def runner(self, root: Path) -> Runner:
        return Runner(argparse.Namespace(
            project_root=root,
            env_file=root / "production.env",
            restic_env_file=root / "restic.env",
            openbao_recovery_file=root / "openbao-recovery.json",
            report_dir=root / "reports",
        ))

    def test_existing_b2_configuration_is_validated_and_scrubbed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "restic.env"
            values = {
                "RESTIC_REPOSITORY": (
                    "s3:https://s3.eu-central-003.backblazeb2.com/"
                    "nevolium-contract/nevolium-production"
                ),
                "RESTIC_PASSWORD": "a" * 32,
                "RESTIC_AWS_ACCESS_KEY_ID": "b" * 24,
                "RESTIC_AWS_SECRET_ACCESS_KEY": "c" * 32,
                "RESTIC_AWS_DEFAULT_REGION": "eu-central-003",
            }
            path.write_text("\n".join(f"{key}={value}" for key, value in values.items()) + "\n")
            path.chmod(0o600)
            runner = self.runner(root)
            with mock.patch.object(Runner, "private_file"):
                self.assertEqual(runner.configure_restic(), values)
            leaked = " ".join(values.values())
            scrubbed = runner.scrub(leaked)
            self.assertNotIn(values["RESTIC_PASSWORD"], scrubbed)
            self.assertNotIn(values["RESTIC_AWS_SECRET_ACCESS_KEY"], scrubbed)
            self.assertNotIn("nevolium-contract", scrubbed)

    def test_non_b2_repository_and_duplicate_variables_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "restic.env"
            path.write_text(
                "RESTIC_REPOSITORY=/tmp/not-off-host\n"
                "RESTIC_REPOSITORY=/tmp/duplicate\n"
            )
            path.chmod(0o600)
            with self.assertRaises(RuntimeError):
                self.runner(root).configure_restic()

    def test_free_guard_leaves_headroom_below_backblaze_quota(self):
        self.assertEqual(FREE_TIER_GUARD_BYTES, 9 * 1024**3)
        self.assertLess(FREE_TIER_GUARD_BYTES, 10_000_000_000)

    def test_recovery_material_uses_only_three_unseal_shares(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            runner = self.runner(root)
            keys = ["share-one", "share-two", "share-three"]
            revoked_root = "revoked-root-token"
            runner.openbao_recovery_file.write_text(json.dumps({
                "unseal_keys_b64": keys,
                "unseal_threshold": 2,
                "root_token": revoked_root,
            }))
            self.assertEqual(runner.recovery_material(), keys)
            self.assertEqual(runner.scrub(" ".join([*keys, revoked_root])), (
                "[REDACTED] [REDACTED] [REDACTED] [REDACTED]"
            ))

    def test_recovery_material_rejects_wrong_share_layout(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            runner = self.runner(root)
            for payload in (
                {"unseal_keys_b64": ["one", "two"], "unseal_threshold": 2},
                {"unseal_keys_b64": ["one", "two", "three"], "unseal_threshold": 1},
            ):
                runner.openbao_recovery_file.write_text(json.dumps(payload))
                with self.assertRaises(RuntimeError):
                    runner.recovery_material()

    def test_workload_fingerprint_ignores_only_dynamic_ttl(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            runner = self.runner(root)
            runner.env_file.write_text("OPENBAO_TOKEN=s." + "a" * 24 + "\n")

            def lookup(ttl: int):
                return mock.Mock(stdout=json.dumps({"data": {
                    "accessor": "stable-accessor",
                    "creation_time": 1_700_000_000,
                    "creation_ttl": 604800,
                    "display_name": "nevolium-core",
                    "entity_id": "",
                    "explicit_max_ttl": 0,
                    "issue_time": "2026-09-12T00:00:00Z",
                    "meta": None,
                    "num_uses": 0,
                    "orphan": True,
                    "path": "auth/token/create",
                    "period": 604800,
                    "policies": ["nevolium-core"],
                    "renewable": True,
                    "ttl": ttl,
                    "type": "service",
                }}))

            with mock.patch.object(
                Runner, "bao_as", side_effect=(lookup(500000), lookup(499000))
            ):
                source = runner.workload_record(["source"])
                restored = runner.workload_record(["isolated"])
            self.assertEqual(source["record_sha256"], restored["record_sha256"])
            self.assertEqual(source["period_seconds"], 604800)

    def test_evidence_case_returns_details_without_changing_gate(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "evidence.json"
            evidence = Evidence("contract", output)
            details = evidence.case("return-details", 1, lambda: {"passed": True})
            self.assertEqual(details, {"passed": True})
            self.assertEqual(evidence.data["d04_gate"], "incomplete")

    def test_ops_scripts_accept_separate_restic_env_and_multiple_overlays(self):
        root = Path(__file__).resolve().parents[2]
        for name in ("backup.sh", "restore.sh"):
            text = (root / "scripts" / "ops" / name).read_text()
            self.assertIn("NEVOLIUM_RESTIC_ENV_FILE", text)
            self.assertIn("NEVOLIUM_COMPOSE_OVERLAYS", text)
            self.assertIn("IFS=: read -r -a OVERLAY_FILES", text)
        runner = (root / "scripts" / "qualification" / "target_recovery.py").read_text()
        self.assertIn('"docker", "run", "--rm"', runner)
        self.assertIn('f"{self.isolated_project}_canonical"', runner)
        self.assertIn('self.recovery_probe_image', runner)
        self.assertIn('"--read-only"', runner)
        self.assertIn('"--cap-drop", "ALL"', runner)
        self.assertNotIn("NEVOLIUM_RECOVERY_PROBE_IMAGE", runner)
        self.assertIn('default=Path("/run/nevolium/openbao-recovery.json")', runner)
        self.assertIn('self.workload_record(self.isolated)', runner)
        self.assertIn('"openbao_workload_record_restored": True', runner)
        self.assertIn('{"unseal_keys_b64": keys, "unseal_threshold": 2}', runner)
        self.assertNotIn('["write", "-format=json", self.openbao_path', runner)


if __name__ == "__main__":
    os.umask(0o077)
    unittest.main()
