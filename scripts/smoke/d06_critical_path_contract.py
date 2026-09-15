#!/usr/bin/env python3
"""Deterministic domain proof for the D06 elapsed-time critical path engine."""

from __future__ import annotations

import uuid

from nevolium_core.planning_engine import PlanningEdge, PlanningNode, critical_path


def uid(value: int) -> uuid.UUID:
    return uuid.UUID(int=value)


def edge(
    identity: int,
    predecessor: int,
    successor: int,
    dependency_type: str,
    lag_seconds: int = 0,
) -> PlanningEdge:
    return PlanningEdge(
        dependency_id=uid(identity),
        predecessor_task_id=uid(predecessor),
        successor_task_id=uid(successor),
        dependency_type=dependency_type,  # type: ignore[arg-type]
        lag_seconds=lag_seconds,
    )


def task_map(result):
    return {task.task_id: task for task in result.tasks}


def main() -> int:
    fs = critical_path(
        [PlanningNode(uid(1), 10), PlanningNode(uid(2), 5), PlanningNode(uid(3), 3)],
        [edge(101, 1, 2, "FS")],
    )
    fs_tasks = task_map(fs)
    assert fs.project_duration_seconds == 15
    assert fs.critical_task_ids == (uid(1), uid(2))
    assert fs.critical_dependency_ids == (uid(101),)
    assert fs_tasks[uid(1)].slack_seconds == 0
    assert fs_tasks[uid(2)].earliest_start_seconds == 10
    assert fs_tasks[uid(3)].slack_seconds == 12

    ss = critical_path(
        [PlanningNode(uid(1), 10), PlanningNode(uid(2), 5)],
        [edge(102, 1, 2, "SS", 2)],
    )
    ss_tasks = task_map(ss)
    assert ss.project_duration_seconds == 10
    assert ss_tasks[uid(2)].earliest_start_seconds == 2
    assert ss_tasks[uid(2)].slack_seconds == 3
    assert ss.critical_task_ids == (uid(1),)

    ff = critical_path(
        [PlanningNode(uid(1), 10), PlanningNode(uid(2), 5)],
        [edge(103, 1, 2, "FF")],
    )
    ff_tasks = task_map(ff)
    assert ff.project_duration_seconds == 10
    assert ff_tasks[uid(2)].earliest_start_seconds == 5
    assert ff.critical_task_ids == (uid(1), uid(2))
    assert ff.critical_dependency_ids == (uid(103),)

    sf = critical_path(
        [PlanningNode(uid(1), 10), PlanningNode(uid(2), 5)],
        [edge(104, 1, 2, "SF", 15)],
    )
    sf_tasks = task_map(sf)
    assert sf.project_duration_seconds == 15
    assert sf_tasks[uid(2)].earliest_start_seconds == 10
    assert sf.critical_task_ids == (uid(1), uid(2))
    assert sf.critical_dependency_ids == (uid(104),)

    try:
        critical_path(
            [PlanningNode(uid(1), 1), PlanningNode(uid(2), 1)],
            [edge(105, 1, 2, "FS"), edge(106, 2, 1, "FS")],
        )
    except ValueError as exc:
        assert "cycle" in str(exc).lower()
    else:
        raise AssertionError("cyclic dependency graph passed critical path analysis")

    empty = critical_path([], [])
    assert empty.project_duration_seconds == 0
    assert empty.tasks == ()

    print(
        "D06 CRITICAL PATH PASS: FS/SS/FF/SF constraints, lag, slack, deterministic critical "
        "tasks/links, isolated work and cycle rejection are computed by Nevolium Core"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
