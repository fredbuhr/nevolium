from __future__ import annotations

import uuid
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, require_nevolium_user
from .db import get_session
from .events import append_audit, enqueue_domain_event
from .models import Task, WorkflowExecution
from .pagination import PageCursor, PageLimit, page_rows
from .planning_models import TaskDependency, TaskPlanningProfile
from .planning_structure_schemas import (
    TaskDependencyCreate,
    TaskDependencyRead,
    TaskPlanningProfileRead,
    TaskPlanningStructureUpdate,
)
from .project_access import get_owned_project, get_owned_task

router = APIRouter()


async def _serialize_project_planning(session: AsyncSession, project_id: uuid.UUID) -> None:
    """Serialize structural graph edits inside one project.

    PostgreSQL advisory transaction locks keep concurrent hierarchy/dependency edits from each
    observing an incomplete graph and jointly creating a cycle. The lock is released with the
    transaction and never grants authority outside normal owner checks.
    """

    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:scope, 0))"),
        {"scope": f"nevolium:planning:{project_id}"},
    )


async def _ensure_profile_locked(
    session: AsyncSession,
    task_id: uuid.UUID,
) -> TaskPlanningProfile:
    await session.execute(
        pg_insert(TaskPlanningProfile)
        .values(task_id=task_id)
        .on_conflict_do_nothing(index_elements=[TaskPlanningProfile.task_id])
    )
    profile = await session.scalar(
        select(TaskPlanningProfile)
        .where(TaskPlanningProfile.task_id == task_id)
        .with_for_update()
    )
    if profile is None:
        raise RuntimeError("Task planning profile could not be initialized")
    return profile


async def _hierarchy_reaches(
    session: AsyncSession,
    *,
    start_task_id: uuid.UUID,
    target_task_id: uuid.UUID,
) -> bool:
    result = await session.scalar(
        text(
            """
            WITH RECURSIVE ancestors(task_id) AS (
                SELECT parent_task_id
                FROM task_planning_profiles
                WHERE task_id = :start_task_id AND parent_task_id IS NOT NULL
                UNION
                SELECT profile.parent_task_id
                FROM task_planning_profiles AS profile
                JOIN ancestors ON profile.task_id = ancestors.task_id
                WHERE profile.parent_task_id IS NOT NULL
            )
            SELECT EXISTS (
                SELECT 1 FROM ancestors WHERE task_id = :target_task_id
            )
            """
        ),
        {"start_task_id": start_task_id, "target_task_id": target_task_id},
    )
    return bool(result)


async def _dependency_reaches(
    session: AsyncSession,
    *,
    start_task_id: uuid.UUID,
    target_task_id: uuid.UUID,
) -> bool:
    result = await session.scalar(
        text(
            """
            WITH RECURSIVE reachable(task_id) AS (
                SELECT successor_task_id
                FROM task_dependencies
                WHERE predecessor_task_id = :start_task_id
                UNION
                SELECT dependency.successor_task_id
                FROM task_dependencies AS dependency
                JOIN reachable ON dependency.predecessor_task_id = reachable.task_id
            )
            SELECT EXISTS (
                SELECT 1 FROM reachable WHERE task_id = :target_task_id
            )
            """
        ),
        {"start_task_id": start_task_id, "target_task_id": target_task_id},
    )
    return bool(result)


