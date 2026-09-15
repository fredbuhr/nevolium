from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, require_nevolium_user
from .pagination import PageCursor, decode_cursor, encode_cursor
from .db import get_session
from .events import append_audit, enqueue_domain_event
from .models import Project, Task, WorkflowExecution
from .planning_critical_path import read_project_critical_path
from .planning_critical_path_schemas import CriticalPathRead
from .planning_projection import list_project_planning_tasks
from .planning_projection_schemas import PlanningTaskRead
from .planning_replan import apply_project_replan, preview_project_replan
from .planning_replan_schemas import (
    ReplanApplyRead,
    ReplanApplyRequest,
    ReplanPreviewRead,
    ReplanRequest,
)
from .planning_schemas import PlannedTaskRead, TaskPlanningUpdate, TodayRead, TodayTaskItem
from .planning_structure import (
    _ensure_profile_locked,
    _serialize_project_planning,
    create_task_dependency,
    delete_task_dependency,
    list_task_dependencies,
    read_task_planning_structure,
    update_task_planning_structure,
)
from .planning_structure_schemas import TaskDependencyRead, TaskPlanningProfileRead
from .project_access import get_owned_task, owned_project_clause

router = APIRouter()


MANUAL_STATUSES = {"todo", "completed"}
ACTIVE_EXECUTION_STATUSES = {"queued", "running"}
TERMINAL_STATUSES = {"completed", "failed"}


def _planning_window(day: date | None, timezone_name: str) -> tuple[date, ZoneInfo, datetime, datetime]:
    try:
        zone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise HTTPException(status_code=422, detail="Unknown IANA timezone") from exc

    local_day = day or datetime.now(zone).date()
    local_start = datetime.combine(local_day, time.min, tzinfo=zone)
    local_end = datetime.combine(local_day + timedelta(days=1), time.min, tzinfo=zone)
    return local_day, zone, local_start, local_end


def _task_read(task: Task) -> PlannedTaskRead:
    return PlannedTaskRead.model_validate(task)


def _item(bucket: str, task: Task, project: Project) -> TodayTaskItem:
    return TodayTaskItem(
        bucket=bucket,
        project_id=str(project.id),
        project_name=project.name,
        task=_task_read(task),
    )


