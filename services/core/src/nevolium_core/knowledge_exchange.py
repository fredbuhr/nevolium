from __future__ import annotations

import json
import re
import uuid
from typing import Any, Literal

from fastapi import Depends, HTTPException, Query
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, require_nevolium_user
from .db import get_session
from .document_models import DocumentCitation, DocumentVersion
from .editable_knowledge import (
    AUTHORED_PARSER,
    MAX_AUTHORED_TEXT_CHARS,
    AuthoredKnowledgeCreate,
    AuthoredKnowledgeRead,
    CitationCreate,
    EpistemicStatus,
    KnowledgeKind,
    _latest_generation,
    _owned_document,
    create_authored_knowledge,
)

ExchangeFormat = Literal["nevolium-json", "markdown", "plain"]
PORTABLE_FORMAT_VERSION = 1
MAX_EXCHANGE_PAYLOAD_CHARS = 2_000_000


class PortableKnowledgeDocument(BaseModel):
    format_version: Literal[1] = 1
    title: str = Field(min_length=1, max_length=320)
    kind: KnowledgeKind = "note"
    epistemic_status: EpistemicStatus | None = None
    content_json: dict[str, Any] = Field(default_factory=dict)
    content_text: str = Field(default="", max_length=MAX_AUTHORED_TEXT_CHARS)
    citations: list[CitationCreate] = Field(default_factory=list, max_length=100)


class KnowledgeImportRequest(BaseModel):
    project_id: uuid.UUID
    format: ExchangeFormat
    payload: str = Field(max_length=MAX_EXCHANGE_PAYLOAD_CHARS)
    title: str | None = Field(default=None, min_length=1, max_length=320)
    kind: KnowledgeKind = "note"
    epistemic_status: EpistemicStatus | None = None


class KnowledgeExchangeRead(BaseModel):
    format: ExchangeFormat
    media_type: str
    filename: str
    lossless: bool
    content: str


def _safe_filename(title: str, suffix: str) -> str:
    stem = re.sub(r"[^\w.-]+", "-", title.strip(), flags=re.UNICODE).strip("-.")
    return f"{(stem or 'nevolium-knowledge')[:120]}{suffix}"


async def _latest_authored_version(
    session: AsyncSession,
    document_id: uuid.UUID,
) -> DocumentVersion:
    generation = await _latest_generation(session, document_id)
    version = await session.scalar(
        select(DocumentVersion).where(
            DocumentVersion.document_id == document_id,
            DocumentVersion.generation == generation,
            DocumentVersion.parser == AUTHORED_PARSER,
            DocumentVersion.status == "completed",
        )
    )
    if version is None or version.content_json is None:
        raise HTTPException(status_code=409, detail="Latest authored version is unavailable")
    return version


async def _portable_citations(
    session: AsyncSession,
    version_id: uuid.UUID,
) -> list[CitationCreate]:
    rows = list(
        (
            await session.execute(
                select(DocumentCitation)
                .where(DocumentCitation.document_version_id == version_id)
                .order_by(DocumentCitation.created_at, DocumentCitation.id)
                .limit(100)
            )
        ).scalars()
    )
    return [
        CitationCreate(
            source_document_id=row.source_document_id,
            source_document_version_id=row.source_document_version_id,
            source_chunk_id=row.source_chunk_id,
            source_url=row.source_url,
            label=row.label,
            excerpt=row.excerpt,
        )
        for row in rows
    ]


async def import_knowledge(
    body: KnowledgeImportRequest,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> AuthoredKnowledgeRead:
    if body.format == "nevolium-json":
        try:
            raw = json.loads(body.payload)
            portable = PortableKnowledgeDocument.model_validate(raw)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise HTTPException(status_code=422, detail="Invalid Nevolium knowledge JSON") from exc
        title = body.title.strip() if body.title else portable.title
        return await create_authored_knowledge(
            AuthoredKnowledgeCreate(
                project_id=body.project_id,
                title=title,
                kind=portable.kind,
                epistemic_status=portable.epistemic_status,
                content_json=portable.content_json,
                content_text=portable.content_text,
                citations=portable.citations,
            ),
            principal,
            session,
        )

    if len(body.payload) > MAX_AUTHORED_TEXT_CHARS:
        raise HTTPException(status_code=422, detail="Imported text is too large")
    title = (body.title or "Imported knowledge").strip()
    return await create_authored_knowledge(
        AuthoredKnowledgeCreate(
            project_id=body.project_id,
            title=title,
            kind=body.kind,
            epistemic_status=body.epistemic_status,
            content_json={"exchange_format": body.format, "source_text": body.payload},
            content_text=body.payload,
        ),
        principal,
        session,
    )


async def export_knowledge(
    document_id: uuid.UUID,
    format: ExchangeFormat = Query(default="nevolium-json"),
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> KnowledgeExchangeRead:
    document = await _owned_document(session, document_id, principal)
    if document.kind == "source" or document.asset_id is not None:
        raise HTTPException(status_code=409, detail="Imported source documents use their canonical Asset")
    version = await _latest_authored_version(session, document.id)

    if format == "nevolium-json":
        portable = PortableKnowledgeDocument(
            format_version=PORTABLE_FORMAT_VERSION,
            title=document.title,
            kind=document.kind,
            epistemic_status=document.epistemic_status,
            content_json=dict(version.content_json or {}),
            content_text=version.content_text or "",
            citations=await _portable_citations(session, version.id),
        )
        return KnowledgeExchangeRead(
            format=format,
            media_type="application/vnd.nevolium.knowledge+json",
            filename=_safe_filename(document.title, ".nevolium.json"),
            lossless=True,
            content=portable.model_dump_json(indent=2),
        )

    if format == "markdown":
        content = f"# {document.title}\n\n{version.content_text or ''}".rstrip() + "\n"
        return KnowledgeExchangeRead(
            format=format,
            media_type="text/markdown; charset=utf-8",
            filename=_safe_filename(document.title, ".md"),
            lossless=False,
            content=content,
        )

    return KnowledgeExchangeRead(
        format=format,
        media_type="text/plain; charset=utf-8",
        filename=_safe_filename(document.title, ".txt"),
        lossless=False,
        content=version.content_text or "",
    )
