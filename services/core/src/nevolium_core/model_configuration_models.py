from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base
from .models import uuid_pk


class ModelConfiguration(Base):
    """Server-owned, immutable LiteLLM deployment selected for new Nevolium Tasks.

    Provider credentials deliberately do not exist in this table. They are sent once to LiteLLM's
    authenticated management boundary and remain encrypted in LiteLLM's own database.
    """

    __tablename__ = "model_configurations"

    id: Mapped[uuid.UUID] = uuid_pk()
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model_name: Mapped[str] = mapped_column(String(240), nullable=False)
    model_alias: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    litellm_model_id: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="testing")
    created_by_subject: Mapped[str] = mapped_column(String(320), nullable=False)
    test_task_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    test_estimated_cost_usd: Mapped[Decimal] = mapped_column(
        Numeric(12, 6), nullable=False
    )
    provider_model: Mapped[str | None] = mapped_column(String(240))
    failure_code: Mapped[str | None] = mapped_column(String(80))
    tested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint(
            "provider IN ('openai', 'anthropic', 'xai', 'moonshot')",
            name="ck_model_configurations_provider",
        ),
        CheckConstraint(
            "status IN ('testing', 'verified', 'active', 'retired', 'failed')",
            name="ck_model_configurations_status",
        ),
        Index("ix_model_configurations_status_created", "status", "created_at"),
        Index(
            "uq_model_configurations_single_active",
            "status",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )
