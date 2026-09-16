"""Read-only inventory boundaries; these fixtures are not a server deployment proof."""
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("preflight", ROOT / "scripts/ops/d09_pilot_preflight.py")
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)


class PreflightContract(unittest.TestCase):
    def test_command_failure_withholds_secrets(self):
        failure = SimpleNamespace(returncode=1, stdout="PROVIDER_SECRET", stderr="DATABASE_PASSWORD")
        with patch.object(preflight.subprocess, "run", return_value=failure):
            with self.assertRaises(preflight.InventoryError) as error:
                preflight.run("database-read-only", ["fixture"])
        self.assertEqual(str(error.exception), "database-read-only")
        self.assertNotIn(".Config.Env", preflight.INSPECT)
        self.assertNotIn(".State.Error", preflight.INSPECT)
        self.assertNotIn(".State.Health", preflight.INSPECT)
        self.assertIn(".State.Health", preflight.INSPECT_HEALTH)

    def test_docker_29_health_is_queried_outside_the_json_record(self):
        commands = []
        base = {
            "id": "core",
            "image_id": "sha256:image",
            "service": "nevolium-core",
            "project": "pilot",
            "working_dir": "/opt/nevolium/source",
            "config_files": "compose.yaml",
            "status": "running",
            "health": None,
            "mounts": [{
                "Type": "bind", "Name": "", "Source": "/safe/source",
                "Destination": "/app/config", "RW": False, "Driver": "ignored",
            }],
        }

        postgres = {**base, "id": "pg", "service": "postgres"}

        def fake(stage, command, accepted=(0,)):
            commands.append((stage, command))
            values = [base, postgres] if stage == "docker-inspect" else [None, "healthy"]
            output = "\n".join(json.dumps(value) for value in values)
            return SimpleNamespace(returncode=0, stdout=output + "\n")

        with patch.object(preflight, "run", side_effect=fake):
            result = preflight.inspect(["docker"], ["core", "pg"])

        self.assertEqual(
            [stage for stage, _ in commands], ["docker-inspect", "docker-health"]
        )
        first_format = commands[0][1][commands[0][1].index("--format") + 1]
        second_format = commands[1][1][commands[1][1].index("--format") + 1]
        self.assertNotIn(".State.Health", first_format)
        self.assertEqual(second_format, preflight.INSPECT_HEALTH)
        self.assertIsNone(result[0]["health"])
        self.assertEqual(result[1]["health"], "healthy")
        self.assertEqual(result[0]["mounts"], [{
            "Type": "bind", "Name": "", "Source": "/safe/source",
            "Destination": "/app/config", "RW": False,
        }])

    def test_ambiguous_running_core_stops_before_database(self):
        commands = []

        def fake(stage, command, accepted=(0,)):
            commands.append(command)
            outputs = {"git-head": "a" * 40, "git-status": "", "core-discovery": "one\ntwo\n"}
            return SimpleNamespace(returncode=0, stdout=outputs.get(stage, ""))

        with patch.object(preflight, "run", side_effect=fake):
            with self.assertRaisesRegex(preflight.InventoryError, "expected-one-running-core"):
                preflight.collect(ROOT, "b" * 40, ["docker"], {})
        self.assertFalse(any("exec" in command for command in commands))

    def test_inventory_preserves_unknowns_and_historical_obligations(self):
        commands = []
        core = {"id": "core", "service": "nevolium-core", "project": "pilot", "status": "running", "health": None, "mounts": []}
        pg = {"id": "pg", "service": "postgres", "project": "pilot", "status": "running", "health": "healthy", "mounts": []}
        database = {"schema": "0015_model_configurations", "uncertain_model_reservations": 5}

        def fake(stage, command, accepted=(0,)):
            commands.append(command)
            outputs = {"git-head": "a" * 40, "git-status": " M private.env\n", "core-discovery": "core\n",
                       "project-discovery": "core\npg\n", "database-read-only": json.dumps(database)}
            return SimpleNamespace(returncode=0, stdout=outputs.get(stage, ""))

        report = {"status": "needs_review", "activation_performed": False}
        with patch.object(preflight, "run", side_effect=fake), patch.object(preflight, "inspect", side_effect=[[core], [core, pg]]):
            preflight.collect(ROOT, "b" * 40, ["docker"], report)
        self.assertTrue(report["source"]["dirty"])
        self.assertNotIn("private.env", json.dumps(report))
        self.assertIsNone(report["containers"][0]["health"])
        self.assertEqual(report["database"]["uncertain_model_reservations"], 5)
        self.assertEqual(report["status"], "needs_review")
        self.assertFalse(report["activation_performed"])
        docker = [command for command in commands if command[0] == "docker"]
        self.assertEqual([command[1] for command in docker], ["ps", "ps", "exec"])
        self.assertIn("BEGIN READ ONLY", docker[-1][-1])
        self.assertIn("ROLLBACK", docker[-1][-1])
        self.assertIn("statement_timeout = '5s'", docker[-1][-1])
        self.assertNotIn("UPDATE ", docker[-1][-1])


if __name__ == "__main__":
    unittest.main()
