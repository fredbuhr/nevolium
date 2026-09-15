from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PlanningOccurrenceRead(BaseModel):
    id: uuid.UUID
    source_task_id: uuid.UUID
    project_id: uuid.UUID
    number: int = Field(ge=1)
    title: str
    status: str
    kind: Literal["task", "milestone"]
    timezone: str
    planning_version: int = Field(ge=1)
    start_at: datetime
    end_at: datetime | None = None
    due_at: datetime | None = None
    virtual: Literal[True] = True
