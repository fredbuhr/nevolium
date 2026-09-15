from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated
from zoneinfo import ZoneInfoNotFoundError

from fastapi import Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, require_nevolium_user
from .db import get_session
from .models import Task
from .pagination import PageCursor, decode_cursor, encode_cursor
from .planning_models import TaskPlanningProfile
from .planning_occurrence_schemas import PlanningOccurrenceRead
from .planning_recurrence import expand_recurrence, parse_recurrence_rule
from .project_access import get_owned_project

MAX_RECURRENCE_TASKS = 500
MAX_RECURRENCE_WINDOW = timedelta(days=366)
MAX_RECURRENCE_OCCURRENCES = 10_000


def _require_aware(value: datetime, field: str) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise HTTPException(status_code=422, detail=f"{field} must include a timezone offset")
    return value


def _occurrence_id(task_id: uuid.UUID, start_at: datetime) -> uuid.UUID:
    return uuid.uuid5(
        uuid.NAMESPACE_URL,
        f"nevolium://planning/occurrence/{task_id}/{start_at.astimezone(UTC).isoformat()}",
    )


async def list_project_planning_occurrences(
    project_id: uuid.UUID,
    response: Response,
    window_start: Annotated[datetime, Query(alias="from")],
    window_end: Annotated[datetime, Query(alias="to")],
    limit: Annotated[int, Query(ge=1, le=1000)] = 250,
    cursor: PageCursor = None,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> list[PlanningOccurrenceRead]:
    project = await get_owned_project(session, project_id, principal)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    window_start = _require_aware(window_start, "from")
    window_end = _require_aware(window_end, "to")
    start_utc = window_start.astimezone(UTC)
    end_utc = window_end.astimezone(UTC)
    if end_utc <= start_utc:
        raise HTTPException(status_code=422, detail="to must be after from")
    if end_utc - start_utc > MAX_RECURRENCE_WINDOW:
        raise HTTPException(status_code=422, detail="Recurrence window is limited to 366 days")

    rows = list(
        (
            await session.execute(
                select(Task, TaskPlanningProfile)
                .join(TaskPlanningProfile, TaskPlanningProfile.task_id == Task.id)
                .where(
                    Task.project_id == project.id,
                    Task.planned_start_at.is_not(None),
                    TaskPlanningProfile.recurrence_rule.is_not(None),
                )
                .order_by(Task.id)
                .limit(MAX_RECURRENCE_TASKS + 1)
            )
        ).all()
    )
    if len(rows) > MAX_RECURRENCE_TASKS:
        raise HTTPException(
            status_code=422,
            detail=f"Recurrence expansion is limited to {MAX_RECURRENCE_TASKS} project tasks",
        )

    occurrences: list[PlanningOccurrenceRead] = []
    for task, profile in rows:
        if task.planned_start_at is None or profile.recurrence_rule is None:
            continue
        timezone_name = profile.recurrence_timezone or "UTC"
        try:
            rule = parse_recurrence_rule(profile.recurrence_rule)
            expanded = expand_recurrence(
                rule=rule,
                anchor_start=task.planned_start_at,
                anchor_end=task.planned_end_at,
                anchor_due=task.due_at,
                timezone_name=timezone_name,
                window_start=start_utc,
                window_end=end_utc,
                include_anchor=False,
            )
        except (ValueError, ZoneInfoNotFoundError) as exc:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Stored recurrence metadata is invalid",
                    "task_id": str(task.id),
                },
            ) from exc

        for item in expanded:
            occurrences.append(
                PlanningOccurrenceRead(
                    id=_occurrence_id(task.id, item.start_at),
                    source_task_id=task.id,
                    project_id=project.id,
                    number=item.number,
                    title=task.title,
                    status=task.status,
                    kind=profile.kind,
                    timezone=timezone_name,
                    planning_version=profile.planning_version,
                    start_at=item.start_at,
                    end_at=item.end_at,
                    due_at=item.due_at,
                )
            )
            if len(occurrences) > MAX_RECURRENCE_OCCURRENCES:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Recurrence expansion is limited to "
                        f"{MAX_RECURRENCE_OCCURRENCES} occurrences per window"
                    ),
                )

    occurrences.sort(key=lambda item: (item.start_at, str(item.source_task_id), item.number))
    scope = f"{project.id}:{start_utc.isoformat()}:{end_utc.isoformat()}"
    if cursor:
        try:
            cursor_scope, raw_start, raw_task_id, raw_number = decode_cursor(cursor, 4)
            cursor_start = datetime.fromisoformat(raw_start)
            if cursor_scope != scope or cursor_start.tzinfo is None:
                raise ValueError()
            boundary = (cursor_start.astimezone(UTC), str(uuid.UUID(raw_task_id)), int(raw_number))
        except (TypeError, ValueError, AttributeError, OverflowError) as exc:
            raise HTTPException(status_code=422, detail="Invalid recurrence cursor") from exc
        occurrences = [
            item
            for item in occurrences
            if (item.start_at.astimezone(UTC), str(item.source_task_id), item.number) > boundary
        ]

    page = occurrences[: limit + 1]
    more = len(page) > limit
    page = page[:limit]
    if more and page:
        last = page[-1]
        response.headers["X-Nevolium-Next-Cursor"] = encode_cursor(
            [scope, last.start_at.astimezone(UTC), last.source_task_id, last.number]
        )
    else:
        response.headers["X-Nevolium-Next-Cursor"] = ""
    return page
