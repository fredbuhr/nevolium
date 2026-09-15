from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, require_nevolium_user
from .db import get_session
from .events import append_audit, enqueue_domain_event
from .models import Task
from .planning_models import ProjectWorkCalendar, TaskDependency, TaskPlanningProfile
from .planning_replan_schemas import (
    PlanningWindowRead,
    ReplanAppliedTaskRead,
    ReplanApplyRead,
    ReplanApplyRequest,
    ReplanDependencyFinding,
    ReplanPreviewRead,
    ReplanRequest,
    ReplanTaskPatch,
    ReplanTaskPreview,
)
from .planning_structure import _ensure_profile_locked, _serialize_project_planning
from .planning_work_calendar import WorkCalendarDefinition, add_working_seconds, build_work_calendar
from .planning_work_calendar_schemas import ProjectWorkCalendarRead
from .project_access import get_owned_project


@dataclass(slots=True)
class _PreviewState:
    preview: ReplanPreviewRead
    tasks: dict[uuid.UUID, Task]
    profiles: dict[uuid.UUID, TaskPlanningProfile | None]


def _utc_iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(UTC).isoformat()


def _window(task: Task) -> PlanningWindowRead:
    return PlanningWindowRead(
        planned_start_at=task.planned_start_at,
        planned_end_at=task.planned_end_at,
        due_at=task.due_at,
    )


def _proposed_window(task: Task, patch: ReplanTaskPatch) -> PlanningWindowRead:
    values = {
        "planned_start_at": task.planned_start_at,
        "planned_end_at": task.planned_end_at,
        "due_at": task.due_at,
    }
    for field in ("planned_start_at", "planned_end_at", "due_at"):
        if field in patch.model_fields_set:
            values[field] = getattr(patch, field)
    return PlanningWindowRead(**values)


def _changed_fields(current: PlanningWindowRead, proposed: PlanningWindowRead) -> list[str]:
    return [
        field
        for field in ("planned_start_at", "planned_end_at", "due_at")
        if getattr(current, field) != getattr(proposed, field)
    ]


def _validate_window(window: PlanningWindowRead, *, milestone: bool) -> None:
    if window.planned_end_at is not None and window.planned_start_at is None:
        raise HTTPException(status_code=422, detail="planned_end_at requires planned_start_at")
    if (
        window.planned_start_at is not None
        and window.planned_end_at is not None
        and window.planned_end_at < window.planned_start_at
    ):
        raise HTTPException(
            status_code=422,
            detail="planned_end_at must be on or after planned_start_at",
        )
    if (
        milestone
        and window.planned_start_at is not None
        and window.planned_end_at is not None
        and window.planned_start_at != window.planned_end_at
    ):
        raise HTTPException(
            status_code=422,
            detail="A milestone cannot have a non-zero planned duration",
        )


def _dependency_finding(
    dependency: TaskDependency,
    predecessor: PlanningWindowRead,
    successor: PlanningWindowRead,
    work_calendar: WorkCalendarDefinition,
) -> ReplanDependencyFinding:
    kind = dependency.dependency_type
    if kind == "FS":
        left = predecessor.planned_end_at
        right = successor.planned_start_at
        label = "predecessor finish + working lag <= successor start"
    elif kind == "SS":
        left = predecessor.planned_start_at
        right = successor.planned_start_at
        label = "predecessor start + working lag <= successor start"
    elif kind == "FF":
        left = predecessor.planned_end_at
        right = successor.planned_end_at
        label = "predecessor finish + working lag <= successor finish"
    elif kind == "SF":
        left = predecessor.planned_start_at
        right = successor.planned_end_at
        label = "predecessor start + working lag <= successor finish"
    else:  # The database constraint should make this unreachable.
        raise RuntimeError(f"Unsupported dependency type: {kind}")

    if left is None or right is None:
        status = "incomplete"
        detail = f"{kind} incomplete: {label} cannot be evaluated without both timestamps"
    else:
        try:
            required = add_working_seconds(left, dependency.lag_seconds, work_calendar)
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Dependency lag exceeds work-calendar capacity bound",
                    "dependency_id": str(dependency.id),
                },
            ) from exc
        if required <= right:
            status = "satisfied"
            detail = f"{kind} satisfied: {label}"
        else:
            status = "violated"
            detail = f"{kind} violated: {label}"

    return ReplanDependencyFinding(
        dependency_id=dependency.id,
        predecessor_task_id=dependency.predecessor_task_id,
        successor_task_id=dependency.successor_task_id,
        dependency_type=kind,
        lag_seconds=dependency.lag_seconds,
        status=status,
        detail=detail,
    )


