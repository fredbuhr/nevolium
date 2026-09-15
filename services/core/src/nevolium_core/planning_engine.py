from __future__ import annotations

import heapq
import uuid
from dataclasses import dataclass
from typing import Literal

DependencyKind = Literal["FS", "SS", "FF", "SF"]


@dataclass(frozen=True, slots=True)
class PlanningNode:
    task_id: uuid.UUID
    duration_seconds: int


@dataclass(frozen=True, slots=True)
class PlanningEdge:
    dependency_id: uuid.UUID
    predecessor_task_id: uuid.UUID
    successor_task_id: uuid.UUID
    dependency_type: DependencyKind
    lag_seconds: int


@dataclass(frozen=True, slots=True)
class CriticalPathNode:
    task_id: uuid.UUID
    earliest_start_seconds: int
    earliest_finish_seconds: int
    latest_start_seconds: int
    latest_finish_seconds: int
    slack_seconds: int
    critical: bool


@dataclass(frozen=True, slots=True)
class CriticalPathResult:
    project_duration_seconds: int
    tasks: tuple[CriticalPathNode, ...]
    critical_task_ids: tuple[uuid.UUID, ...]
    critical_dependency_ids: tuple[uuid.UUID, ...]


def _constraint_weight(
    edge: PlanningEdge,
    durations: dict[uuid.UUID, int],
) -> int:
    predecessor_duration = durations[edge.predecessor_task_id]
    successor_duration = durations[edge.successor_task_id]
    if edge.dependency_type == "FS":
        return predecessor_duration + edge.lag_seconds
    if edge.dependency_type == "SS":
        return edge.lag_seconds
    if edge.dependency_type == "FF":
        return predecessor_duration - successor_duration + edge.lag_seconds
    if edge.dependency_type == "SF":
        return -successor_duration + edge.lag_seconds
    raise ValueError(f"unsupported dependency type: {edge.dependency_type}")


def critical_path(
    nodes: list[PlanningNode],
    edges: list[PlanningEdge],
) -> CriticalPathResult:
    """Compute a deterministic elapsed-time CPM solution on a dependency DAG.

    Each dependency becomes a lower-bound constraint on successor start time. This supports
    finish-to-start, start-to-start, finish-to-finish and start-to-finish links without delegating
    scheduling semantics to the Gantt renderer. All offsets are relative to a project origin of zero.
    """

    durations: dict[uuid.UUID, int] = {}
    for node in nodes:
        if node.task_id in durations:
            raise ValueError("duplicate planning node")
        if node.duration_seconds < 0:
            raise ValueError("task duration cannot be negative")
        durations[node.task_id] = node.duration_seconds

    if not durations:
        return CriticalPathResult(0, (), (), ())

    outgoing: dict[uuid.UUID, list[PlanningEdge]] = {task_id: [] for task_id in durations}
    indegree: dict[uuid.UUID, int] = {task_id: 0 for task_id in durations}
    for edge in edges:
        if edge.predecessor_task_id not in durations or edge.successor_task_id not in durations:
            raise ValueError("dependency endpoint is outside the planning node set")
        if edge.predecessor_task_id == edge.successor_task_id:
            raise ValueError("self dependency")
        if edge.lag_seconds < 0:
            raise ValueError("dependency lag cannot be negative")
        outgoing[edge.predecessor_task_id].append(edge)
        indegree[edge.successor_task_id] += 1

    for edge_list in outgoing.values():
        edge_list.sort(key=lambda edge: (str(edge.successor_task_id), str(edge.dependency_id)))

    ready: list[tuple[str, uuid.UUID]] = [
        (str(task_id), task_id) for task_id, degree in indegree.items() if degree == 0
    ]
    heapq.heapify(ready)
    order: list[uuid.UUID] = []
    while ready:
        _sort_key, task_id = heapq.heappop(ready)
        order.append(task_id)
        for edge in outgoing[task_id]:
            successor_id = edge.successor_task_id
            indegree[successor_id] -= 1
            if indegree[successor_id] == 0:
                heapq.heappush(ready, (str(successor_id), successor_id))

    if len(order) != len(durations):
        raise ValueError("planning dependency graph contains a cycle")

    earliest_start = {task_id: 0 for task_id in durations}
    for task_id in order:
        for edge in outgoing[task_id]:
            candidate = earliest_start[task_id] + _constraint_weight(edge, durations)
            earliest_start[edge.successor_task_id] = max(
                earliest_start[edge.successor_task_id],
                candidate,
            )

    earliest_finish = {
        task_id: earliest_start[task_id] + durations[task_id] for task_id in durations
    }
    project_duration = max(earliest_finish.values(), default=0)

    latest_start = {
        task_id: project_duration - durations[task_id] for task_id in durations
    }
    for task_id in reversed(order):
        for edge in outgoing[task_id]:
            candidate = latest_start[edge.successor_task_id] - _constraint_weight(edge, durations)
            latest_start[task_id] = min(latest_start[task_id], candidate)

    results: list[CriticalPathNode] = []
    critical_ids: list[uuid.UUID] = []
    for task_id in order:
        slack = latest_start[task_id] - earliest_start[task_id]
        if slack < 0:
            raise ValueError("planning constraints produced negative slack")
        is_critical = slack == 0
        if is_critical:
            critical_ids.append(task_id)
        results.append(
            CriticalPathNode(
                task_id=task_id,
                earliest_start_seconds=earliest_start[task_id],
                earliest_finish_seconds=earliest_finish[task_id],
                latest_start_seconds=latest_start[task_id],
                latest_finish_seconds=latest_start[task_id] + durations[task_id],
                slack_seconds=slack,
                critical=is_critical,
            )
        )

    critical_set = set(critical_ids)
    critical_dependency_ids: list[uuid.UUID] = []
    for task_id in order:
        for edge in outgoing[task_id]:
            if task_id not in critical_set or edge.successor_task_id not in critical_set:
                continue
            if (
                earliest_start[edge.successor_task_id]
                == earliest_start[task_id] + _constraint_weight(edge, durations)
            ):
                critical_dependency_ids.append(edge.dependency_id)

    return CriticalPathResult(
        project_duration_seconds=project_duration,
        tasks=tuple(results),
        critical_task_ids=tuple(critical_ids),
        critical_dependency_ids=tuple(critical_dependency_ids),
    )