@router.get(
    "/v1/tasks/{task_id}/planning-structure",
    response_model=TaskPlanningProfileRead,
)
async def read_task_planning_structure(
    task_id: uuid.UUID,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> TaskPlanningProfileRead | TaskPlanningProfile:
    task = await get_owned_task(session, task_id, principal)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    profile = await session.get(TaskPlanningProfile, task.id)
    if profile is None:
        return TaskPlanningProfileRead(task_id=task.id)
    return profile


@router.patch(
    "/v1/tasks/{task_id}/planning-structure",
    response_model=TaskPlanningProfileRead,
)
async def update_task_planning_structure(
    task_id: uuid.UUID,
    body: TaskPlanningStructureUpdate,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> TaskPlanningProfile:
    task = await get_owned_task(session, task_id, principal)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    await _serialize_project_planning(session, task.project_id)
    profile = await _ensure_profile_locked(session, task.id)
    if profile.planning_version != body.expected_version:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Planning structure changed since it was loaded",
                "current_version": profile.planning_version,
            },
        )

    changes = body.model_dump(exclude_unset=True, exclude={"expected_version"})
    changed_fields: list[str] = []

    if "parent_task_id" in changes:
        parent_id = changes["parent_task_id"]
        if parent_id is not None:
            if parent_id == task.id:
                raise HTTPException(status_code=422, detail="A task cannot be its own parent")
            parent = await get_owned_task(session, parent_id, principal)
            if parent is None or parent.project_id != task.project_id:
                raise HTTPException(status_code=404, detail="Parent task not found")
            if await _hierarchy_reaches(
                session,
                start_task_id=parent.id,
                target_task_id=task.id,
            ):
                raise HTTPException(status_code=409, detail="Task hierarchy would contain a cycle")
        if profile.parent_task_id != parent_id:
            profile.parent_task_id = parent_id
            changed_fields.append("parent_task_id")

    if "kind" in changes and changes["kind"] != profile.kind:
        if (
            changes["kind"] == "milestone"
            and task.planned_start_at is not None
            and task.planned_end_at is not None
            and task.planned_start_at != task.planned_end_at
        ):
            raise HTTPException(
                status_code=422,
                detail="A milestone cannot have a non-zero planned duration",
            )
        profile.kind = changes["kind"]
        changed_fields.append("kind")

    if "progress_percent" in changes and changes["progress_percent"] != profile.progress_percent:
        workflow_execution = await session.scalar(
            select(WorkflowExecution.id).where(WorkflowExecution.task_id == task.id).limit(1)
        )
        if workflow_execution is not None:
            raise HTTPException(
                status_code=409,
                detail="Workflow-managed Task progress cannot be changed manually",
            )
        profile.progress_percent = changes["progress_percent"]
        changed_fields.append("progress_percent")

    next_rule = changes.get("recurrence_rule", profile.recurrence_rule)
    next_timezone = changes.get("recurrence_timezone", profile.recurrence_timezone)
    if "recurrence_rule" in changes and next_rule is None and "recurrence_timezone" not in changes:
        next_timezone = None
    if next_timezone is not None and next_rule is None:
        raise HTTPException(status_code=422, detail="recurrence_timezone requires recurrence_rule")
    if next_timezone is not None:
        try:
            ZoneInfo(next_timezone)
        except ZoneInfoNotFoundError as exc:
            raise HTTPException(status_code=422, detail="Unknown recurrence IANA timezone") from exc
    if "recurrence_rule" in changes and next_rule != profile.recurrence_rule:
        profile.recurrence_rule = next_rule
        changed_fields.append("recurrence_rule")
    if next_timezone != profile.recurrence_timezone:
        profile.recurrence_timezone = next_timezone
        changed_fields.append("recurrence_timezone")

    if not changed_fields:
        return profile

    profile.planning_version += 1
    correlation_id = uuid.uuid4()
    payload = {
        "task_id": str(task.id),
        "project_id": str(task.project_id),
        "planning_version": profile.planning_version,
        "changed_fields": sorted(changed_fields),
    }
    await session.flush()
    await enqueue_domain_event(
        session,
        event_type="task.planning_structure.updated",
        aggregate_type="task",
        aggregate_id=task.id,
        correlation_id=correlation_id,
        payload=payload,
    )
    await append_audit(
        session,
        actor_type="user",
        actor_id=principal.subject,
        action="task.planning_structure.update",
        resource_type="task",
        resource_id=str(task.id),
        authority_level=min(task.authority_ceiling, 1),
        correlation_id=correlation_id,
        request_json=body.model_dump(mode="json", exclude_unset=True),
        result_json=payload,
    )
    await session.commit()
    await session.refresh(profile)
    return profile