def _preview_digest(
    *,
    project_id: uuid.UUID,
    changes: list[ReplanTaskPreview],
    findings: list[ReplanDependencyFinding],
    context_windows: dict[uuid.UUID, PlanningWindowRead],
    work_calendar_timezone: str,
    work_calendar_version: int,
) -> str:
    payload = {
        "project_id": str(project_id),
        "work_calendar": {
            "timezone": work_calendar_timezone,
            "version": work_calendar_version,
        },
        "changes": [
            {
                "task_id": str(change.task_id),
                "current_version": change.current_version,
                "expected_version": change.expected_version,
                "current": {
                    "start": _utc_iso(change.current.planned_start_at),
                    "end": _utc_iso(change.current.planned_end_at),
                    "due": _utc_iso(change.current.due_at),
                },
                "proposed": {
                    "start": _utc_iso(change.proposed.planned_start_at),
                    "end": _utc_iso(change.proposed.planned_end_at),
                    "due": _utc_iso(change.proposed.due_at),
                },
                "changed_fields": change.changed_fields,
            }
            for change in sorted(changes, key=lambda item: str(item.task_id))
        ],
        "dependencies": [
            {
                "dependency_id": str(item.dependency_id),
                "predecessor_task_id": str(item.predecessor_task_id),
                "successor_task_id": str(item.successor_task_id),
                "dependency_type": item.dependency_type,
                "lag_seconds": item.lag_seconds,
                "status": item.status,
            }
            for item in sorted(findings, key=lambda item: str(item.dependency_id))
        ],
        # Bind previews to unchanged dependency endpoints too. A concurrent schedule edit therefore
        # invalidates apply even if it came through an older path that did not carry expected_version.
        "context_windows": [
            {
                "task_id": str(task_id),
                "start": _utc_iso(window.planned_start_at),
                "end": _utc_iso(window.planned_end_at),
                "due": _utc_iso(window.due_at),
            }
            for task_id, window in sorted(context_windows.items(), key=lambda item: str(item[0]))
        ],
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


async def _build_preview(
    project_id: uuid.UUID,
    body: ReplanRequest,
    principal: Principal,
    session: AsyncSession,
    *,
    lock: bool,
) -> _PreviewState:
    project = await get_owned_project(session, project_id, principal)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    calendar_row = await session.get(ProjectWorkCalendar, project.id)
    try:
        calendar_view = (
            ProjectWorkCalendarRead.model_validate(calendar_row)
            if calendar_row is not None
            else ProjectWorkCalendarRead(project_id=project.id)
        )
        work_calendar = build_work_calendar(
            timezone_name=calendar_view.timezone,
            weekly_intervals=calendar_view.weekly_intervals,
            exceptions=calendar_view.exceptions,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail="Stored work calendar is invalid") from exc

    update_ids = [item.task_id for item in body.updates]
    statement = select(Task).where(Task.project_id == project.id, Task.id.in_(update_ids))
    if lock:
        statement = statement.with_for_update()
    tasks = {task.id: task for task in (await session.execute(statement)).scalars()}
    if len(tasks) != len(update_ids):
        raise HTTPException(status_code=404, detail="Replanning task not found")

    profiles: dict[uuid.UUID, TaskPlanningProfile | None] = {}
    if lock:
        for task_id in sorted(update_ids, key=str):
            profiles[task_id] = await _ensure_profile_locked(session, task_id)
    else:
        loaded_profiles = {
            profile.task_id: profile
            for profile in (
                await session.execute(
                    select(TaskPlanningProfile).where(TaskPlanningProfile.task_id.in_(update_ids))
                )
            ).scalars()
        }
        profiles = {task_id: loaded_profiles.get(task_id) for task_id in update_ids}

    patches = {item.task_id: item for item in body.updates}
    changes: list[ReplanTaskPreview] = []
    proposed_windows: dict[uuid.UUID, PlanningWindowRead] = {}
    for task_id in sorted(update_ids, key=str):
        task = tasks[task_id]
        patch = patches[task_id]
        profile = profiles[task_id]
        current_version = profile.planning_version if profile is not None else 1
        if current_version != patch.expected_version:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Planning changed since it was loaded",
                    "task_id": str(task_id),
                    "current_version": current_version,
                },
            )
        current = _window(task)
        proposed = _proposed_window(task, patch)
        _validate_window(proposed, milestone=(profile is not None and profile.kind == "milestone"))
        changed_fields = _changed_fields(current, proposed)
        proposed_windows[task_id] = proposed
        changes.append(
            ReplanTaskPreview(
                task_id=task_id,
                current_version=current_version,
                expected_version=patch.expected_version,
                current=current,
                proposed=proposed,
                changed_fields=changed_fields,
            )
        )

    dependencies = list(
        (
            await session.execute(
                select(TaskDependency)
                .where(
                    or_(
                        TaskDependency.predecessor_task_id.in_(update_ids),
                        TaskDependency.successor_task_id.in_(update_ids),
                    )
                )
                .order_by(TaskDependency.id)
            )
        ).scalars()
    )
    context_ids = set(update_ids)
    for dependency in dependencies:
        context_ids.add(dependency.predecessor_task_id)
        context_ids.add(dependency.successor_task_id)

    missing_context_ids = context_ids - set(tasks)
    if missing_context_ids:
        context_statement = select(Task).where(
            Task.project_id == project.id,
            Task.id.in_(missing_context_ids),
        )
        if lock:
            context_statement = context_statement.with_for_update()
        for task in (await session.execute(context_statement)).scalars():
            tasks[task.id] = task
    if context_ids - set(tasks):
        raise HTTPException(status_code=409, detail="Planning dependency endpoint is outside project")

    context_windows = {
        task_id: proposed_windows.get(task_id, _window(tasks[task_id])) for task_id in context_ids
    }
    findings = [
        _dependency_finding(
            dependency,
            context_windows[dependency.predecessor_task_id],
            context_windows[dependency.successor_task_id],
            work_calendar,
        )
        for dependency in dependencies
    ]
    digest = _preview_digest(
        project_id=project.id,
        changes=changes,
        findings=findings,
        context_windows=context_windows,
        work_calendar_timezone=calendar_view.timezone,
        work_calendar_version=calendar_view.calendar_version,
    )
    preview = ReplanPreviewRead(
        project_id=project.id,
        preview_digest=digest,
        can_apply=all(item.status != "violated" for item in findings),
        changed_task_count=sum(bool(item.changed_fields) for item in changes),
        changes=changes,
        dependency_findings=findings,
    )
    return _PreviewState(preview=preview, tasks=tasks, profiles=profiles)


