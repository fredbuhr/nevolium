from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Query, Response
from sqlalchemy import select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, require_nevolium_user
from .db import get_session
from .models import Task
from .pagination import PageCursor, decode_cursor, encode_cursor
from .planning_models import TaskPlanningProfile
from .planning_projection_schemas import PlanningTaskRead
from .project_access import get_owned_project
from .schemas import TaskRead


def _planning_task_read(task: Task, profile: TaskPlanningProfile | None) -> PlanningTaskRead:
    base = TaskRead.model_validate(task).model_dump()
    return PlanningTaskRead(
        **base,
        parent_task_id=profile.parent_task_id if profile else None,
        kind=profile.kind if profile else "task",
        progress_percent=profile.progress_percent if profile else 0,
        planning_version=profile.planning_version if profile else 1,
        recurrence_rule=profile.recurrence_rule if profile else None,
        recurrence_timezone=profile.recurrence_timezone if profile else None,
    )


async def list_project_planning_tasks(
    project_id: uuid.UUID,
    response: Response,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    cursor: PageCursor = None,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> list[PlanningTaskRead]:
    project = await get_owned_project(session, project_id, principal)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    statement = (
        select(Task, TaskPlanningProfile)
        .outerjoin(TaskPlanningProfile, TaskPlanningProfile.task_id == Task.id)
        .where(Task.project_id == project.id)
    )

    if cursor:
        try:
            scope, created_at, task_id = decode_cursor(cursor, 3)
            if scope != str(project.id):
                raise ValueError()
            created = datetime.fromisoformat(created_at)
            if created.tzinfo is None:
                raise ValueError()
            identity = uuid.UUID(task_id)
        except (TypeError, ValueError, AttributeError, OverflowError) as exc:
            raise HTTPException(status_code=422, detail="Invalid planning cursor") from exc
        statement = statement.where(tuple_(Task.created_at, Task.id) < (created, identity))

    rows = list(
        (
            await session.execute(
                statement.order_by(Task.created_at.desc(), Task.id.desc()).limit(limit + 1)
            )
        ).all()
    )
    has_more = len(rows) > limit
    visible = rows[:limit]
    if has_more and visible:
        last_task = visible[-1][0]
        response.headers["X-Nevolium-Next-Cursor"] = encode_cursor(
            [str(project.id), last_task.created_at, last_task.id]
        )
    else:
        response.headers["X-Nevolium-Next-Cursor"] = ""

    return [_planning_task_read(task, profile) for task, profile in visible]
