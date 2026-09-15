from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator, model_validator
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, require_nevolium_admin
from .autonomy_models import ModelReservation, ModelUsageRecord
from .config import settings
from .db import get_session
from .events import append_audit, enqueue_domain_event
from .model_admission import ACTIVE, expire_reservations, lock_admission
from .model_configuration_models import ModelConfiguration
from .models import Artifact, Project, Task, WorkflowExecution
from .workflows import run_task

router = APIRouter()

MODEL_CONFIGURATION_PROJECT_ID = uuid.uuid5(
    uuid.NAMESPACE_URL, "nevolium:project:model-configuration:v1"
)
MODEL_TEST_PROMPT_VERSION = 1
MODEL_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,219}$")
BUILTIN_MODEL_ALIASES = frozenset({"smart", "alternative", "local-fast"})
VERIFIED_CONFIGURATION_STATUSES = frozenset({"verified", "active", "retired"})
MODEL_CONFIGURATION_ACTIVATION_WINDOW = timedelta(minutes=15)


class ModelConfigurationTestCreate(BaseModel):
    model_config = ConfigDict(hide_input_in_errors=True, str_strip_whitespace=True)

    provider: Literal["openai", "anthropic", "xai", "moonshot"]
    model: str = Field(min_length=1, max_length=220)
    api_key: SecretStr = Field(min_length=8, max_length=8192, repr=False)
    estimated_cost_usd: Decimal = Field(
        default_factory=lambda: settings.nevolium_model_test_estimated_cost_usd,
        ge=Decimal("0.0001"),
        le=Decimal("1"),
    )

    @field_validator("model")
    @classmethod
    def validate_model_characters(cls, value: str) -> str:
        if not MODEL_PATTERN.fullmatch(value):
            raise ValueError("model must be a provider model identifier without whitespace")
        return value

    @model_validator(mode="after")
    def bind_provider_and_model(self) -> "ModelConfigurationTestCreate":
        if "/" in self.model and not self.model.startswith(f"{self.provider}/"):
            raise ValueError("model provider prefix does not match the selected provider")
        suffix = self.model.removeprefix(f"{self.provider}/")
        if not suffix or suffix.startswith("/"):
            raise ValueError("model must identify a concrete provider model")
        return self

    @property
    def provider_model(self) -> str:
        if self.model.startswith(f"{self.provider}/"):
            return self.model
        return f"{self.provider}/{self.model}"


class ModelConfigurationRead(BaseModel):
    id: uuid.UUID | None
    source: Literal["environment", "managed"]
    provider: str
    model_name: str
    model_alias: str
    status: Literal["testing", "verified", "active", "retired", "failed"]
    connection_state: Literal["bootstrap", "testing", "verified", "failed"]
    test_task_id: uuid.UUID | None = None
    test_execution_status: str | None = None
    provider_model: str | None = None
    failure_code: str | None = None
    tested_at: datetime | None = None
    activated_at: datetime | None = None
    created_at: datetime | None = None
    test_cost_usd: Decimal = Decimal("0")
    test_cost_reported: bool = False


class ModelConfigurationInventory(BaseModel):
    active: ModelConfigurationRead
    candidates: list[ModelConfigurationRead]
    active_calls: int
    allowed_providers: list[str]


class ModelConfigurationTestAccepted(BaseModel):
    configuration: ModelConfigurationRead
    workflow_execution_id: uuid.UUID
    workflow_id: str
    status: str


class LiteLLMManagementError(RuntimeError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _management_headers() -> dict[str, str]:
    if not settings.litellm_master_key:
        raise LiteLLMManagementError("litellm_management_unavailable")
    return {
        "Authorization": f"Bearer {settings.litellm_master_key}",
        "Content-Type": "application/json",
    }


async def _register_litellm_model(
    *, configuration: ModelConfiguration, api_key: SecretStr
) -> None:
    payload = {
        "model_name": configuration.model_alias,
        "litellm_params": {
            "model": configuration.model_name,
            "api_key": api_key.get_secret_value(),
        },
        "model_info": {
            "id": configuration.litellm_model_id,
            "description": "Nevolium verified instance model configuration",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.litellm_url.rstrip('/')}/model/new",
                headers=_management_headers(),
                json=payload,
            )
    except (httpx.HTTPError, OSError) as exc:
        raise LiteLLMManagementError("litellm_management_unavailable") from exc
    if response.status_code in {401, 403}:
        raise LiteLLMManagementError("litellm_management_unauthorized")
    if response.status_code == 409:
        raise LiteLLMManagementError("litellm_model_conflict")
    if response.status_code < 200 or response.status_code >= 300:
        raise LiteLLMManagementError("litellm_model_registration_failed")


async def _delete_litellm_model(litellm_model_id: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.litellm_url.rstrip('/')}/model/delete",
                headers=_management_headers(),
                json={"id": litellm_model_id},
            )
        return 200 <= response.status_code < 300 or response.status_code == 404
    except (httpx.HTTPError, OSError, LiteLLMManagementError):
        return False


async def _ensure_configuration_project(session: AsyncSession) -> Project:
    project = await session.get(Project, MODEL_CONFIGURATION_PROJECT_ID)
    if project is not None:
        return project
    await session.execute(
        pg_insert(Project)
        .values(
            id=MODEL_CONFIGURATION_PROJECT_ID,
            name="Nevolium Model Configuration",
            status="active",
            summary="System workspace for bounded, canonically accounted provider checks.",
            owner_subject=None,
            parent_id=None,
        )
        .on_conflict_do_nothing(index_elements=[Project.id])
    )
    project = await session.get(Project, MODEL_CONFIGURATION_PROJECT_ID)
    if project is None:
        raise RuntimeError("Model configuration workspace could not be initialized")
    return project


async def selected_model_binding(
    session: AsyncSession, *, fallback_alias: str
) -> tuple[str, str | None]:
    """Return the active immutable alias for a newly created Task.

    Existing Tasks never call this helper during execution: their input retains the alias selected
    at creation time, preserving Temporal replay and making provider changes workflow-independent.
    """

    configuration = await session.scalar(
        select(ModelConfiguration).where(ModelConfiguration.status == "active")
    )
    if configuration is None:
        return fallback_alias, None
    return configuration.model_alias, str(configuration.id)


async def task_model_alias_is_authorized(
    session: AsyncSession, *, task: Task, model_alias: str
) -> bool:
    task_input = task.input or {}
    bound_alias = str(task_input.get("model_alias") or "")
    if bound_alias:
        if bound_alias != model_alias:
            return False
    elif model_alias in BUILTIN_MODEL_ALIASES:
        # Legacy Tasks created before D05 did not freeze their alias in Task.input.
        return True
    else:
        return False
    if model_alias in BUILTIN_MODEL_ALIASES:
        return True
    configuration_id = task_input.get("model_configuration_id")
    try:
        configuration_uuid = uuid.UUID(str(configuration_id))
    except (TypeError, ValueError, AttributeError):
        return False
    configuration = await session.get(ModelConfiguration, configuration_uuid)
    if configuration is None or configuration.model_alias != model_alias:
        return False
    if configuration.status == "testing":
        return configuration.test_task_id == task.id
    return configuration.status in VERIFIED_CONFIGURATION_STATUSES


async def _test_cost(
    session: AsyncSession, task_id: uuid.UUID
) -> tuple[Decimal, bool]:
    row = (
        await session.execute(
            select(
                func.coalesce(func.sum(ModelUsageRecord.cost_usd), 0),
                func.count(ModelUsageRecord.id),
            ).where(ModelUsageRecord.task_id == task_id)
        )
    ).one()
    cost = Decimal(row[0] or 0)
    return cost, bool(row[1])


async def _read_configuration(
    session: AsyncSession, configuration: ModelConfiguration
) -> ModelConfigurationRead:
    cost, cost_reported = await _test_cost(session, configuration.test_task_id)
    execution_status = await session.scalar(
        select(WorkflowExecution.status).where(
            WorkflowExecution.task_id == configuration.test_task_id
        )
    )
    state = {
        "testing": "testing",
        "verified": "verified",
        "active": "verified",
        "retired": "verified",
        "failed": "failed",
    }[configuration.status]
    return ModelConfigurationRead(
        id=configuration.id,
        source="managed",
        provider=configuration.provider,
        model_name=configuration.model_name,
        model_alias=configuration.model_alias,
        status=configuration.status,
        connection_state=state,
        test_task_id=configuration.test_task_id,
        test_execution_status=execution_status,
        provider_model=configuration.provider_model,
        failure_code=configuration.failure_code,
        tested_at=configuration.tested_at,
        activated_at=configuration.activated_at,
        created_at=configuration.created_at,
        test_cost_usd=cost,
        test_cost_reported=cost_reported,
    )


def _bootstrap_configuration() -> ModelConfigurationRead:
    provider = settings.nevolium_api_model.split("/", 1)[0]
    return ModelConfigurationRead(
        id=None,
        source="environment",
        provider=provider,
        model_name=settings.nevolium_api_model,
        model_alias="smart",
        status="active",
        connection_state="bootstrap",
    )


async def mark_model_test_completed(
    session: AsyncSession, *, task: Task, artifact: Artifact
) -> str | None:
    task_input = task.input or {}
    if task_input.get("capability") != "model.configuration.test":
        return None
    try:
        configuration_id = uuid.UUID(str(task_input.get("model_configuration_id")))
    except (TypeError, ValueError, AttributeError):
        return None
    configuration = await session.get(
        ModelConfiguration, configuration_id, with_for_update=True
    )
    if configuration is None or configuration.test_task_id != task.id:
        return None
    if configuration.status != "testing":
        return None
    content = artifact.content or {}
    valid = (
        artifact.kind == "model-configuration-test"
        and content.get("verified") is True
        and str(content.get("model_configuration_id") or "") == str(configuration.id)
        and str(content.get("model_alias") or "") == configuration.model_alias
        and str(content.get("litellm_model_id") or "") == configuration.litellm_model_id
        and str(content.get("provider") or "") == configuration.provider
        and str(content.get("model_name") or "") == configuration.model_name
    )
    configuration.tested_at = datetime.now(UTC)
    if valid:
        configuration.status = "verified"
        configuration.provider_model = str(content.get("provider_model") or "")[:240] or None
        configuration.failure_code = None
        return None
    else:
        configuration.status = "failed"
        configuration.failure_code = "provider_identity_mismatch"
        return configuration.litellm_model_id


async def mark_model_test_failed(session: AsyncSession, *, task: Task) -> str | None:
    task_input = task.input or {}
    if task_input.get("capability") != "model.configuration.test":
        return None
    try:
        configuration_id = uuid.UUID(str(task_input.get("model_configuration_id")))
    except (TypeError, ValueError, AttributeError):
        return None
    configuration = await session.get(
        ModelConfiguration, configuration_id, with_for_update=True
    )
    if configuration is None or configuration.test_task_id != task.id:
        return None
    if configuration.status == "testing":
        configuration.status = "failed"
        configuration.failure_code = "connection_test_failed"
        configuration.tested_at = datetime.now(UTC)
        return configuration.litellm_model_id
    return None


@router.get(
    "/v1/admin/model-configurations",
    response_model=ModelConfigurationInventory,
)
async def get_model_configurations(
    _principal: Principal = Depends(require_nevolium_admin),
    session: AsyncSession = Depends(get_session),
) -> ModelConfigurationInventory:
    active_configuration = await session.scalar(
        select(ModelConfiguration).where(ModelConfiguration.status == "active")
    )
    candidates_query = select(ModelConfiguration).order_by(
        ModelConfiguration.created_at.desc()
    )
    if active_configuration is not None:
        candidates_query = candidates_query.where(
            ModelConfiguration.id != active_configuration.id
        )
    configurations = list(await session.scalars(candidates_query.limit(20)))
    active = (
        await _read_configuration(session, active_configuration)
        if active_configuration is not None
        else _bootstrap_configuration()
    )
    candidates = [
        await _read_configuration(session, configuration)
        for configuration in configurations
    ]
    active_calls = await session.scalar(
        select(func.count())
        .select_from(ModelReservation)
        .where(
            ModelReservation.status.in_(ACTIVE),
            ModelReservation.expires_at > func.now(),
        )
    )
    return ModelConfigurationInventory(
        active=active,
        candidates=candidates,
        active_calls=int(active_calls or 0),
        allowed_providers=["openai", "anthropic", "xai", "moonshot"],
    )


async def _mark_model_test_dispatch_failed(
    session: AsyncSession,
    *,
    configuration_id: uuid.UUID,
    task_id: uuid.UUID,
    litellm_model_id: str,
) -> bool:
    await session.rollback()
    execution = await session.scalar(
        select(WorkflowExecution)
        .where(WorkflowExecution.task_id == task_id)
        .with_for_update()
    )
    # Once the durable execution exists, the provider call may already be running. Preserve the
    # candidate deployment and retry the same deterministic workflow instead of deleting its key.
    if execution is not None:
        return False
    task = await session.get(Task, task_id, with_for_update=True)
    configuration = await session.get(
        ModelConfiguration, configuration_id, with_for_update=True
    )
    if configuration is None or configuration.status != "testing":
        return False
    if task is not None and task.status == "completed":
        return False
    configuration.status = "failed"
    configuration.failure_code = "workflow_start_failed"
    configuration.tested_at = datetime.now(UTC)
    if task is not None and task.status not in {"completed", "failed"}:
        task.status = "failed"
        task.completed_at = datetime.now(UTC)
    await session.commit()
    await _delete_litellm_model(litellm_model_id)
    return True


async def _current_model_test_acceptance(
    session: AsyncSession,
    *,
    configuration_id: uuid.UUID,
    task_id: uuid.UUID,
) -> ModelConfigurationTestAccepted | None:
    configuration = await session.get(ModelConfiguration, configuration_id)
    execution = await session.scalar(
        select(WorkflowExecution).where(WorkflowExecution.task_id == task_id)
    )
    if configuration is None or execution is None:
        return None
    return ModelConfigurationTestAccepted(
        configuration=await _read_configuration(session, configuration),
        workflow_execution_id=execution.id,
        workflow_id=execution.workflow_id,
        status=execution.status,
    )


async def _dispatch_model_configuration_test(
    session: AsyncSession,
    *,
    configuration_id: uuid.UUID,
    task_id: uuid.UUID,
    litellm_model_id: str,
    actor_id: str,
) -> ModelConfigurationTestAccepted:
    try:
        execution = await run_task(task_id, session, actor_id=actor_id)
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, dict) else {}
        workflow_id = str(detail.get("workflow_id") or "")
        if exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE and workflow_id:
            # ``run_task`` has already committed start_unknown. The same workflow ID can be
            # dispatched again without creating a new candidate or retransmitting its API key.
            stored_execution = await session.scalar(
                select(WorkflowExecution).where(
                    WorkflowExecution.task_id == task_id,
                    WorkflowExecution.workflow_id == workflow_id,
                )
            )
            configuration = await session.get(ModelConfiguration, configuration_id)
            if stored_execution is not None and configuration is not None:
                return ModelConfigurationTestAccepted(
                    configuration=await _read_configuration(session, configuration),
                    workflow_execution_id=stored_execution.id,
                    workflow_id=stored_execution.workflow_id,
                    status=stored_execution.status,
                )
        dispatch_failed = await _mark_model_test_dispatch_failed(
            session,
            configuration_id=configuration_id,
            task_id=task_id,
            litellm_model_id=litellm_model_id,
        )
        if not dispatch_failed:
            current = await _current_model_test_acceptance(
                session,
                configuration_id=configuration_id,
                task_id=task_id,
            )
            if current is not None:
                return current
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "workflow_start_failed",
                "message": "Le test durable n’a pas démarré. La configuration active est inchangée.",
            },
        ) from exc
    except Exception as exc:
        dispatch_failed = await _mark_model_test_dispatch_failed(
            session,
            configuration_id=configuration_id,
            task_id=task_id,
            litellm_model_id=litellm_model_id,
        )
        if not dispatch_failed:
            current = await _current_model_test_acceptance(
                session,
                configuration_id=configuration_id,
                task_id=task_id,
            )
            if current is not None:
                return current
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "workflow_start_failed",
                "message": "Le test durable n’a pas démarré. La configuration active est inchangée.",
            },
        ) from exc

    configuration = await session.get(ModelConfiguration, configuration_id)
    if configuration is None:
        raise RuntimeError("Model configuration disappeared after test dispatch")
    return ModelConfigurationTestAccepted(
        configuration=await _read_configuration(session, configuration),
        workflow_execution_id=execution.workflow_execution_id,
        workflow_id=execution.workflow_id,
        status=execution.status,
    )


@router.post(
    "/v1/admin/model-configurations/tests",
    response_model=ModelConfigurationTestAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_model_configuration_test(
    body: ModelConfigurationTestCreate,
    principal: Principal = Depends(require_nevolium_admin),
    session: AsyncSession = Depends(get_session),
) -> ModelConfigurationTestAccepted:
    configuration_id = uuid.uuid4()
    task_id = uuid.uuid4()
    alias = f"instance-{configuration_id.hex}"
    litellm_model_id = str(configuration_id)
    project = await _ensure_configuration_project(session)
    configuration = ModelConfiguration(
        id=configuration_id,
        provider=body.provider,
        model_name=body.provider_model,
        model_alias=alias,
        litellm_model_id=litellm_model_id,
        status="testing",
        created_by_subject=principal.subject,
        test_task_id=task_id,
        test_estimated_cost_usd=body.estimated_cost_usd,
    )
    task = Task(
        id=task_id,
        project_id=project.id,
        title=f"Test API — {body.provider_model}"[:320],
        description="Bounded provider connection test through the canonical model gateway.",
        status="todo",
        owner_type="system",
        owner_ref="model-configuration",
        authority_ceiling=1,
        budget_usd=body.estimated_cost_usd,
        input={
            "capability": "model.configuration.test",
            "model_configuration_id": str(configuration_id),
            "model_alias": alias,
            "litellm_model_id": litellm_model_id,
            "provider": body.provider,
            "model_name": body.provider_model,
            "estimated_cost_usd": str(body.estimated_cost_usd),
            "authority_level": 1,
            "policy_scope": {"capability": "model.configuration.test"},
            "prompt_version": MODEL_TEST_PROMPT_VERSION,
        },
    )
    # ``test_task_id`` is assigned as a scalar UUID, so the ORM has no object relationship from
    # which to infer the required INSERT order. Persist the canonical Task first: PostgreSQL must
    # never see a model configuration whose required Task does not exist yet. Both writes remain
    # in this transaction and are rolled back together if registration or event persistence fails.
    session.add(task)
    await session.flush()
    session.add(configuration)
    await session.flush()

    try:
        await _register_litellm_model(configuration=configuration, api_key=body.api_key)
    except LiteLLMManagementError as exc:
        await session.rollback()
        # Registration can succeed upstream while its response is lost. A best-effort delete by
        # immutable deployment ID prevents that ambiguous outcome from retaining a candidate key.
        await _delete_litellm_model(litellm_model_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": exc.code,
                "message": "LiteLLM n’a pas accepté la configuration. La configuration active est inchangée.",
            },
        ) from None

    correlation_id = uuid.uuid4()
    try:
        await enqueue_domain_event(
            session,
            event_type="model.configuration.test_requested",
            aggregate_type="model_configuration",
            aggregate_id=configuration.id,
            correlation_id=correlation_id,
            payload={
                "configuration_id": str(configuration.id),
                "task_id": str(task.id),
                "provider": configuration.provider,
                "model_name": configuration.model_name,
            },
        )
        await append_audit(
            session,
            actor_type="user",
            actor_id=principal.subject,
            action="model.configuration.test",
            resource_type="model_configuration",
            resource_id=str(configuration.id),
            authority_level=1,
            correlation_id=correlation_id,
            request_json={
                "provider": configuration.provider,
                "model_name": configuration.model_name,
                "estimated_cost_usd": str(body.estimated_cost_usd),
                "credential_received": True,
            },
        )
        await session.commit()
    except Exception as exc:
        await session.rollback()
        await _delete_litellm_model(litellm_model_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "model_configuration_persistence_failed",
                "message": "Le test n’a pas été enregistré. La configuration active est inchangée.",
            },
        ) from exc

    return await _dispatch_model_configuration_test(
        session,
        configuration_id=configuration_id,
        task_id=task_id,
        litellm_model_id=litellm_model_id,
        actor_id=principal.subject,
    )


@router.post(
    "/v1/admin/model-configurations/{configuration_id}/retry-test",
    response_model=ModelConfigurationTestAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
async def retry_model_configuration_test(
    configuration_id: uuid.UUID,
    principal: Principal = Depends(require_nevolium_admin),
    session: AsyncSession = Depends(get_session),
) -> ModelConfigurationTestAccepted:
    configuration = await session.get(ModelConfiguration, configuration_id)
    if configuration is None:
        raise HTTPException(status_code=404, detail="Model configuration not found")
    if configuration.status != "testing":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "model_configuration_test_not_retryable",
                "message": "Seul un démarrage de test encore indéterminé peut être relancé.",
            },
        )
    execution_status = await session.scalar(
        select(WorkflowExecution.status).where(
            WorkflowExecution.task_id == configuration.test_task_id
        )
    )
    if execution_status not in {"pending_start", "start_unknown"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "model_configuration_test_not_retryable",
                "message": "Le test est déjà en attente ou en cours d’exécution.",
            },
        )
    return await _dispatch_model_configuration_test(
        session,
        configuration_id=configuration.id,
        task_id=configuration.test_task_id,
        litellm_model_id=configuration.litellm_model_id,
        actor_id=principal.subject,
    )


@router.post(
    "/v1/admin/model-configurations/{configuration_id}/activate",
    response_model=ModelConfigurationInventory,
)
async def activate_model_configuration(
    configuration_id: uuid.UUID,
    principal: Principal = Depends(require_nevolium_admin),
    session: AsyncSession = Depends(get_session),
) -> ModelConfigurationInventory:
    await lock_admission(session)
    await expire_reservations(session)
    active_calls = await session.scalar(
        select(func.count())
        .select_from(ModelReservation)
        .where(ModelReservation.status.in_(ACTIVE))
    )
    if active_calls:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "model_calls_in_progress",
                "message": "Attendez la fin des appels modèle en cours avant la bascule.",
                "active_calls": int(active_calls),
            },
            headers={"Retry-After": "2"},
        )

    configuration = await session.get(
        ModelConfiguration, configuration_id, with_for_update=True
    )
    if configuration is None:
        raise HTTPException(status_code=404, detail="Model configuration not found")
    if configuration.status == "active":
        return await get_model_configurations(principal, session)
    recently_verified = (
        configuration.status == "verified"
        and configuration.tested_at is not None
        and configuration.tested_at >= datetime.now(UTC) - MODEL_CONFIGURATION_ACTIVATION_WINDOW
    )
    if not recently_verified:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "model_configuration_not_verified",
                "message": "Cette configuration doit réussir un test réel récent avant activation.",
            },
        )

    await session.execute(
        update(ModelConfiguration)
        .where(
            ModelConfiguration.status == "active",
            ModelConfiguration.id != configuration.id,
        )
        .values(status="retired")
    )
    now = datetime.now(UTC)
    configuration.status = "active"
    configuration.activated_at = now
    correlation_id = uuid.uuid4()
    await enqueue_domain_event(
        session,
        event_type="model.configuration.activated",
        aggregate_type="model_configuration",
        aggregate_id=configuration.id,
        correlation_id=correlation_id,
        payload={
            "configuration_id": str(configuration.id),
            "provider": configuration.provider,
            "model_name": configuration.model_name,
            "model_alias": configuration.model_alias,
        },
    )
    await append_audit(
        session,
        actor_type="user",
        actor_id=principal.subject,
        action="model.configuration.activate",
        resource_type="model_configuration",
        resource_id=str(configuration.id),
        authority_level=1,
        correlation_id=correlation_id,
        result_json={
            "provider": configuration.provider,
            "model_name": configuration.model_name,
            "model_alias": configuration.model_alias,
            "drained_active_calls": 0,
        },
    )
    await session.commit()
    return await get_model_configurations(principal, session)
