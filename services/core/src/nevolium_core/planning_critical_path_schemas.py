from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, Field


class CriticalPathTaskRead(BaseModel):
    task_id: uuid.UUID
    earliest_start_seconds: int = Field(ge=0)
    earliest_finish_seconds: int = Field(ge=0)
    latest_start_seconds: int = Field(ge=0)
    latest_finish_seconds: int = Field(ge=0)
    slack_seconds: int = Field(ge=0)
    critical: bool


class CriticalPathRead(BaseModel):
    project_id: uuid.UUID
    basis: Literal["working_seconds"] = "working_seconds"
    work_calendar_timezone: str
    work_calendar_version: int = Field(ge=1)
    network_complete: bool
    project_duration_seconds: int = Field(ge=0)
    project_task_count: int = Field(ge=0)
    eligible_task_count: int = Field(ge=0)
    dependency_count: int = Field(ge=0)
    critical_task_ids: list[uuid.UUID] = Field(default_factory=list)
    critical_dependency_ids: list[uuid.UUID] = Field(default_factory=list)
    excluded_task_ids: list[uuid.UUID] = Field(default_factory=list)
    excluded_dependency_ids: list[uuid.UUID] = Field(default_factory=list)
    tasks: list[CriticalPathTaskRead] = Field(default_factory=list)
