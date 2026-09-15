#!/usr/bin/env python3
"""Deterministic D05 proof for server-side provider selection and bounded real tests."""

from __future__ import annotations

import asyncio
from decimal import Decimal
from types import SimpleNamespace
from typing import Any
import uuid

import httpx
from fastapi import HTTPException
from pydantic import SecretStr, ValidationError
from sqlalchemy import Index
from temporalio.exceptions import ApplicationError

from nevolium_core import model_configurations as core
from nevolium_core.auth import Principal, require_nevolium_admin
from nevolium_core.main import app
from nevolium_core.model_configuration_models import ModelConfiguration
from nevolium_core.models import Artifact, Task, WorkflowExecution
from nevolium_worker import model_configuration_test as worker
from nevolium_worker.model_gateway import ChatCompletionResult, ModelUsage


class ModelSession:
    def __init__(self, configuration: ModelConfiguration | None):
        self.configuration = configuration

    async def get(self, model: type, key: uuid.UUID, **_: Any):
        if model is ModelConfiguration and self.configuration is not None:
            return self.configuration if key == self.configuration.id else None
        return None


async def prove_management_boundary() -> None:
    configuration_id = uuid.uuid4()
    task_id = uuid.uuid4()
    configuration = ModelConfiguration(
        id=configuration_id,
        provider="openai",
        model_name="openai/gpt-fixture",
        model_alias=f"instance-{configuration_id.hex}",
        litellm_model_id=str(configuration_id),
        status="testing",
        created_by_subject="admin-fixture",
        test_task_id=task_id,
        test_estimated_cost_usd=Decimal("0.01"),
    )
    posts: list[dict[str, Any]] = []

    class FakeClient:
        def __init__(self, *_: Any, **__: Any):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_: Any):
            return None

        async def post(self, url: str, **kwargs: Any):
            posts.append({"url": url, **kwargs})
            return httpx.Response(200, request=httpx.Request("POST", url), json={"ok": True})

    original_client = core.httpx.AsyncClient
    original_key = core.settings.litellm_master_key
    try:
        core.httpx.AsyncClient = FakeClient
        core.settings.litellm_master_key = "fixture-master-key-not-a-real-secret"
        credential = SecretStr("provider-fixture-key")
        await core._register_litellm_model(configuration=configuration, api_key=credential)
    finally:
        core.httpx.AsyncClient = original_client
        core.settings.litellm_master_key = original_key

    assert len(posts) == 1, posts
    request = posts[0]
    assert request["url"].endswith("/model/new"), request
    assert request["json"]["litellm_params"]["api_key"] == "provider-fixture-key"
    assert request["json"]["model_info"]["id"] == str(configuration_id)
    assert not hasattr(configuration, "api_key")


async def prove_validation_response_redacts_key() -> None:
    secret = "provider-fixture-key-that-must-not-return"
    app.dependency_overrides[require_nevolium_admin] = lambda: Principal(
        subject="admin-fixture",
        username="admin-fixture",
        email=None,
        roles=frozenset({"nevolium-admin"}),
        claims={},
    )
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://core"
        ) as client:
            response = await client.post(
                "/v1/admin/model-configurations/tests",
                json={
                    "provider": "openai",
                    "model": "anthropic/claude-fixture",
                    "api_key": secret,
                },
            )
        assert response.status_code == 422, response.text
        assert secret not in response.text, response.text
        assert all("input" not in error for error in response.json()["detail"]), response.text
    finally:
        app.dependency_overrides.clear()


async def prove_task_bound_aliases() -> None:
    configuration_id, task_id = uuid.uuid4(), uuid.uuid4()
    configuration = ModelConfiguration(
        id=configuration_id,
        provider="anthropic",
        model_name="anthropic/claude-fixture",
        model_alias=f"instance-{configuration_id.hex}",
        litellm_model_id=str(configuration_id),
        status="testing",
        created_by_subject="admin-fixture",
        test_task_id=task_id,
        test_estimated_cost_usd=Decimal("0.01"),
    )
    task = Task(
        id=task_id,
        input={
            "model_alias": configuration.model_alias,
            "model_configuration_id": str(configuration.id),
        },
    )
    session = ModelSession(configuration)
    assert await core.task_model_alias_is_authorized(
        session, task=task, model_alias=configuration.model_alias
    )
    task.id = uuid.uuid4()
    assert not await core.task_model_alias_is_authorized(
        session, task=task, model_alias=configuration.model_alias
    )
    configuration.status = "active"
    assert await core.task_model_alias_is_authorized(
        session, task=task, model_alias=configuration.model_alias
    )
    task.input = {**task.input, "model_configuration_id": str(uuid.uuid4())}
    assert not await core.task_model_alias_is_authorized(
        session, task=task, model_alias=configuration.model_alias
    )
    assert not await core.task_model_alias_is_authorized(
        session, task=task, model_alias="smart"
    )
    assert await core.task_model_alias_is_authorized(
        session, task=Task(input={}), model_alias="smart"
    )


