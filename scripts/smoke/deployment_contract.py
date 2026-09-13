"""Production settings/JWT/ops/model inventory and effective Compose rejection proofs."""
import asyncio
import copy
import importlib.util
import json
from pathlib import Path
from decimal import Decimal
from types import SimpleNamespace
import uuid
import secrets
import subprocess
import tempfile
import time
import unittest
from unittest.mock import AsyncMock, patch

import jwt
import yaml
from fastapi import HTTPException
from cryptography.hazmat.primitives.asymmetric import rsa
from pydantic import ValidationError

from nevolium_core import assistant, auth, research, security
from nevolium_core.config import Settings as CoreSettings
from nevolium_worker.config import Settings as WorkerSettings
from nevolium_worker.model_assets import inventory, verify_manifest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('production_check', ROOT / 'scripts/ops/production.py')
production = importlib.util.module_from_spec(spec)
spec.loader.exec_module(production)
bootstrap_spec = importlib.util.spec_from_file_location(
    'bootstrap_openbao_check', ROOT / 'scripts/ops/bootstrap_openbao.py'
)
bootstrap_openbao = importlib.util.module_from_spec(bootstrap_spec)
bootstrap_spec.loader.exec_module(bootstrap_openbao)


def core_values():
    return dict(nevolium_env='production', nevolium_auth_enabled=True,
                nevolium_internal_token='a'*64, nevolium_policy_signing_key='b'*64,
                openbao_token='s.'+('c'*24), nevolium_operations_token='d'*64,
                database_url='postgresql+asyncpg://nevolium_app:'+('e'*64)+'@postgres/nevolium',
                keycloak_issuer='https://auth.example.org/realms/nevolium',
                nevolium_cors_origins='https://nevolium.example.org')


