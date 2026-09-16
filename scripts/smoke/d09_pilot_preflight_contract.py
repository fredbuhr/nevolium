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