async def prove_bounded_worker_test() -> None:
    configuration_id = uuid.uuid4()
    captured: list[dict[str, Any]] = []

    async def completion(**kwargs: Any):
        captured.append(kwargs)
        return ChatCompletionResult(
            content="NEVOLIUM_OK",
            usage=ModelUsage(
                provider_model="openai/gpt-fixture",
                prompt_tokens=7,
                completion_tokens=3,
                total_tokens=10,
                cost_usd=Decimal("0.0001"),
                cost_reported=True,
                litellm_call_id="fixture-call",
                litellm_model_id=str(configuration_id),
            ),
            raw={},
        )

    original_completion = worker.chat_completion
    original_checkpoint = worker.read_activity_model_checkpoint
    try:
        worker.chat_completion = completion
        worker.read_activity_model_checkpoint = lambda: None
        payload = {
            "task_id": str(uuid.uuid4()),
            "workflow_execution_id": str(uuid.uuid4()),
            "correlation_id": str(uuid.uuid4()),
            "task_input": {
                "model_configuration_id": str(configuration_id),
                "model_alias": f"instance-{configuration_id.hex}",
                "litellm_model_id": str(configuration_id),
                "provider": "openai",
                "model_name": "openai/gpt-fixture",
                "estimated_cost_usd": "0.01",
            },
        }
        result = await worker.perform_model_configuration_test(payload)
        assert result["content"]["verified"] is True, result
        assert captured[0]["max_output_tokens"] == 8, captured
        assert captured[0]["timeout_seconds"] == 30.0, captured

        async def wrong_deployment(**kwargs: Any):
            value = await completion(**kwargs)
            return ChatCompletionResult(
                content=value.content,
                usage=ModelUsage(
                    provider_model=value.usage.provider_model,
                    prompt_tokens=value.usage.prompt_tokens,
                    completion_tokens=value.usage.completion_tokens,
                    total_tokens=value.usage.total_tokens,
                    cost_usd=value.usage.cost_usd,
                    cost_reported=value.usage.cost_reported,
                    litellm_call_id=value.usage.litellm_call_id,
                    litellm_model_id="different-deployment",
                ),
                raw=value.raw,
            )

        worker.chat_completion = wrong_deployment
        try:
            await worker.perform_model_configuration_test(payload)
        except ApplicationError as exc:
            assert exc.type == "ModelConfigurationIdentityMismatch", exc
        else:
            raise AssertionError("A different LiteLLM deployment was accepted")
    finally:
        worker.chat_completion = original_completion
        worker.read_activity_model_checkpoint = original_checkpoint


async def prove_completion_binding() -> None:
    configuration_id, task_id = uuid.uuid4(), uuid.uuid4()
    configuration = ModelConfiguration(
        id=configuration_id,
        provider="xai",
        model_name="xai/grok-fixture",
        model_alias=f"instance-{configuration_id.hex}",
        litellm_model_id=str(configuration_id),
        status="testing",
        created_by_subject="admin-fixture",
        test_task_id=task_id,
        test_estimated_cost_usd=Decimal("0.01"),
    )
    task = Task(
        id=task_id,
        input={
            "capability": "model.configuration.test",
            "model_configuration_id": str(configuration_id),
        },
    )
    artifact = Artifact(
        kind="model-configuration-test",
        title="fixture",
        content={
            "verified": True,
            "model_configuration_id": str(configuration.id),
            "model_alias": configuration.model_alias,
            "litellm_model_id": configuration.litellm_model_id,
            "provider": configuration.provider,
            "model_name": configuration.model_name,
            "provider_model": "xai/grok-fixture",
        },
    )
    cleanup_id = await core.mark_model_test_completed(
        ModelSession(configuration), task=task, artifact=artifact
    )
    assert cleanup_id is None
    assert configuration.status == "verified", configuration.status

    configuration.status = "testing"
    artifact.content["litellm_model_id"] = "wrong"
    cleanup_id = await core.mark_model_test_completed(
        ModelSession(configuration), task=task, artifact=artifact
    )
    assert configuration.status == "failed", configuration.status
    assert configuration.failure_code == "provider_identity_mismatch"
    assert cleanup_id == configuration.litellm_model_id


