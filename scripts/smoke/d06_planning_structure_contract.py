#!/usr/bin/env python3
"""Static/domain proof for D06 canonical planning structure and dependency routes."""

from __future__ import annotations

from pathlib import Path
import uuid

from pydantic import ValidationError

from nevolium_core.planning import router
from nevolium_core.planning_models import TaskDependency, TaskPlanningProfile
from nevolium_core.planning_structure_schemas import TaskDependencyCreate

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    profile_columns = set(TaskPlanningProfile.__table__.columns.keys())
    assert {
        "task_id",
        "parent_task_id",
        "kind",
        "progress_percent",
        "planning_version",
        "recurrence_rule",
        "recurrence_timezone",
    } <= profile_columns
    profile_constraints = {constraint.name for constraint in TaskPlanningProfile.__table__.constraints}
    assert "ck_task_planning_parent_not_self" in profile_constraints
    assert "ck_task_planning_kind" in profile_constraints
    assert "ck_task_planning_progress" in profile_constraints
    assert "ck_task_planning_version_positive" in profile_constraints

    dependency_columns = set(TaskDependency.__table__.columns.keys())
    assert {
        "id",
        "predecessor_task_id",
        "successor_task_id",
        "dependency_type",
        "lag_seconds",
    } <= dependency_columns
    dependency_constraints = {constraint.name for constraint in TaskDependency.__table__.constraints}
    assert "ck_task_dependencies_not_self" in dependency_constraints
    assert "ck_task_dependencies_type" in dependency_constraints
    assert "uq_task_dependencies_pair" in dependency_constraints

    task_id = uuid.uuid4()
    try:
        TaskDependencyCreate(predecessor_task_id=task_id, successor_task_id=task_id)
    except ValidationError:
        pass
    else:
        raise AssertionError("self-dependency passed public schema validation")

    route_contract = {
        (route.path, method)
        for route in router.routes
        for method in getattr(route, "methods", set())
    }
    expected_routes = {
        ("/v1/tasks/{task_id}/planning-structure", "GET"),
        ("/v1/tasks/{task_id}/planning-structure", "PATCH"),
        ("/v1/projects/{project_id}/task-dependencies", "GET"),
        ("/v1/projects/{project_id}/task-dependencies", "POST"),
        ("/v1/task-dependencies/{dependency_id}", "DELETE"),
    }
    assert expected_routes <= route_contract, route_contract

    migration = (
        ROOT / "services/core/migrations/versions/0016_planning_structure.py"
    ).read_text(encoding="utf-8")
    assert 'revision = "0016_planning_structure"' in migration
    assert 'down_revision = "0015_model_configurations"' in migration
    assert '"task_planning_profiles"' in migration
    assert '"task_dependencies"' in migration

    implementation = (
        ROOT / "services/core/src/nevolium_core/planning_structure.py"
    ).read_text(encoding="utf-8")
    assert "pg_advisory_xact_lock" in implementation
    assert implementation.count("WITH RECURSIVE") >= 2
    assert "get_owned_project" in implementation
    assert "get_owned_task" in implementation
    assert "planning_version != body.expected_version" in implementation
    assert "page_rows(" in implementation
    assert "Workflow-managed Task progress cannot be changed manually" in implementation

    print(
        "D06 PLANNING STRUCTURE PASS: canonical hierarchy/milestone/progress/recurrence metadata, "
        "owner-scoped paginated dependencies, optimistic conflict detection and cycle guards are wired"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
