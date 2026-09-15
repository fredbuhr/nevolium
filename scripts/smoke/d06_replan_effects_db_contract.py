#!/usr/bin/env python3
"""Real PostgreSQL proof for explicit downstream replanning effects in D06."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import delete

from nevolium_core.auth import Principal
from nevolium_core.db import SessionFactory, engine
from nevolium_core.models import Project, Task
from nevolium_core.planning_replan import apply_project_replan, preview_project_replan
from nevolium_core.planning_replan_schemas import (
    ReplanApplyRequest,
    ReplanRequest,
    ReplanTaskPatch,
)
from nevolium_core.planning_structure import create_task_dependency
from nevolium_core.planning_structure_schemas import TaskDependencyCreate
from nevolium_core.planning_work_calendar_schemas import ProjectWorkCalendarUpdate, WorkInterval
from nevolium_core.planning_work_calendars import update_project_work_calendar


def principal(subject: str) -> Principal:
    return Principal(
        subject=subject,
        username=subject,
        email=None,
        roles=frozenset({"nevolium-user"}),
        claims={},
    )


async def expect_status(expected: int, awaitable) -> HTTPException:
    try:
        await awaitable
    except HTTPException as exc:
        assert exc.status_code == expected, (expected, exc.status_code, exc.detail)
        return exc
    raise AssertionError(f"expected HTTP {expected}")


async def main() -> None:
    owner = principal("d06-replan-effects-owner")

    async with SessionFactory() as session:
        project = Project(name="D06 downstream replan proof", owner_subject=owner.subject)
        session.add(project)
        await session.flush()
        project_id = project.id
        await session.commit()

        office_week = [
            [WorkInterval(start="09:00", end="12:00"), WorkInterval(start="13:00", end="17:00")]
            for _ in range(5)
        ] + [[], []]
        calendar = await update_project_work_calendar(
            project_id,
            ProjectWorkCalendarUpdate(
                expected_version=1,
                timezone="Europe/Paris",
                weekly_intervals=office_week,
                exceptions=[],
            ),
            owner,
            session,
        )
        assert calendar.calendar_version == 2

        # Friday 15:00-16:00 Paris followed by a one-working-hour FS lag reaches Friday 17:00.
        predecessor = Task(
            project_id=project_id,
            title="Predecessor",
            planned_start_at=datetime(2026, 9, 18, 13, 0, tzinfo=UTC),
            planned_end_at=datetime(2026, 9, 18, 14, 0, tzinfo=UTC),
        )
        successor = Task(
            project_id=project_id,
            title="Successor",
            planned_start_at=datetime(2026, 9, 18, 15, 0, tzinfo=UTC),
            planned_end_at=datetime(2026, 9, 18, 16, 0, tzinfo=UTC),
        )
        session.add_all([predecessor, successor])
        await session.flush()
        predecessor_id = predecessor.id
        successor_id = successor.id
        await session.commit()

        dependency = await create_task_dependency(
            project_id,
            TaskDependencyCreate(
                predecessor_task_id=predecessor_id,
                successor_task_id=successor_id,
                dependency_type="FS",
                lag_seconds=3600,
            ),
            owner,
            session,
        )

        # Move the predecessor one hour later. Its finish is now Friday 17:00 Paris, so the
        # one-working-hour lag crosses the weekend and requires the successor at Monday 10:00.
        predecessor_patch = ReplanTaskPatch(
            task_id=predecessor_id,
            expected_version=1,
            planned_start_at=datetime(2026, 9, 18, 14, 0, tzinfo=UTC),
            planned_end_at=datetime(2026, 9, 18, 15, 0, tzinfo=UTC),
        )
        first_request = ReplanRequest(updates=[predecessor_patch])
        first_preview = await preview_project_replan(project_id, first_request, owner, session)
        assert first_preview.can_apply is False
        assert first_preview.changed_task_count == 1
        assert first_preview.suggested_task_count == 1
        assert len(first_preview.suggested_changes) == 1
        suggestion = first_preview.suggested_changes[0]
        assert suggestion.task_id == successor_id
        assert suggestion.expected_version == 1
        assert suggestion.triggered_by_dependency_ids == [dependency.id]
        assert suggestion.proposed.planned_start_at == datetime(2026, 9, 21, 8, 0, tzinfo=UTC)
        assert suggestion.proposed.planned_end_at == datetime(2026, 9, 21, 9, 0, tzinfo=UTC)
        assert set(suggestion.changed_fields) == {"planned_start_at", "planned_end_at"}
        finding = next(
            item
            for item in first_preview.dependency_findings
            if item.dependency_id == dependency.id
        )
        assert finding.status == "violated"

        successor_patch = ReplanTaskPatch(
            task_id=successor_id,
            expected_version=suggestion.expected_version,
            planned_start_at=suggestion.proposed.planned_start_at,
            planned_end_at=suggestion.proposed.planned_end_at,
        )
        second_request = ReplanRequest(updates=[predecessor_patch, successor_patch])
        second_preview = await preview_project_replan(project_id, second_request, owner, session)
        assert second_preview.can_apply is True
        assert second_preview.changed_task_count == 2
        assert second_preview.suggested_task_count == 0
        assert second_preview.suggested_changes == []
        assert all(item.status != "violated" for item in second_preview.dependency_findings)

        applied = await apply_project_replan(
            project_id,
            ReplanApplyRequest(
                updates=second_request.updates,
                preview_digest=second_preview.preview_digest,
            ),
            owner,
            session,
        )
        assert applied.preview_digest == second_preview.preview_digest
        assert {item.task_id for item in applied.updated} == {predecessor_id, successor_id}
        assert all(item.planning_version == 2 for item in applied.updated)

        stored_predecessor = await session.get(Task, predecessor_id)
        stored_successor = await session.get(Task, successor_id)
        assert stored_predecessor is not None and stored_successor is not None
        assert stored_predecessor.planned_start_at == predecessor_patch.planned_start_at
        assert stored_predecessor.planned_end_at == predecessor_patch.planned_end_at
        assert stored_successor.planned_start_at == suggestion.proposed.planned_start_at
        assert stored_successor.planned_end_at == suggestion.proposed.planned_end_at

        stale = await expect_status(
            409,
            preview_project_replan(project_id, second_request, owner, session),
        )
        assert "planning changed" in str(stale.detail).lower()
        await session.rollback()

        await session.execute(delete(Project).where(Project.id == project_id))
        await session.commit()

    await engine.dispose()
    print(
        "D06 REPLAN EFFECTS DB PASS: a predecessor shift exposes downstream effects without mutation; "
        "including the proposed successor shift produces a second valid preview and one explicit apply "
        "updates both canonical tasks with optimistic planning versions"
    )


if __name__ == "__main__":
    asyncio.run(main())