@router.patch("/v1/tasks/{task_id}", response_model=PlannedTaskRead)
async def update_planned_task(
    task_id: uuid.UUID,
    body: TaskPlanningUpdate,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> Task:
    task = await get_owned_task(session, task_id, principal)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    changes = body.model_dump(exclude_unset=True)
    if not changes:
        return task

    for required_field in ("title", "status", "priority"):
        if required_field in changes and changes[required_field] is None:
            raise HTTPException(status_code=422, detail=f"{required_field} cannot be null")

    if "status" in changes:
        new_status = str(changes["status"])
        if new_status not in MANUAL_STATUSES:
            raise HTTPException(status_code=422, detail="Unsupported manual Task status")
        existing_execution = await session.scalar(
            select(WorkflowExecution.id).where(WorkflowExecution.task_id == task.id).limit(1)
        )
        if existing_execution is not None:
            raise HTTPException(
                status_code=409,
                detail="Workflow-managed Task status cannot be changed manually",
            )

    planned_start = changes.get("planned_start_at", task.planned_start_at)
    planned_end = changes.get("planned_end_at", task.planned_end_at)
    if planned_end is not None and planned_start is None:
        raise HTTPException(status_code=422, detail="planned_end_at requires planned_start_at")
    if planned_start is not None and planned_end is not None and planned_end < planned_start:
        raise HTTPException(status_code=422, detail="planned_end_at must be on or after planned_start_at")

    planning_fields = {"planned_start_at", "planned_end_at", "due_at"}
    planning_changed = any(
        field in changes and getattr(task, field) != changes[field] for field in planning_fields
    )
    planning_profile = None
    if planning_changed:
        # Legacy Today/task edits participate in the same planning version stream. New multi-view
        # Gantt/calendar edits use preview/apply, but this prevents older writes from leaving a valid
        # optimistic snapshot behind them.
        await _serialize_project_planning(session, task.project_id)
        planning_profile = await _ensure_profile_locked(session, task.id)
        if (
            planning_profile.kind == "milestone"
            and planned_start is not None
            and planned_end is not None
            and planned_start != planned_end
        ):
            raise HTTPException(
                status_code=422,
                detail="A milestone cannot have a non-zero planned duration",
            )

    correlation_id = uuid.uuid4()
    previous_status = task.status
    for field in (
        "title",
        "description",
        "priority",
        "planned_start_at",
        "planned_end_at",
        "due_at",
    ):
        if field in changes:
            setattr(task, field, changes[field])

    if "status" in changes:
        task.status = str(changes["status"])
        if task.status == "completed":
            task.completed_at = task.completed_at or datetime.now(UTC)
        elif task.status == "todo":
            task.completed_at = None
            task.started_at = None

    if planning_profile is not None:
        planning_profile.planning_version += 1

    await session.flush()
    event_payload = {
        "task_id": str(task.id),
        "project_id": str(task.project_id),
        "changed_fields": sorted(changes),
        "status": task.status,
        "previous_status": previous_status,
        "priority": task.priority,
    }
    if planning_profile is not None:
        event_payload["planning_version"] = planning_profile.planning_version
    await enqueue_domain_event(
        session,
        event_type="task.updated",
        aggregate_type="task",
        aggregate_id=task.id,
        correlation_id=correlation_id,
        payload=event_payload,
    )
    await append_audit(
        session,
        actor_type="user",
        actor_id=principal.subject,
        action="task.update",
        resource_type="task",
        resource_id=str(task.id),
        authority_level=min(task.authority_ceiling, 1),
        correlation_id=correlation_id,
        request_json=body.model_dump(mode="json", exclude_unset=True),
        result_json=event_payload,
    )
    await session.commit()
    await session.refresh(task)
    return task


@router.get("/v1/today", response_model=TodayRead)
async def today(
    day: date | None = Query(default=None),
    timezone_name: str = Query(default="UTC", alias="timezone", min_length=1, max_length=120),
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    bucket: Literal["overdue", "in_progress", "due_today", "planned", "completed_today", "backlog"] | None = None,
    cursor: PageCursor = None,
) -> TodayRead:
    local_day, _zone, local_start, local_end = _planning_window(day, timezone_name)
    start_utc, end_utc = local_start.astimezone(UTC), local_end.astimezone(UTC)
    if cursor and not bucket:
        raise HTTPException(422, "A Today cursor requires its bucket")
    inactive = Task.status.notin_(TERMINAL_STATUSES | ACTIVE_EXECUTION_STATUSES)
    no_due_today = or_(Task.due_at.is_(None), Task.due_at >= end_utc)
    predicates = {
        "completed_today": and_(Task.status == "completed", Task.completed_at >= start_utc, Task.completed_at < end_utc),
        "in_progress": Task.status.in_(ACTIVE_EXECUTION_STATUSES),
        "overdue": and_(inactive, Task.due_at < start_utc),
        "due_today": and_(inactive, Task.due_at >= start_utc, Task.due_at < end_utc),
        "planned": and_(inactive, no_due_today, Task.planned_start_at < end_utc,
                        or_(Task.planned_end_at.is_(None), Task.planned_end_at >= start_utc)),
        "backlog": and_(Task.status == "todo", Task.due_at.is_(None), Task.planned_start_at.is_(None), Task.planned_end_at.is_(None)),
    }
    buckets = {key: [] for key in predicates}
    next_cursors = {}
    # A deterministic total order preserves priority and places undated Tasks last.
    far_future = datetime(9999, 1, 1, tzinfo=UTC)
    due_key = func.coalesce(Task.due_at, far_future)
    order_key = tuple_(-Task.priority, due_key, Task.created_at, Task.id)
    for name in ([bucket] if bucket else predicates):
        query = select(Task, Project).join(Project, Project.id == Task.project_id).where(
            owned_project_clause(principal), predicates[name],
        )
        if cursor:
            try:
                scope, priority, due, created, identity = decode_cursor(cursor, 5)
                if scope != f"{local_day}:{timezone_name}:{name}":
                    raise ValueError()
                due, created = datetime.fromisoformat(due), datetime.fromisoformat(created)
                if due.tzinfo is None or created.tzinfo is None:
                    raise ValueError()
                query = query.where(order_key > (int(priority), due, created, uuid.UUID(identity)))
            except (TypeError, ValueError, AttributeError, OverflowError) as exc:
                raise HTTPException(422, "Invalid Today cursor") from exc
        rows = list((await session.execute(query.order_by(
            Task.priority.desc(), due_key, Task.created_at, Task.id,
        ).limit(limit + 1))).all())
        if len(rows) > limit:
            last = rows[limit - 1][0]
            next_cursors[name] = encode_cursor([
                f"{local_day}:{timezone_name}:{name}", -last.priority,
                last.due_at or far_future, last.created_at, last.id,
            ])
        buckets[name] = [_item(name, task, project) for task, project in rows[:limit]]
    return TodayRead(day=local_day, timezone=timezone_name, day_start=local_start, day_end=local_end,
                     next_cursors=next_cursors, **buckets)


# Register D06 endpoints explicitly on the already-mounted planning router. Keeping the structural
# implementation in its own module avoids a second task model while making route exposure obvious.
router.add_api_route(
    "/v1/tasks/{task_id}/planning-structure",
    read_task_planning_structure,
    methods=["GET"],
    response_model=TaskPlanningProfileRead,
)
router.add_api_route(
    "/v1/tasks/{task_id}/planning-structure",
    update_task_planning_structure,
    methods=["PATCH"],
    response_model=TaskPlanningProfileRead,
)
router.add_api_route(
    "/v1/projects/{project_id}/task-dependencies",
    list_task_dependencies,
    methods=["GET"],
    response_model=list[TaskDependencyRead],
)
router.add_api_route(
    "/v1/projects/{project_id}/task-dependencies",
    create_task_dependency,
    methods=["POST"],
    response_model=TaskDependencyRead,
    status_code=201,
)
router.add_api_route(
    "/v1/task-dependencies/{dependency_id}",
    delete_task_dependency,
    methods=["DELETE"],
    status_code=204,
)
router.add_api_route(
    "/v1/projects/{project_id}/planning/tasks",
    list_project_planning_tasks,
    methods=["GET"],
    response_model=list[PlanningTaskRead],
)
router.add_api_route(
    "/v1/projects/{project_id}/planning/critical-path",
    read_project_critical_path,
    methods=["GET"],
    response_model=CriticalPathRead,
)
router.add_api_route(
    "/v1/projects/{project_id}/planning/replan/preview",
    preview_project_replan,
    methods=["POST"],
    response_model=ReplanPreviewRead,
)
router.add_api_route(
    "/v1/projects/{project_id}/planning/replan/apply",
    apply_project_replan,
    methods=["POST"],
    response_model=ReplanApplyRead,
)
