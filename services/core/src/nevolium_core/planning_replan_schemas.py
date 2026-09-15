from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class PlanningWindowRead(BaseModel):
    planned_start_at: datetime | None = None
    planned_end_at: datetime | None = None
    due_at: datetime | None = None


class ReplanTaskPatch(BaseModel):
    task_id: uuid.UUID
    expected_version: int = Field(ge=1)
    planned_start_at: datetime | None = None
    planned_end_at: datetime | None = None
    due_at: datetime | None = None

    @field_validator("planned_start_at", "planned_end_at", "due_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("planning timestamps must include a timezone offset")
        return value

    @model_validator(mode="after")
    def require_planning_change(self) -> "ReplanTaskPatch":
        changed = self.model_fields_set & {"planned_start_at", "planned_end_at", "due_at"}
        if not changed:
            raise ValueError("replanning patch must include at least one planning timestamp")
        if (
            "planned_start_at" in self.model_fields_set
            and "planned_end_at" in self.model_fields_set
            and self.planned_start_at is not None
            and self.planned_end_at is not None
            and self.planned_end_at < self.planned_start_at
        ):
            raise ValueError("planned_end_at must be on or after planned_start_at")
        return self


class ReplanRequest(BaseModel):
    updates: list[ReplanTaskPatch] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def unique_task_ids(self) -> "ReplanRequest":
        task_ids = [item.task_id for item in self.updates]
        if len(set(task_ids)) != len(task_ids):
            raise ValueError("replanning request contains duplicate task IDs")
        return self


class ReplanApplyRequest(ReplanRequest):
    preview_digest: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")


class ReplanTaskPreview(BaseModel):
    task_id: uuid.UUID
    current_version: int = Field(ge=1)
    expected_version: int = Field(ge=1)
    current: PlanningWindowRead
    proposed: PlanningWindowRead
    changed_fields: list[Literal["planned_start_at", "planned_end_at", "due_at"]]


class ReplanDependencyFinding(BaseModel):
    dependency_id: uuid.UUID
    predecessor_task_id: uuid.UUID
    successor_task_id: uuid.UUID
    dependency_type: Literal["FS", "SS", "FF", "SF"]
    lag_seconds: int = Field(ge=0)
    status: Literal["satisfied", "incomplete", "violated"]
    detail: str


class ReplanPreviewRead(BaseModel):
    project_id: uuid.UUID
    preview_digest: str
    can_apply: bool
    changed_task_count: int = Field(ge=0)
    changes: list[ReplanTaskPreview]
    dependency_findings: list[ReplanDependencyFinding] = Field(default_factory=list)


class ReplanAppliedTaskRead(BaseModel):
    task_id: uuid.UUID
    planning_version: int = Field(ge=1)
    changed_fields: list[Literal["planned_start_at", "planned_end_at", "due_at"]]


class ReplanApplyRead(BaseModel):
    project_id: uuid.UUID
    preview_digest: str
    updated: list[ReplanAppliedTaskRead]
