#!/usr/bin/env python3
"""Real PostgreSQL proof for D06 project work calendars."""

from __future__ import annotations

import asyncio
from datetime import date

from fastapi import HTTPException
from sqlalchemy import delete

from nevolium_core.auth import Principal
from nevolium_core.db import SessionFactory, engine
from nevolium_core.models import Project
from nevolium_core.planning_models import ProjectWorkCalendar
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
        "configuration, normalized exceptions, no-op stability and stale-write rejection hold"
    )


if __name__ == "__main__":
    asyncio.run(main())
