from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .planning_recurrence import parse_recurrence_rule


TaskPlanningKind = Literal["task", "milestone"]
DependencyType = Literal["FS", "SS", "FF", "SF"]


class TaskPlanningProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: uuid.UUID
    parent_task_id: uuid.UUID | None = None
    kind: TaskPlanningKind = "task"
    progress_percent: int = 0
    planning_version: int = 1
    recurrence_rule: str | None = None
    recurrence_timezone: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TaskPlanningStructureUpdate(BaseModel):
    expected_version: int = Field(ge=1)
    parent_task_id: uuid.UUID | None = None
    kind: TaskPlanningKind | None = None
    progress_percent: int | None = Field(default=None, ge=0, le=100)
    recurrence_rule: str | None = Field(default=None, min_length=1, max_length=4000)
    recurrence_timezone: str | None = Field(default=None, min_length=1, max_length=120)

    @field_validator("recurrence_rule")
    @classmethod
    def validate_supported_recurrence_rule(cls, value: str | None) -> str | None:
        if value is not None:
            parse_recurrence_rule(value)
        return value

    @model_validator(mode="after")
    def recurrence_timezone_requires_rule_when_both_are_supplied(
        self,
    ) -> "TaskPlanningStructureUpdate":
        supplied = self.model_fields_set
        if (
            "recurrence_timezone" in supplied
            and self.recurrence_timezone is not None
            and "recurrence_rule" in supplied
            and self.recurrence_rule is None
        ):
            raise ValueError("recurrence_timezone requires recurrence_rule")
        return self


class TaskDependencyCreate(BaseModel):
    predecessor_task_id: uuid.UUID
    successor_task_id: uuid.UUID
    dependency_type: DependencyType = "FS"
    lag_seconds: int = Field(default=0, ge=0, le=31_536_000)

    @model_validator(mode="after")
    def reject_self_dependency(self) -> "TaskDependencyCreate":
        if self.predecessor_task_id == self.successor_task_id:
            raise ValueError("A task cannot depend on itself")
        return self


class TaskDependencyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    predecessor_task_id: uuid.UUID
    successor_task_id: uuid.UUID
    dependency_type: DependencyType
    lag_seconds: int
    created_at: datetime
