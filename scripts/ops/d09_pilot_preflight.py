#!/usr/bin/env python3
"""Read-only operator inventory before installing D09 on the existing pilot.

No checkout, Compose activation, backup, migration or provider call. Docker output
is explicitly restricted; neither container environments nor command errors are printed.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import subprocess


TARGET_SCHEMA = "0018_editable_knowledge"
SHA = re.compile(r"[0-9a-f]{40}")
INSPECT = "{" + ",".join([
    '"id":{{json .Id}}', '"image_id":{{json .Image}}',
    '"service":{{json (index .Config.Labels "com.docker.compose.service")}}',
    '"project":{{json (index .Config.Labels "com.docker.compose.project")}}',
    '"working_dir":{{json (index .Config.Labels "com.docker.compose.project.working_dir")}}',
    '"config_files":{{json (index .Config.Labels "com.docker.compose.project.config_files")}}',
    '"status":{{json .State.Status}}',
    '"health":null',
    '"mounts":{{json .Mounts}}',
]) + "}"
INSPECT_HEALTH = '{{if .State.Health}}{{json .State.Health.Status}}{{else}}null{{end}}'
SQL = """
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';
SELECT json_build_object(
  'schema', (SELECT version_num FROM alembic_version),
  'projects', (SELECT count(*) FROM projects),
  'tasks', (SELECT count(*) FROM tasks),
  'documents', (SELECT count(*) FROM documents),
  'queued_or_running_tasks', (SELECT count(*) FROM tasks WHERE status IN ('queued','running')),
  'nonterminal_workflows', (SELECT count(*) FROM workflow_executions
    WHERE status NOT IN ('completed','failed','cancelled')),
  'unpublished_outbox', (SELECT count(*) FROM outbox_events WHERE published_at IS NULL),
  'live_model_reservations', (SELECT count(*) FROM model_reservations
    WHERE status = 'started' OR (status = 'reserved' AND expires_at > now())),
  'uncertain_model_reservations', (SELECT count(*) FROM model_reservations WHERE status = 'uncertain'),
  'active_model_configurations', (SELECT count(*) FROM model_configurations WHERE status = 'active')
);
ROLLBACK;
"""


class InventoryError(Exception):
    """Contains only a fixed stage identifier, never command output."""


def run(stage, command, accepted=(0,)):
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        raise InventoryError(stage) from None
    if result.returncode not in accepted:
        raise InventoryError(stage)
    return result


def inspect(docker, ids):
    # Docker 29.8 accepts the bounded health expression by itself but rejects it
    # when embedded in the larger JSON template. Keep both reads whitelisted and
    # merge them locally; never fall back to a raw inspect containing Config.Env.
    base_command = [*docker, "inspect", "--type", "container", "--format"]
    result = run("docker-inspect", [*base_command, INSPECT, *ids])
    health = run("docker-health", [*base_command, INSPECT_HEALTH, *ids])
    try:
        containers = [json.loads(line) for line in result.stdout.splitlines() if line]
        health_values = [json.loads(line) for line in health.stdout.splitlines() if line]
        if len(containers) != len(ids) or len(health_values) != len(containers):
            raise ValueError
        for item, health_value in zip(containers, health_values, strict=True):
            if health_value is not None and not isinstance(health_value, str):
                raise ValueError
            item["health"] = health_value
            item["mounts"] = [
                {
                    key: mount.get(key)
                    for key in ("Type", "Name", "Source", "Destination", "RW")
                }
                for mount in item["mounts"]
            ]
        return containers
    except (KeyError, TypeError, ValueError):
        raise InventoryError("docker-format") from None


def collect(source, target, docker, report):
    git = ["git", "-C", str(source)]
    head = run("git-head", [*git, "rev-parse", "HEAD"]).stdout.strip()
    if not SHA.fullmatch(head):
        raise InventoryError("git-head-format")
    run("target-missing", [*git, "cat-file", "-e", target + "^{commit}"])
    dirty = bool(run("git-status", [*git, "status", "--porcelain"]).stdout.strip())
    ancestor = run("git-ancestry", [*git, "merge-base", "--is-ancestor", head, target], (0, 1))
    report["source"] = {"path": str(source), "checkout": head, "dirty": dirty,
                        "target": target, "target_contains_checkout": ancestor.returncode == 0}
    current = source.parent / "current"
    report["release_layout"] = {"current_is_symlink": current.is_symlink(),
                                "current_target": str(current.resolve()) if current.is_symlink() else None,
                                "releases_directory_exists": (source.parent / "releases").is_dir(),
                                "free_bytes": shutil.disk_usage(source).free}
    core_ids = run("core-discovery", [*docker, "ps", "-q", "--filter",
                   "label=com.docker.compose.service=nevolium-core"]).stdout.split()
    if len(core_ids) != 1:
        raise InventoryError("expected-one-running-core")
    core = inspect(docker, core_ids)[0]
    project = core.get("project")
    if not project:
        raise InventoryError("compose-project-missing")
    ids = run("project-discovery", [*docker, "ps", "-a", "-q", "--filter",
              "label=com.docker.compose.project=" + project]).stdout.split()
    if not ids:
        raise InventoryError("compose-project-empty")
    containers = inspect(docker, ids)
    if any(item.get("project") != project for item in containers):
        raise InventoryError("compose-project-mismatch")
    report["compose_project"] = project
    report["containers"] = containers
    postgres = [item for item in containers if item.get("service") == "postgres" and item.get("status") == "running"]
    if len(postgres) != 1:
        raise InventoryError("expected-one-running-postgres")
    # The username stays inside PostgreSQL's container; no env file or secret is read back.
    command = [*docker, "exec", postgres[0]["id"], "sh", "-c",
               'exec psql -X -U "$POSTGRES_USER" -d nevolium -v ON_ERROR_STOP=1 -Atq "$@"',
               "d09-read-only", "-c", SQL]
    result = run("database-read-only", command)
    try:
        report["database"] = json.loads(result.stdout)
    except ValueError:
        raise InventoryError("database-format") from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--target", required=True)
    args = parser.parse_args()
    if not SHA.fullmatch(args.target):
        parser.error("--target must be a full lowercase commit SHA")
    report = {"schema": 1, "lot": "D09", "mode": "read-only",
              "at": datetime.now(timezone.utc).isoformat(), "status": "needs_review",
              "target_schema": TARGET_SCHEMA, "activation_performed": False}
    docker = ["docker"] if os.geteuid() == 0 else ["sudo", "-n", "docker"]
    try:
        collect(args.source.resolve(), args.target, docker, report)
    except InventoryError as error:
        report.update(status="inventory_failed", failed_stage=str(error))
    except Exception:
        # Filesystem/format errors can contain private paths or third-party diagnostics.
        report.update(status="inventory_failed", failed_stage="local-inventory")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    raise SystemExit(1 if report["status"] == "inventory_failed" else 0)


if __name__ == "__main__":
    main()
