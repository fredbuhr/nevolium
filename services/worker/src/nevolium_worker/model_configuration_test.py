from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from temporalio import activity
from temporalio.exceptions import ApplicationError

from .model_gateway import (
    ModelCallOutcomeUnknown,
    chat_completion,
    deterministic_model_call_key,
    read_activity_model_checkpoint,
)

MODEL_CONFIGURATION_TEST_TIMEOUT_SECONDS = 45
MODEL_CONFIGURATION_TEST_HEARTBEAT_TIMEOUT_SECONDS = 35


def _estimated_cost(task_input: dict[str, Any]) -> Decimal:
    try:
        value = Decimal(str(task_input.get("estimated_cost_usd") or "0"))
    except (InvalidOperation, ValueError):
        value = Decimal("0")
    if value <= 0 or value > Decimal("1"):
        raise ApplicationError(
            "Model configuration test has an invalid estimate",
            type="InvalidModelConfigurationTest",
            non_retryable=True,
        )
    return value


@activity.defn(name="perform_model_configuration_test")
async def perform_model_configuration_test(payload: dict[str, Any]) -> dict[str, Any]:
    """Make one tiny real provider call through the normal admitted/accounted gateway."""

    task_input = payload.get("task_input") or {}
    required = {
        key: str(task_input.get(key) or "").strip()
        for key in (
            "model_configuration_id",
            "model_alias",
            "litellm_model_id",
            "provider",
            "model_name",
        )
    }
    if any(not value for value in required.values()):
        raise ApplicationError(
            "Model configuration test is missing its immutable binding",
            type="InvalidModelConfigurationTest",
            non_retryable=True,
        )
    expected_model = f"{required['provider']}/"
    if not required["model_name"].startswith(expected_model):
        raise ApplicationError(
            "Model configuration provider binding is invalid",
            type="InvalidModelConfigurationTest",
            non_retryable=True,
        )

    task_id = str(payload["task_id"])
    execution_id = str(payload.get("workflow_execution_id") or "") or None
    correlation_id = str(payload.get("correlation_id") or "") or None
    call_key = deterministic_model_call_key(
        task_id=task_id,
        workflow_execution_id=execution_id,
        call_slot="model-configuration-test-v1",
    )
    try:
        result = await chat_completion(
            task_id=task_id,
            workflow_execution_id=execution_id,
            correlation_id=correlation_id,
            model_alias=required["model_alias"],
            idempotency_key=call_key,
            resume_checkpoint=read_activity_model_checkpoint(),
            estimated_cost_usd=_estimated_cost(task_input),
            temperature=0.0,
            timeout_seconds=30.0,
            max_output_tokens=8,
            messages=[
                {
                    "role": "system",
                    "content": "Connection check. Reply with exactly NEVOLIUM_OK and nothing else.",
                },
                {"role": "user", "content": "NEVOLIUM_OK"},
            ],
        )
    except ModelCallOutcomeUnknown as exc:
        raise ApplicationError(
            "Provider connection test outcome is unknown; the active configuration is unchanged",
            type="ModelConfigurationTestUnknown",
            non_retryable=True,
        ) from exc

    if result.content.strip() != "NEVOLIUM_OK":
        raise ApplicationError(
            "Provider returned an unexpected connection-test response",
            type="ModelConfigurationTestRejected",
            non_retryable=True,
        )
    if result.usage.litellm_model_id != required["litellm_model_id"]:
        raise ApplicationError(
            "LiteLLM response did not identify the selected deployment",
            type="ModelConfigurationIdentityMismatch",
            non_retryable=True,
        )

    return {
        "kind": "model-configuration-test",
        "title": f"API verified — {required['model_name']}"[:320],
        "content": {
            "verified": True,
            "model_configuration_id": required["model_configuration_id"],
            "model_alias": required["model_alias"],
            "litellm_model_id": required["litellm_model_id"],
            "provider": required["provider"],
            "model_name": required["model_name"],
            "provider_model": result.usage.provider_model,
            "prompt_tokens": result.usage.prompt_tokens,
            "completion_tokens": result.usage.completion_tokens,
            "total_tokens": result.usage.total_tokens,
            "cost_usd": str(result.usage.cost_usd),
            "cost_reported": result.usage.cost_reported,
        },
    }
