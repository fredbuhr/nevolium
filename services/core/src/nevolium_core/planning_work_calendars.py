from __future__ import annotations

import uuid

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, require_nevolium_user
from .db import get_session
from .events import append_audit, enqueue_domain_event
from .planning_models import ProjectWorkCalendar
from .planning_structure import _serialize_project_planning
from .planning_work_calendar_schemas import (
    ProjectWorkCalendarRead,
    ProjectWorkCalendarUpdate,
    default_weekly_intervals,
)
from .project_access import get_owned_project


def _default_week_json() -> list[list[dict[str, str]]]:
    return [
        [interval.model_dump(mode="json") for interval in intervals]
        for intervals in default_weekly_intervals()
    ]


async def read_project_work_calendar(
    project_id: uuid.UUID,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> ProjectWorkCalendarRead | ProjectWorkCalendar:
    project = await get_owned_project(session, project_id, principal)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    calendar = await session.get(ProjectWorkCalendar, project.id)
    if calendar is None:
        return ProjectWorkCalendarRead(project_id=project.id)
    return calendar


async def update_project_work_calendar(
    project_id: uuid.UUID,
    body: ProjectWorkCalendarUpdate,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> ProjectWorkCalendar:
    project = await get_owned_project(session, project_id, principal)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    await _serialize_project_planning(session, project.id)
    await session.execute(
        pg_insert(ProjectWorkCalendar)
        .values(
            project_id=project.id,
            timezone="UTC",
            weekly_intervals=_default_week_json(),
            exceptions=[],
        )
        .on_conflict_do_nothing(index_elements=[ProjectWorkCalendar.project_id])
    )
    calendar = await session.scalar(
        select(ProjectWorkCalendar)
        .where(ProjectWorkCalendar.project_id == project.id)
        .with_for_update()
    )
    if calendar is None:
        raise RuntimeError("Project work calendar could not be initialized")
    if calendar.calendar_version != body.expected_version:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Work calendar changed since it was loaded",
                "current_version": calendar.calendar_version,
            },
        )

    changed_fields: list[str] = []
    supplied = body.model_fields_set
    if "timezone" in supplied and body.timezone is not None and body.timezone != calendar.timezone:
        calendar.timezone = body.timezone
        changed_fields.append("timezone")
    if "weekly_intervals" in supplied and body.weekly_intervals is not None:
        week_json = [
            [interval.model_dump(mode="json") for interval in intervals]
            for intervals in body.weekly_intervals
        ]
        if week_json != calendar.weekly_intervals:
            calendar.weekly_intervals = week_json
            changed_fields.append("weekly_intervals")
    if "exceptions" in supplied and body.exceptions is not None:
        exception_json = [
            item.model_dump(mode="json")
            for item in sorted(body.exceptions, key=lambda item: item.date)
        ]
        if exception_json != calendar.exceptions:
            calendar.exceptions = exception_json
            changed_fields.append("exceptions")

    if not changed_fields:
        return calendar

    calendar.calendar_version += 1
    correlation_id = uuid.uuid4()
    payload = {
        "project_id": str(project.id),
        "calendar_version": calendar.calendar_version,
        "changed_fields": sorted(changed_fields),
        "timezone": calendar.timezone,
    }
    await session.flush()
    await enqueue_domain_event(
        session,
        event_type="project.work_calendar.updated",
        aggregate_type="project",
        aggregate_id=project.id,
        correlation_id=correlation_id,
        payload=payload,
    )
    await append_audit(
        session,
        actor_type="user",
        actor_id=principal.subject,
        action="project.work_calendar.update",
        resource_type="project",
        resource_id=str(project.id),
        authority_level=1,
        correlation_id=correlation_id,
        request_json=body.model_dump(mode="json", exclude_unset=True),
        result_json=payload,
    )
    await session.commit()
    await session.refresh(calendar)
    return calendar
