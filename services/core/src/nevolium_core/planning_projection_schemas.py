from __future__ import annotations

import uuid
from typing import Literal

from .schemas import TaskRead


class PlanningTaskRead(TaskRead):
    parent_task_id: uuid.UUID | None = None
    kind: Literal["task", "milestone"] = "task"
    progress_percent: int = 0
    planning_version: int = 1
    recurrence_rule: str | None = None
    recurrence_timezone: str | None = None
