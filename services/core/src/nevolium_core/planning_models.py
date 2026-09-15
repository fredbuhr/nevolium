from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class TaskPlanningProfile(Base):
    __tablename__ = "task_planning_profiles"

    task_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )
    parent_task_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL")
    )
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default="task", server_default="task")
    progress_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    planning_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    recurrence_rule: Mapped[str | None] = mapped_column(Text)
    recurrence_timezone: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("ix_task_planning_parent", "parent_task_id", "task_id"),
        Index("ix_task_planning_kind", "kind", "task_id"),
        CheckConstraint(
            "parent_task_id IS NULL OR parent_task_id <> task_id",
            name="ck_task_planning_parent_not_self",
        ),
        CheckConstraint("kind IN ('task', 'milestone')", name="ck_task_planning_kind"),
        CheckConstraint(
            "progress_percent >= 0 AND progress_percent <= 100",
            name="ck_task_planning_progress",
        ),
        CheckConstraint("planning_version >= 1", name="ck_task_planning_version_positive"),
        CheckConstraint(
            "recurrence_timezone IS NULL OR recurrence_rule IS NOT NULL",
            name="ck_task_planning_recurrence_timezone_requires_rule",
        ),
    )


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    predecessor_task_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    successor_task_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    dependency_type: Mapped[str] = mapped_column(String(2), nullable=False, default="FS", server_default="FS")
    lag_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        Index("ix_task_dependencies_predecessor", "predecessor_task_id", "successor_task_id"),
        Index("ix_task_dependencies_successor", "successor_task_id", "predecessor_task_id"),
        CheckConstraint(
            "predecessor_task_id <> successor_task_id",
            name="ck_task_dependencies_not_self",
        ),
        CheckConstraint(
            "dependency_type IN ('FS', 'SS', 'FF', 'SF')",
            name="ck_task_dependencies_type",
        ),
        CheckConstraint("lag_seconds >= 0", name="ck_task_dependencies_lag_nonnegative"),
        UniqueConstraint(
            "predecessor_task_id",
            "successor_task_id",
            name="uq_task_dependencies_pair",
        ),
    )