class Deployment(unittest.TestCase):
    def test_api_routing_and_isolated_local_fixture(self):
        for relative_path in (
            "infrastructure/litellm/config.yaml",
            "infrastructure/litellm/config.observability.yaml",
        ):
            with self.subTest(config=relative_path):
                document = yaml.safe_load((ROOT / relative_path).read_text(encoding="utf-8"))
                routes = {item["model_name"]: item for item in document["model_list"]}
                self.assertNotIn("local-fast", routes)
                self.assertEqual(routes["smart"]["litellm_params"], {
                    "model": "os.environ/NEVOLIUM_API_MODEL",
                    "api_key": "os.environ/NEVOLIUM_API_KEY",
                })
                self.assertNotIn("model_info", routes["smart"])
                self.assertEqual(document["router_settings"]["num_retries"], 0)
        fixture = yaml.safe_load((ROOT / "infrastructure/litellm/config.local-qualification.yaml").read_text())
        self.assertEqual(len(fixture["model_list"]), 1)
        local = fixture["model_list"][0]
        self.assertEqual(local["model_name"], "local-fast")
        self.assertEqual(local["litellm_params"]["api_base"], "http://ollama:11434")
        self.assertEqual(local["model_info"]["input_cost_per_token"], 0)
        self.assertEqual(local["model_info"]["output_cost_per_token"], 0)

    def test_provider_configuration_rejects_local_or_missing_credentials(self):
        services = {"litellm": {"environment": {
            "NEVOLIUM_API_MODEL": "openai/gpt-4.1", "NEVOLIUM_API_KEY": "fixture-key",
        }}}
        self.assertEqual(production.validate_model_routes(services), [])
        # Provider selection changes the model and credential together, without a new alias.
        for provider in ("openai", "anthropic", "xai", "moonshot"):
            candidate = copy.deepcopy(services)
            candidate["litellm"]["environment"]["NEVOLIUM_API_MODEL"] = provider + "/fixture-model"
            self.assertEqual(production.validate_model_routes(candidate), [])
        for invalid in ("", "CHANGE_ME_KEY", None):
            candidate = copy.deepcopy(services)
            candidate["litellm"]["environment"]["NEVOLIUM_API_KEY"] = invalid
            self.assertTrue(production.validate_model_routes(candidate))
        for invalid in ("ollama/qwen3:4b", "gpt-4.1", "openai/", "openai/model with space"):
            candidate = copy.deepcopy(services)
            candidate["litellm"]["environment"]["NEVOLIUM_API_MODEL"] = invalid
            self.assertTrue(production.validate_model_routes(candidate))
        for alias in ("local-fast", "unknown", ""):
            candidate = copy.deepcopy(services)
            candidate["nevolium-core"] = {"environment": {"NEVOLIUM_RESEARCH_MODEL": alias}}
            self.assertTrue(production.validate_model_routes(candidate))
        for local_service in ("ollama", "vllm"):
            self.assertTrue(production.validate_model_routes({**services, local_service: {}}))
        candidate = copy.deepcopy(services)
        candidate["nevolium-core"] = {"environment": {"NEVOLIUM_RESEARCH_MODEL": "alternative"}}
        self.assertTrue(production.validate_model_routes(candidate))
        candidate["litellm"]["environment"]["ANTHROPIC_API_KEY"] = "fixture-alternative-key"
        self.assertEqual(production.validate_model_routes(candidate), [])

    def test_openbao_accessor_output_shapes(self):
        accessors = ["abc123", "def456"]
        self.assertEqual(bootstrap_openbao.accessor_keys(accessors), accessors)
        self.assertEqual(
            bootstrap_openbao.accessor_keys({"data": {"keys": accessors}}),
            accessors,
        )
        for invalid in (None, {}, {"data": {"keys": "abc123"}}, [""]):
            with self.subTest(invalid=invalid), self.assertRaises(RuntimeError):
                bootstrap_openbao.accessor_keys(invalid)

    def test_settings_fail_closed(self):
        CoreSettings(_env_file=None, **core_values())
        for change in [dict(nevolium_env='prod'), dict(nevolium_auth_enabled=False),
                       dict(nevolium_internal_token='CHANGE_ME_LONG_RANDOM_INTERNAL_TOKEN'),
                       dict(nevolium_policy_signing_key='a'*64), dict(nevolium_cors_origins='*'),
                       dict(openbao_token='c'*64),
                       dict(keycloak_issuer='http://auth.example.org/realms/nevolium'),
                       dict(database_url='postgresql+asyncpg://postgres:secret@db/nevolium')]:
            with self.subTest(change=list(change)), self.assertRaises(ValidationError):
                CoreSettings(_env_file=None, **{**core_values(), **change})
        values = dict(nevolium_env='production', nevolium_internal_token='a'*64,
                      litellm_master_key='b'*64, mem0_database_url='postgresql://mem0_app:'+('c'*64)+'@postgres/mem0',
                      nevolium_memory_projector_mode='real')
        WorkerSettings(**values)
        self.assertEqual(
            CoreSettings(_env_file=None, **core_values()).nevolium_research_model,
            'smart',
        )
        for invalid_alias in ('openai/gpt-5.6', '', 'unknown'):
            with self.subTest(core_model_alias=invalid_alias), self.assertRaises(ValidationError):
                CoreSettings(
                    _env_file=None,
                    **{**core_values(), 'nevolium_research_model': invalid_alias},
                )
            with self.subTest(worker_model_alias=invalid_alias), self.assertRaises(ValidationError):
                WorkerSettings(**{**values, 'nevolium_semantic_router_model': invalid_alias})
        for change in [dict(nevolium_env='prod'),dict(nevolium_memory_projector_mode='auto'),dict(nevolium_memory_projector_mode='stub'),dict(mem0_database_url=''),dict(nevolium_internal_token='development-only-change-me')]:
            with self.subTest(change=list(change)), self.assertRaises(ValidationError):
                WorkerSettings(**{**values,**change})

    def test_signed_access_tokens(self):
        key = rsa.generate_private_key(public_exponent=65537,key_size=2048)
        base = dict(sub='owner-1',iss=auth.settings.keycloak_issuer,aud=auth.settings.keycloak_audience,
                    azp=auth.settings.keycloak_client_id,typ='Bearer',iat=int(time.time()),exp=int(time.time())+300,
                    realm_access={'roles':['nevolium-user']})
        with patch.object(auth._jwks_client,'get_signing_key_from_jwt',return_value=type('Key',(),{'key':key.public_key()})()):
            def decode(values): return auth._decode_token(jwt.encode(values,key,algorithm='RS256'))
            self.assertEqual(decode(base).subject,'owner-1')
            for claim in ('aud','azp','typ','sub','iss','exp','iat'):
                values={k:v for k,v in base.items() if k!=claim}
                with self.subTest(missing=claim), self.assertRaises(jwt.PyJWTError): decode(values)
            for change in [dict(aud='elsewhere'),dict(azp='elsewhere'),dict(typ='ID'),dict(sub=''),dict(exp=1),dict(realm_access=[]),dict(realm_access={'roles':'nevolium-admin'})]:
                with self.subTest(change=change), self.assertRaises(jwt.PyJWTError): decode({**base,**change})

    def test_worker_cannot_use_operations_token(self):
        with patch.object(security,'settings',CoreSettings(_env_file=None,**core_values())):
            asyncio.run(security.require_operations_token('d'*64))
            with self.assertRaises(HTTPException): asyncio.run(security.require_operations_token('a'*64))
            with self.assertRaises(HTTPException): asyncio.run(security.require_internal_token('d'*64))
            with self.assertRaises(HTTPException): asyncio.run(security.require_internal_token('é'))

    def test_model_changes_require_review(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'weights').write_bytes(b'bounded fixture, not a real model')
            path=root/'manifest.json';path.write_text(json.dumps(dict(version=1,sources=['fixture revision 1'],files=inventory(root))))
            verify_manifest(path)
            (root/'weights').write_bytes(b'changed')
            with self.assertRaises(ValueError): verify_manifest(path)

    def test_effective_compose(self):
        # Generated throwaway credentials; never start this synthetic production configuration.
        text=(ROOT/'.env.production.example').read_text()
        lines=[]
        for line in text.splitlines():
            if line and not line.startswith('#') and '=' in line:
                key,value=line.split('=',1)
                if 'CHANGE_ME' in value: value=secrets.token_hex(32)
                if key=='OPENBAO_TOKEN': value='s.'+('c'*24)
                if key=='KEYCLOAK_PROXY_TRUSTED_ADDRESSES': value='127.0.0.1/32'
                line=key+'='+value
            lines.append(line)
        with tempfile.NamedTemporaryFile(mode='w',suffix='.env') as env:
            env.write('\n'.join(lines));env.flush()
            base=['docker','compose','--env-file',env.name,'-f','compose.yaml','-f','compose.production.yaml']
            def config(extra):
                result=subprocess.run([*base,*extra,'config','--format','json'],cwd=ROOT,capture_output=True,text=True)
                self.assertEqual(result.returncode,0,'Compose rendering failed; possible credentials withheld')
                return json.loads(result.stdout)
            valid=config([])
            self.assertEqual(production.validate(valid),[])
            with_bootstrap=config(['-f','compose.keycloak-bootstrap.yaml'])
            self.assertEqual(production.validate(with_bootstrap),[])
            self.assertEqual(
                with_bootstrap['services']['keycloak']['environment']['KC_BOOTSTRAP_ADMIN_USERNAME'],
                'nevolium-admin',
            )
            self.assertTrue(
                with_bootstrap['services']['keycloak']['environment']['KC_BOOTSTRAP_ADMIN_PASSWORD']
            )
            self.assertNotIn('nevolium-realtime',valid['services'])
            self.assertNotIn('activepieces',valid['services'])
            self.assertEqual(
                valid['services']['nevolium-core']['environment']['NEVOLIUM_RESEARCH_MODEL'],
                'smart',
            )
            self.assertNotIn(
                'NEVOLIUM_RESEARCH_MODEL', valid['services']['nevolium-worker']['environment']
            )
            self.assertEqual(
                valid['services']['nevolium-worker']['environment'][
                    'NEVOLIUM_SEMANTIC_ROUTER_MODEL'
                ],
                'smart',
            )
            for name in ['postgres','nats','temporal','seaweedfs','openbao']:
                self.assertFalse(valid['services'][name].get('ports'))
            self.assertEqual(
                set(valid['services']['seaweedfs']['networks']),
                {'canonical', 'telemetry', 'assets'},
            )
            self.assertEqual(
                set(valid['services']['nevolium-worker']['networks']),
                {'execution', 'assets', 'memory', 'models', 'search', 'egress'},
            )
            self.assertNotIn(
                'canonical',
                valid['services']['nevolium-worker']['networks'],
            )
            self.assertNotIn(
                'egress',
                valid['services']['seaweedfs']['networks'],
            )
            self.assertIn(
                '-ip.bind=0.0.0.0',
                valid['services']['seaweedfs']['command'],
            )
            self.assertIn(
                '-ip=seaweedfs',
                valid['services']['seaweedfs']['command'],
            )
            with_tools=config(['-f','compose.web-mcp.yaml','-f','compose.web-mcp.production.yaml','--profile','search','--profile','ai'])
            self.assertEqual(production.validate(with_tools),[])
            self.assertEqual(set(with_tools['services']['nevolium-web-mcp']['networks']),{'search','egress'})
            self.assertNotIn('NEVOLIUM_INTERNAL_TOKEN',with_tools['services']['nevolium-web-mcp']['environment'])
            self.assertEqual(
                with_tools['services']['nevolium-web-mcp']['tmpfs'],
                ['/tmp:size=67108864,mode=1777'],
            )
            bad_tmpfs = copy.deepcopy(with_tools)
            bad_tmpfs['services']['nevolium-web-mcp']['tmpfs'] = [
                '/tmp:size=67108864',
                'mode=1777',
            ]
            self.assertTrue(production.validate(bad_tmpfs), 'invalid tmpfs target')
            bad=config(['-f','compose.test-noauth.yaml'])
            self.assertTrue(production.validate(bad))
            self.assertNotIn('ollama', with_tools['services'])
            for service in ('nevolium-core', 'nevolium-worker', 'nevolium-web'):
                self.assertNotIn('NEVOLIUM_API_KEY', with_tools['services'][service].get('environment', {}))
            missing_api = copy.deepcopy(with_tools)
            missing_api['services']['litellm']['environment']['NEVOLIUM_API_KEY'] = ''
            self.assertIn(
                'LiteLLM smart alias requires NEVOLIUM_API_KEY', production.validate(missing_api)
            )
            self.assertTrue(production.validate(config(['--profile', 'local-ai'])))
            for extra in [['-f','compose.override.yaml'],['--profile','collaboration-experimental'],['--profile','home']]:
                self.assertTrue(production.validate(config(extra)),extra)
            bad=copy.deepcopy(valid);bad['services']['nevolium-core']['environment']['DATABASE_URL']='postgresql://postgres:secret@db/nevolium'
            self.assertTrue(production.validate(bad))
            for service_name, network_name in (
                ('nevolium-worker', 'assets'),
                ('seaweedfs', 'assets'),
            ):
                bad = copy.deepcopy(valid)
                del bad['services'][service_name]['networks'][network_name]
                self.assertTrue(production.validate(bad), (service_name, network_name))
            bad = copy.deepcopy(valid)
            bad['services']['nevolium-worker']['networks']['canonical'] = None
            self.assertTrue(production.validate(bad), 'Worker canonical isolation')
            bad = copy.deepcopy(valid)
            bad['services']['seaweedfs']['networks']['egress'] = None
            self.assertTrue(production.validate(bad), 'SeaweedFS egress isolation')
            for trusted_proxy in ('CHANGE_ME_PROXY_ADDRESS', '0.0.0.0/0', '8.8.8.8/32', '172.20.0.0/16'):
                bad=copy.deepcopy(valid)
                bad['services']['keycloak']['environment']['KC_PROXY_TRUSTED_ADDRESSES']=trusted_proxy
                self.assertTrue(production.validate(bad),trusted_proxy)


