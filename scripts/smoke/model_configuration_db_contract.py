#!/usr/bin/env python3
"""Real PostgreSQL proof for retained-valid and drained model configuration activation.

Run only against the disposable CI database after ``alembic upgrade head``. Provider transport is
covered by ``model_configuration_contract.py`` and is deliberately not contacted here.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from decimal import Decimal
import uuid

import httpx
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError

from nevolium_core.auth import Principal, require_nevolium_admin
from nevolium_core.autonomy_models import ModelReservation
from nevolium_core.config import settings
from nevolium_core.db import SessionFactory, engine
from nevolium_core.main import app
from nevolium_core.model_configuration_models import ModelConfiguration
from nevolium_core.model_configurations import (
    MODEL_CONFIGURATION_PROJECT_ID,
    _ensure_configuration_project,
    mark_model_test_failed,
    selected_model_binding,
)
from nevolium_core.models import Project, Task

ADMIN_SUBJECT = "d05-model-configuration-admin"


def configuration(
    *,
    task_id: uuid.UUID,
    status: str,
    provider: str,
    suffix: str,
) -> ModelConfiguration:
    configuration_id = uuid.uuid4()
    return ModelConfiguration(
        id=configuration_id,
        provider=provider,
        model_name=f"{provider}/{suffix}",
        model_alias=f"instance-{configuration_id.hex}",
        litellm_model_id=str(configuration_id),
        status=status,
        created_by_subject=ADMIN_SUBJECT,
        test_task_id=task_id,
        test_estimated_cost_usd=Decimal("0.01"),
        tested_at=datetime.now(UTC) if status != "testing" else None,
        activated_at=datetime.now(UTC) if status == "active" else None,
    )


async def reset() -> None:
    async with SessionFactory() as session:
        task_ids = select(Task.id).where(Task.project_id == MODEL_CONFIGURATION_PROJECT_ID)
        await session.execute(delete(ModelReservation).where(ModelReservation.task_id.in_(task_ids)))
        await session.execute(
            delete(ModelConfiguration).where(
                ModelConfiguration.created_by_subject == ADMIN_SUBJECT
            )
        )
        await session.execute(delete(Task).where(Task.project_id == MODEL_CONFIGURATION_PROJECT_ID))
        await session.execute(
            delete(Project).where(Project.id == MODEL_CONFIGURATION_PROJECT_ID)
        )
        await session.commit()


async def seed() -> tuple[ModelConfiguration, ModelConfiguration, ModelConfiguration, uuid.UUID]:
    async with SessionFactory() as session:
        project = await _ensure_configuration_project(session)
        tasks = [
            Task(
                id=uuid.uuid4(),
                project_id=project.id,
                title=f"D05 model configuration fixture {index}",
                status="completed" if index == 0 else "todo",
                owner_type="system",
                owner_ref="model-configuration",
                authority_ceiling=1,
                budget_usd=Decimal("0.01"),
                input={"capability": "model.configuration.test"},
            )
            for index in range(4)
        ]
        session.add_all(tasks)
        await session.flush()
        active = configuration(
            task_id=tasks[0].id,
            status="active",
            provider="openai",
            suffix="active-fixture",
        )
        failed = configuration(
            task_id=tasks[1].id,
            status="testing",
            provider="anthropic",
            suffix="failed-fixture",
        )
        verified = configuration(
            task_id=tasks[2].id,
            status="verified",
            provider="xai",
            suffix="verified-fixture",
        )
        for task, candidate in zip(tasks[:3], (active, failed, verified), strict=True):
            task.input = {
                "capability": "model.configuration.test",
                "model_configuration_id": str(candidate.id),
                "model_alias": candidate.model_alias,
                "litellm_model_id": candidate.litellm_model_id,
            }
        session.add_all([active, failed, verified])
        await session.commit()
        return active, failed, verified, tasks[3].id


async def prove_single_active_index(extra_task_id: uuid.UUID) -> None:
    async with SessionFactory() as session:
        second_active = configuration(
            task_id=extra_task_id,
            status="active",
            provider="moonshot",
            suffix="conflict-fixture",
        )
        session.add(second_active)
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
        else:
            raise AssertionError("The database accepted two active model configurations")


async def main() -> None:
    assert settings.database_url.endswith(
        "/nevolium_admission_test"
    ), "Requires the disposable model admission database"
    await reset()
    active, failed, verified, extra_task_id = await seed()
    await prove_single_active_index(extra_task_id)

    async with SessionFactory() as session:
        failed_task = await session.get(Task, failed.test_task_id)
        assert failed_task is not None
        await mark_model_test_failed(session, task=failed_task)
        await session.commit()
        selected_alias, selected_id = await selected_model_binding(
            session, fallback_alias="smart"
        )
        assert (selected_alias, selected_id) == (active.model_alias, str(active.id))
        failed_row = await session.get(ModelConfiguration, failed.id)
        assert failed_row is not None and failed_row.status == "failed"

        session.add(
            ModelReservation(
                idempotency_key="d05-active-call",
                task_id=active.test_task_id,
                workflow_execution_id=None,
                owner_subject=ADMIN_SUBJECT,
                model_alias=active.model_alias,
                amount_usd=Decimal("0.01"),
                status="started",
                expires_at=datetime.now(UTC) + timedelta(minutes=2),
            )
        )
        await session.commit()

    unauthenticated = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=unauthenticated, base_url="http://core") as client:
        response = await client.get("/v1/admin/model-configurations")
        assert response.status_code == 401, response.text

    app.dependency_overrides[require_nevolium_admin] = lambda: Principal(
        subject=ADMIN_SUBJECT,
        username="d05-admin",
        email=None,
        roles=frozenset({"nevolium-admin"}),
        claims={},
    )
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://core"
        ) as client:
            blocked = await client.post(
                f"/v1/admin/model-configurations/{verified.id}/activate"
            )
            assert blocked.status_code == 409, blocked.text
            assert blocked.json()["detail"]["code"] == "model_calls_in_progress"

            async with SessionFactory() as session:
                still_active = await session.get(ModelConfiguration, active.id)
                candidate = await session.get(ModelConfiguration, verified.id)
                assert still_active is not None and still_active.status == "active"
                assert candidate is not None and candidate.status == "verified"
                await session.execute(
                    update(ModelReservation)
                    .where(ModelReservation.idempotency_key == "d05-active-call")
                    .values(status="settled", amount_usd=Decimal("0"))
                )
                await session.commit()

            activated = await client.post(
                f"/v1/admin/model-configurations/{verified.id}/activate"
            )
            assert activated.status_code == 200, activated.text
            inventory = activated.json()
            assert inventory["active"]["id"] == str(verified.id), inventory
            assert inventory["active"]["connection_state"] == "verified", inventory

        async with SessionFactory() as session:
            old = await session.get(ModelConfiguration, active.id)
            current = await session.get(ModelConfiguration, verified.id)
            assert old is not None and old.status == "retired"
            assert current is not None and current.status == "active"
            selected_alias, selected_id = await selected_model_binding(
                session, fallback_alias="smart"
            )
            assert (selected_alias, selected_id) == (
                verified.model_alias,
                str(verified.id),
            )
    finally:
        app.dependency_overrides.clear()
        await reset()
        await engine.dispose()

    print(
        "MODEL CONFIGURATION POSTGRESQL CONTRACT PASS: failed tests retain the valid model, "
        "activation drains calls and exactly one verified configuration becomes active"
    )


if __name__ == "__main__":
    asyncio.run(main())
