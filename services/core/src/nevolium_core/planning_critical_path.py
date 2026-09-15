from __future__ import annotations

import uuid

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from .auth import Principal, require_nevolium_user
from .db import get_session
from .models import Task
from .planning_critical_path_schemas import CriticalPathRead, CriticalPathTaskRead
from .planning_engine import PlanningEdge, PlanningNode, critical_path
from .planning_models import TaskDependency, TaskPlanningProfile
from .project_access import get_owned_project

MAX_CRITICAL_PATH_TASKS = 1000
MAX_CRITICAL_PATH_DEPENDENCIES = 5000


async def read_project_critical_path(
    project_id: uuid.UUID,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> CriticalPathRead:
    project = await get_owned_project(session, project_id, principal)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    task_rows = list(
        (
            await session.execute(
                select(Task, TaskPlanningProfile)
                .outerjoin(TaskPlanningProfile, TaskPlanningProfile.task_id == Task.id)
                .where(Task.project_id == project.id)
                .order_by(Task.id)
                .limit(MAX_CRITICAL_PATH_TASKS + 1)
            )
        ).all()
    )
    if len(task_rows) > MAX_CRITICAL_PATH_TASKS:
        raise HTTPException(
            status_code=422,
            detail=f"Critical path analysis is limited to {MAX_CRITICAL_PATH_TASKS} project tasks",
        )

    predecessor = aliased(Task)
    successor = aliased(Task)
    dependencies = list(
        (
            await session.execute(
                select(TaskDependency)
                .join(predecessor, predecessor.id == TaskDependency.predecessor_task_id)
                .join(successor, successor.id == TaskDependency.successor_task_id)
                .where(
                    predecessor.project_id == project.id,
                    successor.project_id == project.id,
                )
                .order_by(TaskDependency.id)
                .limit(MAX_CRITICAL_PATH_DEPENDENCIES + 1)
            )
        ).scalars()
    )
    if len(dependencies) > MAX_CRITICAL_PATH_DEPENDENCIES:
        raise HTTPException(
            status_code=422,
            detail=(
                "Critical path analysis is limited to "
                f"{MAX_CRITICAL_PATH_DEPENDENCIES} project dependencies"
            ),
        )

    nodes: list[PlanningNode] = []
    eligible_ids: set[uuid.UUID] = set()
    excluded_task_ids: list[uuid.UUID] = []
    for task, profile in task_rows:
        kind = profile.kind if profile is not None else "task"
        start = task.planned_start_at
        end = task.planned_end_at
        duration_seconds: int | None = None
        if kind == "milestone":
            if start is not None and (end is None or end == start):
                duration_seconds = 0
        elif start is not None and end is not None and end >= start:
            duration_seconds = int((end - start).total_seconds())

        if duration_seconds is None:
            excluded_task_ids.append(task.id)
            continue
        nodes.append(PlanningNode(task_id=task.id, duration_seconds=duration_seconds))
        eligible_ids.add(task.id)

    edges: list[PlanningEdge] = []
    excluded_dependency_ids: list[uuid.UUID] = []
    for dependency in dependencies:
        if (
            dependency.predecessor_task_id not in eligible_ids
            or dependency.successor_task_id not in eligible_ids
        ):
            excluded_dependency_ids.append(dependency.id)
            continue
        edges.append(
            PlanningEdge(
                dependency_id=dependency.id,
                predecessor_task_id=dependency.predecessor_task_id,
                successor_task_id=dependency.successor_task_id,
                dependency_type=dependency.dependency_type,
                lag_seconds=dependency.lag_seconds,
            )
        )

    try:
        result = critical_path(nodes, edges)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return CriticalPathRead(
        project_id=project.id,
        network_complete=not excluded_dependency_ids,
        project_duration_seconds=result.project_duration_seconds,
        project_task_count=len(task_rows),
        eligible_task_count=len(nodes),
        dependency_count=len(dependencies),
        critical_task_ids=list(result.critical_task_ids),
        critical_dependency_ids=list(result.critical_dependency_ids),
        excluded_task_ids=excluded_task_ids,
        excluded_dependency_ids=excluded_dependency_ids,
        tasks=[
            CriticalPathTaskRead(
                task_id=item.task_id,
                earliest_start_seconds=item.earliest_start_seconds,
                earliest_finish_seconds=item.earliest_finish_seconds,
                latest_start_seconds=item.latest_start_seconds,
                latest_finish_seconds=item.latest_finish_seconds,
                slack_seconds=item.slack_seconds,
                critical=item.critical,
            )
            for item in result.tasks
        ],
    )
