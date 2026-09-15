#!/usr/bin/env python3
"""Real PostgreSQL proof for D06 planning hierarchy, conflicts and dependency cycles."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, Response
from sqlalchemy import delete

from nevolium_core.auth import Principal
from nevolium_core.db import SessionFactory, engine
from nevolium_core.models import Project, Task
from nevolium_core.planning_structure import (
    create_task_dependency,
    list_task_dependencies,
    update_task_planning_structure,
)
from nevolium_core.planning_structure_schemas import (
    TaskDependencyCreate,
    TaskPlanningStructureUpdate,
)


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
    owner = principal("d06-planning-owner")
    other = principal("d06-planning-other")

    async with SessionFactory() as session:
        project = Project(name="D06 planning proof", owner_subject=owner.subject)
        foreign_project = Project(name="D06 foreign project", owner_subject=other.subject)
        session.add_all([project, foreign_project])
        await session.flush()

        start = datetime(2026, 9, 16, 8, 0, tzinfo=UTC)
        a = Task(project_id=project.id, title="A")
        b = Task(project_id=project.id, title="B")
        c = Task(project_id=project.id, title="C")
        ranged = Task(
            project_id=project.id,
            title="Ranged task",
            planned_start_at=start,
            planned_end_at=start + timedelta(hours=2),
        )
        foreign = Task(project_id=foreign_project.id, title="Foreign")
        session.add_all([a, b, c, ranged, foreign])
        await session.flush()
        project_id = project.id
        foreign_project_id = foreign_project.id
        a_id, b_id, c_id = a.id, b.id, c.id
        ranged_id, foreign_id = ranged.id, foreign.id
        await session.commit()

        profile_a = await update_task_planning_structure(
            a_id,
            TaskPlanningStructureUpdate(expected_version=1, parent_task_id=b_id),
            owner,
            session,
        )
        assert profile_a.planning_version == 2 and profile_a.parent_task_id == b_id
        profile_b = await update_task_planning_structure(
            b_id,
            TaskPlanningStructureUpdate(expected_version=1, parent_task_id=c_id),
            owner,
            session,
        )
        assert profile_b.planning_version == 2 and profile_b.parent_task_id == c_id

        cycle = await expect_status(
            409,
            update_task_planning_structure(
                c_id,
                TaskPlanningStructureUpdate(expected_version=1, parent_task_id=a_id),
                owner,
                session,
            ),
        )
        assert "cycle" in str(cycle.detail).lower()
        await session.rollback()

        stale = await expect_status(
            409,
            update_task_planning_structure(
                a_id,
                TaskPlanningStructureUpdate(expected_version=1, progress_percent=25),
                owner,
                session,
            ),
        )
        assert stale.detail["current_version"] == 2
        await session.rollback()

        await expect_status(
            422,
            update_task_planning_structure(
                ranged_id,
                TaskPlanningStructureUpdate(expected_version=1, kind="milestone"),
                owner,
                session,
            ),
        )
        await session.rollback()

        await expect_status(
            422,
            update_task_planning_structure(
                c_id,
                TaskPlanningStructureUpdate(
                    expected_version=1,
                    recurrence_rule="FREQ=DAILY",
                    recurrence_timezone="Mars/Olympus_Mons",
                ),
                owner,
                session,
            ),
        )
        await session.rollback()

        first = await create_task_dependency(
            project_id,
            TaskDependencyCreate(predecessor_task_id=a_id, successor_task_id=b_id),
            owner,
            session,
        )
        assert first.predecessor_task_id == a_id and first.successor_task_id == b_id
        second = await create_task_dependency(
            project_id,
            TaskDependencyCreate(predecessor_task_id=b_id, successor_task_id=c_id),
            owner,
            session,
        )
        assert second.predecessor_task_id == b_id and second.successor_task_id == c_id

        dependency_cycle = await expect_status(
            409,
            create_task_dependency(
                project_id,
                TaskDependencyCreate(predecessor_task_id=c_id, successor_task_id=a_id),
                owner,
                session,
            ),
        )
        assert "cycle" in str(dependency_cycle.detail).lower()
        await session.rollback()

        await expect_status(
            404,
            create_task_dependency(
                project_id,
                TaskDependencyCreate(predecessor_task_id=a_id, successor_task_id=foreign_id),
                owner,
                session,
            ),
        )
        await session.rollback()

        response = Response()
        dependencies = await list_task_dependencies(
            project_id,
            response,
            100,
            None,
            owner,
            session,
        )
        assert {(item.predecessor_task_id, item.successor_task_id) for item in dependencies} == {
            (a_id, b_id),
            (b_id, c_id),
        }
        assert response.headers.get("X-Nevolium-Next-Cursor") == ""

        await session.execute(
            delete(Project).where(Project.id.in_([project_id, foreign_project_id]))
        )
        await session.commit()

    await engine.dispose()
    print(
        "D06 PLANNING DB PASS: optimistic conflicts, milestone duration, IANA timezone, "
        "owner/project isolation and hierarchy/dependency cycle rejection hold on PostgreSQL"
    )


if __name__ == "__main__":
    asyncio.run(main())