async def preview_project_replan(
    project_id: uuid.UUID,
    body: ReplanRequest,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> ReplanPreviewRead:
    state = await _build_preview(project_id, body, principal, session, lock=False)
    return state.preview


async def apply_project_replan(
    project_id: uuid.UUID,
    body: ReplanApplyRequest,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> ReplanApplyRead:
    project = await get_owned_project(session, project_id, principal)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    await _serialize_project_planning(session, project.id)

    request = ReplanRequest(updates=body.updates)
    state = await _build_preview(project.id, request, principal, session, lock=True)
    if state.preview.preview_digest != body.preview_digest:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Replanning preview is stale; preview again before applying",
                "current_preview_digest": state.preview.preview_digest,
            },
        )
    if not state.preview.can_apply:
        raise HTTPException(
            status_code=409,
            detail="Replanning would violate one or more task dependencies",
        )

    preview_by_id = {item.task_id: item for item in state.preview.changes}
    updated: list[ReplanAppliedTaskRead] = []
    correlation_id = uuid.uuid4()
    for task_id in sorted(preview_by_id, key=str):
        change = preview_by_id[task_id]
        if not change.changed_fields:
            continue
        task = state.tasks[task_id]
        profile = state.profiles[task_id]
        if profile is None:  # lock=True guarantees profile materialization.
            raise RuntimeError("Replanning profile lock was not materialized")
        for field in change.changed_fields:
            setattr(task, field, getattr(change.proposed, field))
        profile.planning_version += 1
        payload = {
            "task_id": str(task.id),
            "project_id": str(project.id),
            "planning_version": profile.planning_version,
            "changed_fields": change.changed_fields,
            "replan_digest": body.preview_digest,
        }
        await enqueue_domain_event(
            session,
            event_type="task.replanned",
            aggregate_type="task",
            aggregate_id=task.id,
            correlation_id=correlation_id,
            payload=payload,
        )
        patch = next(item for item in body.updates if item.task_id == task_id)
        await append_audit(
            session,
            actor_type="user",
            actor_id=principal.subject,
            action="task.replan.apply",
            resource_type="task",
            resource_id=str(task.id),
            authority_level=min(task.authority_ceiling, 1),
            correlation_id=correlation_id,
            request_json=patch.model_dump(mode="json", exclude_unset=True),
            result_json=payload,
        )
        updated.append(
            ReplanAppliedTaskRead(
                task_id=task.id,
                planning_version=profile.planning_version,
                changed_fields=change.changed_fields,
            )
        )

    await session.commit()
    return ReplanApplyRead(
        project_id=project.id,
        preview_digest=body.preview_digest,
        updated=updated,
    )
