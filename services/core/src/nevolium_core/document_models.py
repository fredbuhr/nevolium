from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

DOCUMENTS_PROJECT_ID = uuid.UUID("a8da482d-fb63-52b5-a687-0f65d64b10ad")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("assets.id", ondelete="RESTRICT"), nullable=True, unique=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="RESTRICT"),
        nullable=False,
        server_default=text("'a8da482d-fb63-52b5-a687-0f65d64b10ad'::uuid"),
    )
    title: Mapped[str] = mapped_column(String(320), nullable=False)
    media_type: Mapped[str | None] = mapped_column(String(240))
    source_sha256: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    kind: Mapped[str] = mapped_column(String(32), nullable=False, default="source", server_default="source")
    epistemic_status: Mapped[str | None] = mapped_column(String(32))
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("ix_documents_project_status", "project_id", "status"),
        Index("ix_documents_project_kind", "project_id", "kind"),
        Index(
            "ix_documents_owner_page",
            metadata_json["owner_subject"].astext,
            "project_id",
            "created_at",
            "id",
        ),
        CheckConstraint(
            "kind IN ('source', 'note', 'idea', 'decision')",
            name="ck_documents_kind",
        ),
        CheckConstraint(
            "epistemic_status IS NULL OR "
            "epistemic_status IN ('hypothesis', 'supported', 'contested', 'verified')",
            name="ck_documents_epistemic_status",
        ),
    )


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    generation: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL")
    )
    parser: Mapped[str] = mapped_column(String(120), nullable=False, default="docling")
    parser_version: Mapped[str | None] = mapped_column(String(80))
    source_sha256: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="queued")
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    content_text: Mapped[str | None] = mapped_column(Text)
    content_sha256: Mapped[str | None] = mapped_column(String(64))
    search_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending", server_default="pending"
    )
    search_error: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    last_error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("document_id", "generation", name="uq_document_version_generation"),
        Index("ix_document_versions_document_status", "document_id", "status"),
        Index(
            "ix_document_versions_document_search",
            "document_id",
            "search_status",
            "generation",
        ),
        CheckConstraint(
            "search_status IN ('pending', 'ready', 'failed')",
            name="ck_document_versions_search_status",
        ),
        CheckConstraint(
            "content_sha256 IS NULL OR char_length(content_sha256) = 64",
            name="ck_document_versions_content_sha256",
        ),
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_version_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("document_versions.id", ondelete="CASCADE"), nullable=False
    )
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    content_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint("document_version_id", "ordinal", name="uq_document_chunk_ordinal"),
        Index("ix_document_chunks_version", "document_version_id", "ordinal"),
    )


class DocumentCitation(Base):
    __tablename__ = "document_citations"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_version_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("document_versions.id", ondelete="CASCADE"), nullable=False
    )
    source_document_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("documents.id", ondelete="RESTRICT")
    )
    source_document_version_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("document_versions.id", ondelete="RESTRICT")
    )
    source_chunk_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("document_chunks.id", ondelete="RESTRICT")
    )
    source_url: Mapped[str | None] = mapped_column(Text)
    label: Mapped[str | None] = mapped_column(String(320))
    excerpt: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("ix_document_citations_target", "document_version_id", "created_at", "id"),
        Index("ix_document_citations_source_document", "source_document_id"),
        CheckConstraint(
            "(source_document_id IS NOT NULL AND source_url IS NULL) OR "
            "(source_document_id IS NULL AND source_url IS NOT NULL)",
            name="ck_document_citations_one_source",
        ),
        CheckConstraint(
            "source_document_version_id IS NULL OR source_document_id IS NOT NULL",
            name="ck_document_citations_version_requires_document",
        ),
        CheckConstraint(
            "source_chunk_id IS NULL OR source_document_version_id IS NOT NULL",
            name="ck_document_citations_chunk_requires_version",
        ),
    )


class DocumentAssetLink(Base):
    __tablename__ = "document_asset_links"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str | None] = mapped_column(String(320))
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint("document_id", "asset_id", "role", name="uq_document_asset_link_role"),
        Index("ix_document_asset_links_document", "document_id", "ordinal", "id"),
        CheckConstraint(
            "role IN ('attachment', 'whiteboard')", name="ck_document_asset_links_role"
        ),
        CheckConstraint("ordinal >= 0", name="ck_document_asset_links_ordinal"),
    )