@router.get(
    "/v1/projects/{project_id}/task-dependencies",
    response_model=list[TaskDependencyRead],
)
async def list_task_dependencies(
    project_id: uuid.UUID,
    response: Response,
    limit: PageLimit = 100,
    cursor: PageCursor = None,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> list[TaskDependency]:
    project = await get_owned_project(session, project_id, principal)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    statement = (
        select(TaskDependency)
        .join(Task, Task.id == TaskDependency.predecessor_task_id)
        .where(Task.project_id == project.id)
    )
    return await page_rows(
        session,
        statement,
        TaskDependency,
        limit=limit,
        cursor=cursor,
        response=response,
    )


@router.post(
    "/v1/projects/{project_id}/task-dependencies",
    response_model=TaskDependencyRead,
    status_code=201,
)
async def create_task_dependency(
    project_id: uuid.UUID,
    body: TaskDependencyCreate,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> TaskDependency:
    project = await get_owned_project(session, project_id, principal)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    predecessor = await get_owned_task(session, body.predecessor_task_id, principal)
    successor = await get_owned_task(session, body.successor_task_id, principal)
    if (
        predecessor is None
        or successor is None
        or predecessor.project_id != project.id
        or successor.project_id != project.id
    ):
        raise HTTPException(status_code=404, detail="Task dependency endpoint not found")

    await _serialize_project_planning(session, project.id)
    existing = await session.scalar(
        select(TaskDependency).where(
            TaskDependency.predecessor_task_id == predecessor.id,
            TaskDependency.successor_task_id == successor.id,
        )
    )
    if existing is not None:
        if (
            existing.dependency_type == body.dependency_type
            and existing.lag_seconds == body.lag_seconds
        ):
            return existing
        raise HTTPException(status_code=409, detail="Task dependency already exists")

    if await _dependency_reaches(
        session,
        start_task_id=successor.id,
        target_task_id=predecessor.id,
    ):
        raise HTTPException(status_code=409, detail="Task dependency would contain a cycle")

    dependency = TaskDependency(
        predecessor_task_id=predecessor.id,
        successor_task_id=successor.id,
        dependency_type=body.dependency_type,
        lag_seconds=body.lag_seconds,
    )
    session.add(dependency)
    correlation_id = uuid.uuid4()
    await session.flush()
    payload = {
        "dependency_id": str(dependency.id),
        "project_id": str(project.id),
        "predecessor_task_id": str(predecessor.id),
        "successor_task_id": str(successor.id),
        "dependency_type": dependency.dependency_type,
        "lag_seconds": dependency.lag_seconds,
    }
    await enqueue_domain_event(
        session,
        event_type="task.dependency.created",
        aggregate_type="task_dependency",
        aggregate_id=dependency.id,
        correlation_id=correlation_id,
        payload=payload,
    )
    await append_audit(
        session,
        actor_type="user",
        actor_id=principal.subject,
        action="task.dependency.create",
        resource_type="task_dependency",
        resource_id=str(dependency.id),
        authority_level=1,
        correlation_id=correlation_id,
        request_json=body.model_dump(mode="json"),
        result_json=payload,
    )
    await session.commit()
    await session.refresh(dependency)
    return dependency


@router.delete("/v1/task-dependencies/{dependency_id}", status_code=204)
async def delete_task_dependency(
    dependency_id: uuid.UUID,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    dependency = await session.get(TaskDependency, dependency_id)
    if dependency is None:
        raise HTTPException(status_code=404, detail="Task dependency not found")
    predecessor = await get_owned_task(session, dependency.predecessor_task_id, principal)
    successor = await get_owned_task(session, dependency.successor_task_id, principal)
    if predecessor is None or successor is None or predecessor.project_id != successor.project_id:
        raise HTTPException(status_code=404, detail="Task dependency not found")

    await _serialize_project_planning(session, predecessor.project_id)
    correlation_id = uuid.uuid4()
    payload = {
        "dependency_id": str(dependency.id),
        "project_id": str(predecessor.project_id),
        "predecessor_task_id": str(dependency.predecessor_task_id),
        "successor_task_id": str(dependency.successor_task_id),
    }
    await session.execute(delete(TaskDependency).where(TaskDependency.id == dependency.id))
    await enqueue_domain_event(
        session,
        event_type="task.dependency.deleted",
        aggregate_type="task_dependency",
        aggregate_id=dependency.id,
        correlation_id=correlation_id,
        payload=payload,
    )
    await append_audit(
        session,
        actor_type="user",
        actor_id=principal.subject,
        action="task.dependency.delete",
        resource_type="task_dependency",
        resource_id=str(dependency.id),
        authority_level=1,
        correlation_id=correlation_id,
        result_json=payload,
    )
    await session.commit()
    return Response(status_code=204)
