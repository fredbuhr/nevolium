#!/usr/bin/env python3
"""Real PostgreSQL proof for D06 project work calendars."""

from __future__ import annotations

import asyncio
from datetime import UTC, date, datetime

from fastapi import HTTPException
from sqlalchemy import delete

from nevolium_core.auth import Principal
from nevolium_core.db import SessionFactory, engine
from nevolium_core.models import Project, Task
from nevolium_core.planning_critical_path import read_project_critical_path
from nevolium_core.planning_models import ProjectWorkCalendar
from nevolium_core.planning_replan import preview_project_replan
from nevolium_core.planning_replan_schemas import ReplanRequest, ReplanTaskPatch
from nevolium_core.planning_structure import create_task_dependency
from nevolium_core.planning_structure_schemas import TaskDependencyCreate
from nevolium_core.planning_work_calendar_schemas import (
    ProjectWorkCalendarUpdate,
    WorkCalendarException,
    WorkInterval,
)
from nevolium_core.planning_work_calendars import (
    read_project_work_calendar,
    update_project_work_calendar,
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
    owner = principal("d06-work-calendar-owner")
    other = principal("d06-work-calendar-other")

    async with SessionFactory() as session:
        project = Project(name="D06 work calendar proof", owner_subject=owner.subject)
        foreign_project = Project(name="D06 work calendar foreign", owner_subject=other.subject)
        session.add_all([project, foreign_project])
        await session.flush()
        project_id = project.id
        foreign_project_id = foreign_project.id
        await session.commit()

        default = await read_project_work_calendar(project_id, owner, session)
        assert default.project_id == project_id
        assert default.timezone == "UTC"
        assert default.calendar_version == 1
        assert len(default.weekly_intervals) == 7
        assert all(
            len(day) == 1 and day[0].start == "00:00" and day[0].end == "24:00"
            for day in default.weekly_intervals
        )
        assert await session.get(ProjectWorkCalendar, project_id) is None

        office_week = [
            [WorkInterval(start="09:00", end="12:00"), WorkInterval(start="13:00", end="17:00")]
            for _ in range(5)
        ] + [[], []]
        updated = await update_project_work_calendar(
            project_id,
            ProjectWorkCalendarUpdate(
                expected_version=1,
                timezone="Europe/Paris",
                weekly_intervals=office_week,
                exceptions=[
                    WorkCalendarException(date=date(2026, 12, 25), intervals=[]),
                    WorkCalendarException(
                        date=date(2026, 12, 24),
                        intervals=[WorkInterval(start="09:00", end="12:00")],
                    ),
                ],
            ),
            owner,
            session,
        )
        assert updated.calendar_version == 2
        assert updated.timezone == "Europe/Paris"
        assert [item["date"] for item in updated.exceptions] == ["2026-12-24", "2026-12-25"]

        reread = await read_project_work_calendar(project_id, owner, session)
        assert reread.calendar_version == 2
        assert reread.timezone == "Europe/Paris"
        assert reread.weekly_intervals[0][0]["start"] == "09:00"
        assert reread.weekly_intervals[5] == []

        weekend_task = Task(
            project_id=project_id,
            title="Weekend-spanning task",
            planned_start_at=datetime(2026, 9, 18, 14, 0, tzinfo=UTC),
            planned_end_at=datetime(2026, 9, 21, 8, 0, tzinfo=UTC),
        )
        session.add(weekend_task)
        await session.commit()

        critical = await read_project_critical_path(project_id, owner, session)
        assert critical.basis == "working_seconds"
        assert critical.work_calendar_timezone == "Europe/Paris"
        assert critical.work_calendar_version == 2
        assert critical.project_duration_seconds == 7200
        assert critical.critical_task_ids == [weekend_task.id]
        critical_task = next(item for item in critical.tasks if item.task_id == weekend_task.id)
        assert critical_task.earliest_start_seconds == 0
        assert critical_task.earliest_finish_seconds == 7200
        assert critical_task.slack_seconds == 0

        # An FS lag of one working hour from Friday 17:00 Paris reaches Monday 10:00, not Friday
        # 18:00. This distinguishes calendar-aware lag validation from elapsed-time timedelta math.
        lag_predecessor = Task(
            project_id=project_id,
            title="Friday predecessor",
            planned_start_at=datetime(2026, 9, 18, 14, 0, tzinfo=UTC),
            planned_end_at=datetime(2026, 9, 18, 15, 0, tzinfo=UTC),
        )
        lag_successor = Task(
            project_id=project_id,
            title="Friday successor",
            planned_start_at=datetime(2026, 9, 18, 16, 0, tzinfo=UTC),
            planned_end_at=datetime(2026, 9, 18, 17, 0, tzinfo=UTC),
        )
        session.add_all([lag_predecessor, lag_successor])
        await session.flush()
        lag_predecessor_id = lag_predecessor.id
        lag_successor_id = lag_successor.id
        await session.commit()

        lag_dependency = await create_task_dependency(
            project_id,
            TaskDependencyCreate(
                predecessor_task_id=lag_predecessor_id,
                successor_task_id=lag_successor_id,
                dependency_type="FS",
                lag_seconds=3600,
            ),
            owner,
            session,
        )
        lag_preview = await preview_project_replan(
            project_id,
            ReplanRequest(
                updates=[
                    ReplanTaskPatch(
                        task_id=lag_predecessor_id,
                        expected_version=1,
                        due_at=datetime(2026, 9, 18, 18, 0, tzinfo=UTC),
                    )
                ]
            ),
            owner,
            session,
        )
        assert lag_preview.can_apply is False
        lag_finding = next(
            item
            for item in lag_preview.dependency_findings
            if item.dependency_id == lag_dependency.id
        )
        assert lag_finding.status == "violated"
        assert "working lag" in lag_finding.detail

        unchanged = await update_project_work_calendar(
            project_id,
            ProjectWorkCalendarUpdate(expected_version=2, timezone="Europe/Paris"),
            owner,
            session,
        )
        assert unchanged.calendar_version == 2

        stale = await expect_status(
            409,
            update_project_work_calendar(
                project_id,
                ProjectWorkCalendarUpdate(expected_version=1, timezone="UTC"),
                owner,
                session,
            ),
        )
        assert stale.detail["current_version"] == 2
        await session.rollback()

        await expect_status(
            404,
            read_project_work_calendar(foreign_project_id, owner, session),
        )
        await session.rollback()

        await expect_status(
            404,
            update_project_work_calendar(
                foreign_project_id,
                ProjectWorkCalendarUpdate(expected_version=1, timezone="Europe/Paris"),
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
        "D06 WORK CALENDAR DB PASS: non-persistent 24/7 default, owner-scoped versioned project "
        "configuration, normalized exceptions, working-second critical path and dependency lags, "
        "no-op stability and stale-write rejection hold"
    )


if __name__ == "__main__":
    asyncio.run(main())