async def prove_ambiguous_start_is_retryable() -> None:
    configuration_id, task_id, execution_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    configuration = ModelConfiguration(
        id=configuration_id,
        provider="moonshot",
        model_name="moonshot/kimi-fixture",
        model_alias=f"instance-{configuration_id.hex}",
        litellm_model_id=str(configuration_id),
        status="testing",
        created_by_subject="admin-fixture",
        test_task_id=task_id,
        test_estimated_cost_usd=Decimal("0.01"),
    )
    execution = WorkflowExecution(
        id=execution_id,
        task_id=task_id,
        workflow_id=f"nevolium-task-{task_id}",
        status="start_unknown",
        correlation_id=uuid.uuid4(),
    )
    response_configuration = core.ModelConfigurationRead(
        id=configuration.id,
        source="managed",
        provider=configuration.provider,
        model_name=configuration.model_name,
        model_alias=configuration.model_alias,
        status="testing",
        connection_state="testing",
        test_task_id=task_id,
        test_execution_status="start_unknown",
    )

    class AmbiguousSession:
        async def rollback(self):
            return None

        async def scalar(self, _statement: Any):
            return execution

        async def get(self, model: type, key: uuid.UUID, **_: Any):
            if model is ModelConfiguration and key == configuration.id:
                return configuration
            return None

    deleted: list[str] = []

    async def uncertain_start(*_: Any, **__: Any):
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Temporal start outcome is unknown; retrying is safe",
                "workflow_id": execution.workflow_id,
            },
        )

    async def read_configuration(*_: Any, **__: Any):
        return response_configuration

    async def delete_model(model_id: str):
        deleted.append(model_id)
        return True

    original_run_task = core.run_task
    original_read_configuration = core._read_configuration
    original_delete = core._delete_litellm_model
    original_dispatch = core._dispatch_model_configuration_test
    try:
        core.run_task = uncertain_start
        core._read_configuration = read_configuration
        core._delete_litellm_model = delete_model
        session = AmbiguousSession()
        accepted = await core._dispatch_model_configuration_test(
            session,
            configuration_id=configuration.id,
            task_id=task_id,
            litellm_model_id=configuration.litellm_model_id,
            actor_id="admin-fixture",
        )
        assert accepted.workflow_execution_id == execution.id, accepted
        assert accepted.status == "start_unknown", accepted
        assert not await core._mark_model_test_dispatch_failed(
            session,
            configuration_id=configuration.id,
            task_id=task_id,
            litellm_model_id=configuration.litellm_model_id,
        )
        assert deleted == [], deleted

        captured: dict[str, Any] = {}

        async def retry_dispatch(_session: Any, **kwargs: Any):
            captured.update(kwargs)
            return accepted

        core._dispatch_model_configuration_test = retry_dispatch

        class RetrySession:
            async def get(self, model: type, key: uuid.UUID, **_: Any):
                if model is ModelConfiguration and key == configuration.id:
                    return configuration
                return None

            async def scalar(self, _statement: Any):
                return "start_unknown"

        retried = await core.retry_model_configuration_test(
            configuration.id,
            SimpleNamespace(subject="admin-fixture"),
            RetrySession(),
        )
        assert retried == accepted
        assert captured == {
            "configuration_id": configuration.id,
            "task_id": task_id,
            "litellm_model_id": configuration.litellm_model_id,
            "actor_id": "admin-fixture",
        }, captured

        class RunningSession(RetrySession):
            async def scalar(self, _statement: Any):
                return "running"

        try:
            await core.retry_model_configuration_test(
                configuration.id,
                SimpleNamespace(subject="admin-fixture"),
                RunningSession(),
            )
        except HTTPException as exc:
            assert exc.status_code == 409, exc
            assert exc.detail["code"] == "model_configuration_test_not_retryable", exc
        else:
            raise AssertionError("A running model configuration test was retried")
    finally:
        core.run_task = original_run_task
        core._read_configuration = original_read_configuration
        core._delete_litellm_model = original_delete
        core._dispatch_model_configuration_test = original_dispatch


async def main() -> None:
    assert "api_key" not in ModelConfiguration.__table__.columns
    partial_indexes = {
        index.name
        for index in ModelConfiguration.__table__.indexes
        if isinstance(index, Index) and index.unique
    }
    assert "uq_model_configurations_single_active" in partial_indexes, partial_indexes

    request = core.ModelConfigurationTestCreate(
        provider="moonshot", model="kimi-fixture", api_key="provider-fixture-key"
    )
    assert request.provider_model == "moonshot/kimi-fixture"
    assert "provider-fixture-key" not in repr(request)
    for values in (
        {"provider": "openai", "model": "anthropic/claude", "api_key": "fixture-key"},
        {"provider": "openai", "model": "openai/", "api_key": "fixture-key"},
        {"provider": "openai", "model": "gpt model", "api_key": "fixture-key"},
        {"provider": "openai", "model": "gpt-fixture", "api_key": "short"},
    ):
        try:
            core.ModelConfigurationTestCreate(**values)
        except ValidationError:
            pass
        else:
            raise AssertionError(f"Invalid model configuration accepted: {values['model']}")

    response_schema = core.ModelConfigurationRead.model_json_schema()
    assert "api_key" not in response_schema.get("properties", {})
    await prove_management_boundary()
    await prove_validation_response_redacts_key()
    await prove_task_bound_aliases()
    await prove_bounded_worker_test()
    await prove_completion_binding()
    await prove_ambiguous_start_is_retryable()
    print(
        "MODEL CONFIGURATION CONTRACT PASS: admin-only server registry, immutable Task aliases, "
        "bounded real deployment identity, retry-safe starts and key-free responses are enforced"
    )


if __name__ == "__main__":
    asyncio.run(main())
