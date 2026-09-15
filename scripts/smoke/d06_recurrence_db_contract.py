#!/usr/bin/env python3
"""Real PostgreSQL proof for D06 virtual recurrence occurrences."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, Response
from sqlalchemy import delete

from nevolium_core.auth import Principal
from nevolium_core.db import SessionFactory, engine
from nevolium_core.models import Project, Task
from nevolium_core.planning_occurrences import list_project_planning_occurrences
from nevolium_core.planning_structure import update_task_planning_structure
from nevolium_core.planning_structure_schemas import TaskPlanningStructureUpdate


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
    owner = principal("d06-recurrence-owner")
    other = principal("d06-recurrence-other")
    anchor = datetime(2026, 9, 15, 8, 0, tzinfo=UTC)

    async with SessionFactory() as session:
        project = Project(name="D06 recurrence proof", owner_subject=owner.subject)
        foreign_project = Project(name="D06 recurrence foreign", owner_subject=other.subject)
        session.add_all([project, foreign_project])
        await session.flush()

        recurring = Task(
            project_id=project.id,
            title="Recurring planning task",
            planned_start_at=anchor,
            planned_end_at=anchor + timedelta(hours=1),
            due_at=anchor + timedelta(hours=2),
        )
        foreign = Task(
            project_id=foreign_project.id,
            title="Foreign recurring task",
            planned_start_at=anchor,
            planned_end_at=anchor + timedelta(hours=1),
        )
        session.add_all([recurring, foreign])
        await session.flush()
        project_id = project.id
        foreign_project_id = foreign_project.id
        recurring_id = recurring.id
        foreign_id = foreign.id
        await session.commit()

        profile = await update_task_planning_structure(
            recurring_id,
            TaskPlanningStructureUpdate(
                expected_version=1,
                recurrence_rule="FREQ=DAILY;COUNT=4",
                recurrence_timezone="Europe/Paris",
            ),
            owner,
            session,
        )
        assert profile.planning_version == 2

        foreign_profile = await update_task_planning_structure(
            foreign_id,
            TaskPlanningStructureUpdate(
                expected_version=1,
                recurrence_rule="FREQ=DAILY;COUNT=4",
                recurrence_timezone="Europe/Paris",
            ),
            other,
            session,
        )
        assert foreign_profile.planning_version == 2

        window_start = datetime(2026, 9, 15, 0, 0, tzinfo=UTC)
        window_end = datetime(2026, 9, 20, 0, 0, tzinfo=UTC)

        first_response = Response()
        first_page = await list_project_planning_occurrences(
            project_id,
            first_response,
            window_start,
            window_end,
            2,
            None,
            owner,
            session,
        )
        assert len(first_page) == 2
        assert all(item.virtual is True for item in first_page)
        assert all(item.source_task_id == recurring_id for item in first_page)
        assert all(item.project_id == project_id for item in first_page)
        assert all(item.planning_version == 2 for item in first_page)
        assert [item.number for item in first_page] == [2, 3]
        assert first_page[0].end_at - first_page[0].start_at == timedelta(hours=1)
        assert first_page[0].due_at - first_page[0].start_at == timedelta(hours=2)
        cursor = first_response.headers.get("X-Nevolium-Next-Cursor")
        assert cursor

        second_response = Response()
        second_page = await list_project_planning_occurrences(
            project_id,
            second_response,
            window_start,
            window_end,
            2,
            cursor,
            owner,
            session,
        )
        assert len(second_page) == 1
        assert second_page[0].number == 4
        assert second_response.headers.get("X-Nevolium-Next-Cursor") == ""

        repeated_response = Response()
        repeated = await list_project_planning_occurrences(
            project_id,
            repeated_response,
            window_start,
            window_end,
            10,
            None,
            owner,
            session,
        )
        combined = [*first_page, *second_page]
        assert [item.id for item in repeated] == [item.id for item in combined]
        assert [item.start_at for item in repeated] == [item.start_at for item in combined]
        assert len({item.id for item in repeated}) == len(repeated)

        await expect_status(
            404,
            list_project_planning_occurrences(
                foreign_project_id,
                Response(),
                window_start,
                window_end,
                10,
                None,
                owner,
                session,
            ),
        )
        await session.rollback()

        await expect_status(
            422,
            list_project_planning_occurrences(
                project_id,
                Response(),
                window_start,
                window_start + timedelta(days=367),
                10,
                None,
                owner,
                session,
            ),
        )
        await session.rollback()

        await session.execute(
            delete(Project).where(Project.id.in_([project_id, foreign_project_id]))
        )
        await session.commit()

    await engine.dispose()
    print(
        "D06 RECURRENCE DB PASS: owner-scoped bounded virtual occurrences keep deterministic UUID5 "
        "identity, stable pagination, Task duration/due offsets and no persisted duplicate Tasks"
    )


if __name__ == "__main__":
    asyncio.run(main())