class ResearchModelSelection(unittest.IsolatedAsyncioTestCase):
    async def test_new_direct_and_assistant_runs_share_selected_model(self):
        project = SimpleNamespace(id=uuid.uuid4())
        command = SimpleNamespace(id=uuid.uuid4(), correlation_id=uuid.uuid4(), result_json={})
        conversation = SimpleNamespace(id=uuid.uuid4(), subject_ref="owner-fixture")
        route = assistant.CommandRoute(
            capability="research.autonomous", confidence=1.0, route_reason="fixture",
            parameters={"query": "Research Debian releases", "max_tool_calls": 2},
        )
        session = AsyncMock()
        session.get.return_value = command
        execution = SimpleNamespace(
            task_id=uuid.uuid4(), workflow_execution_id=uuid.uuid4(),
            workflow_id="fixture-workflow", status="running",
        )
        with (
            patch.object(research.settings, "nevolium_research_model", "alternative"),
            patch.object(research.settings, "nevolium_research_model_estimated_cost_usd", Decimal("0.10")),
            patch.object(assistant, "_ensure_assistant_project", AsyncMock(return_value=project)),
            patch.object(assistant, "start_research_run", AsyncMock(return_value=execution)) as start,
            patch.object(assistant, "enqueue_domain_event", AsyncMock()),
            patch.object(assistant, "append_audit", AsyncMock()),
        ):
            direct = research.ResearchRunCreate(project_id=project.id, query="Research Debian releases")
            self.assertEqual(direct.model_alias, "alternative")
            for semantic in (False, True):
                await assistant._execute_route(command, conversation, route, session, semantic=semantic)
                handed_off = start.await_args.args[0]
                self.assertEqual(handed_off.model_alias, direct.model_alias)
                self.assertEqual(handed_off.estimated_model_cost_usd, Decimal("0.10"))

    async def test_provider_change_does_not_relabel_existing_tasks(self):
        with patch.object(research.settings, "nevolium_env", "production"):
            with self.assertRaises(ValidationError):
                research.ResearchRunCreate(
                    project_id=uuid.uuid4(), query="New Research request", model_alias="local-fast"
                )
        task = SimpleNamespace(id=uuid.uuid4(), project_id=uuid.uuid4(), input={
            "capability": "research.autonomous", "query": "Existing research task",
        })
        session = AsyncMock()
        session.get.return_value = task
        with (
            patch.object(research.settings, "nevolium_research_model", "smart"),
            patch.object(research, "_eligible_tools", AsyncMock(return_value=[])),
        ):
            legacy = await research.research_context(task.id, session)
            self.assertEqual(legacy.model_alias, "local-fast")
            task.input.update(model_alias="alternative", estimated_model_cost_usd="0.07")
            existing = await research.research_context(task.id, session)
            self.assertEqual(existing.model_alias, "alternative")
            self.assertEqual(existing.estimated_model_cost_usd, Decimal("0.07"))


if __name__=='__main__': unittest.main(verbosity=2)
