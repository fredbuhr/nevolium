from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, require_nevolium_user
from .db import get_session
from .document_models import Document, DocumentAssetLink, DocumentChunk, DocumentCitation, DocumentVersion
from .events import append_audit, enqueue_domain_event
from .models import Asset
from .project_access import get_owned_project

AUTHORED_PARSER = "nevolium-authored"
MAX_AUTHORED_TEXT_CHARS = 1_000_000
MAX_AUTHORED_JSON_BYTES = 2_000_000
MAX_CITATIONS_PER_VERSION = 100
MAX_ASSET_LINKS_PER_DOCUMENT = 200
SEARCH_CHUNK_CHARS = 12_000

KnowledgeKind = Literal["note", "idea", "decision"]
EpistemicStatus = Literal["hypothesis", "supported", "contested", "verified"]
AssetLinkRole = Literal["attachment", "whiteboard"]


class CitationCreate(BaseModel):
    source_document_id: uuid.UUID | None = None
    source_document_version_id: uuid.UUID | None = None
    source_chunk_id: uuid.UUID | None = None
    source_url: str | None = Field(default=None, max_length=2048)
    label: str | None = Field(default=None, max_length=320)
    excerpt: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def validate_source(self) -> "CitationCreate":
        if (self.source_document_id is None) == (self.source_url is None):
            raise ValueError("citation requires exactly one document or URL source")
        if self.source_document_version_id is not None and self.source_document_id is None:
            raise ValueError("citation version requires a source document")
        if self.source_chunk_id is not None and self.source_document_version_id is None:
            raise ValueError("citation chunk requires a source document version")
        if self.source_url is not None:
            normalized = self.source_url.strip()
            if not normalized.startswith(("https://", "http://")):
                raise ValueError("citation URL must use http or https")
            self.source_url = normalized
        return self


class AuthoredKnowledgeCreate(BaseModel):
    project_id: uuid.UUID
    title: str = Field(min_length=1, max_length=320)
    kind: KnowledgeKind = "note"
    epistemic_status: EpistemicStatus | None = None
    content_json: dict[str, Any] = Field(default_factory=dict)
    content_text: str = Field(default="", max_length=MAX_AUTHORED_TEXT_CHARS)
    citations: list[CitationCreate] = Field(default_factory=list, max_length=MAX_CITATIONS_PER_VERSION)


class AuthoredKnowledgeVersionCreate(BaseModel):
    expected_generation: int = Field(ge=1)
    content_json: dict[str, Any] = Field(default_factory=dict)
    content_text: str = Field(default="", max_length=MAX_AUTHORED_TEXT_CHARS)
    citations: list[CitationCreate] = Field(default_factory=list, max_length=MAX_CITATIONS_PER_VERSION)


class AuthoredKnowledgeRestore(BaseModel):
    expected_generation: int = Field(ge=1)


class DocumentMetadataUpdate(BaseModel):
    expected_generation: int = Field(ge=1)
    title: str | None = Field(default=None, min_length=1, max_length=320)
    kind: KnowledgeKind | None = None
    epistemic_status: EpistemicStatus | None = None

    @model_validator(mode="after")
    def require_change(self) -> "DocumentMetadataUpdate":
        if not ({"title", "kind", "epistemic_status"} & self.model_fields_set):
            raise ValueError("at least one metadata field is required")
        return self


class DocumentCitationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_version_id: uuid.UUID
    source_document_id: uuid.UUID | None
    source_document_version_id: uuid.UUID | None
    source_chunk_id: uuid.UUID | None
    source_url: str | None
    label: str | None
    excerpt: str | None
    created_at: datetime


class DocumentAssetLinkCreate(BaseModel):
    asset_id: uuid.UUID
    role: AssetLinkRole
    label: str | None = Field(default=None, max_length=320)
    ordinal: int = Field(default=0, ge=0)


class DocumentAssetLinkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    asset_id: uuid.UUID
    role: str
    label: str | None
    ordinal: int
    created_at: datetime


class AuthoredKnowledgeVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    generation: int
    parser: str
    status: str
    chunk_count: int
    content_json: dict[str, Any] | None
    content_text: str | None
    content_sha256: str | None
    search_status: str
    search_error: str | None
    metadata_json: dict[str, Any]
    created_at: datetime
    completed_at: datetime | None


class AuthoredKnowledgeRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    kind: str
    epistemic_status: str | None
    status: str
    generation: int
    version: AuthoredKnowledgeVersionRead


def _canonical_content(content_json: dict[str, Any], content_text: str) -> tuple[str, str]:
    normalized_text = content_text.replace("\r\n", "\n").replace("\r", "\n")
    payload = json.dumps(content_json, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    if len(payload.encode("utf-8")) > MAX_AUTHORED_JSON_BYTES:
        raise HTTPException(status_code=422, detail="Rich document content is too large")
    digest = hashlib.sha256(f"{payload}\n{normalized_text}".encode("utf-8")).hexdigest()
    return normalized_text, digest


def _chunk_id(version_id: uuid.UUID, ordinal: int) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, f"nevolium:authored-chunk:{version_id}:{ordinal}")


def _text_chunks(value: str) -> list[str]:
    text = value.strip()
    if not text:
        return []
    return [text[start : start + SEARCH_CHUNK_CHARS] for start in range(0, len(text), SEARCH_CHUNK_CHARS)]


async def _owned_document(
    session: AsyncSession,
    document_id: uuid.UUID,
    principal: Principal,
    *,
    lock: bool = False,
) -> Document:
    statement = select(Document).where(
        Document.id == document_id,
        Document.metadata_json["owner_subject"].astext == principal.subject,
    )
    if lock:
        statement = statement.with_for_update()
    document = await session.scalar(statement)
    if document is None or await get_owned_project(session, document.project_id, principal) is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


async def _latest_generation(session: AsyncSession, document_id: uuid.UUID) -> int:
    return int(
        await session.scalar(
            select(func.max(DocumentVersion.generation)).where(DocumentVersion.document_id == document_id)
        )
        or 0
    )


async def _validate_citation(
    session: AsyncSession,
    citation: CitationCreate,
    principal: Principal,
) -> None:
    if citation.source_document_id is None:
        return
    source = await _owned_document(session, citation.source_document_id, principal)
    if citation.source_document_version_id is None:
        return
    source_version = await session.scalar(
        select(DocumentVersion).where(
            DocumentVersion.id == citation.source_document_version_id,
            DocumentVersion.document_id == source.id,
        )
    )
    if source_version is None:
        raise HTTPException(status_code=422, detail="Citation source version does not belong to source document")
    if citation.source_chunk_id is None:
        return
    source_chunk = await session.scalar(
        select(DocumentChunk).where(
            DocumentChunk.id == citation.source_chunk_id,
            DocumentChunk.document_version_id == source_version.id,
        )
    )
    if source_chunk is None:
        raise HTTPException(status_code=422, detail="Citation source chunk does not belong to source version")


async def _add_citations(
    session: AsyncSession,
    version_id: uuid.UUID,
    citations: list[CitationCreate],
    principal: Principal,
) -> None:
    for citation in citations:
        await _validate_citation(session, citation, principal)
        session.add(
            DocumentCitation(
                document_version_id=version_id,
                source_document_id=citation.source_document_id,
                source_document_version_id=citation.source_document_version_id,
                source_chunk_id=citation.source_chunk_id,
                source_url=citation.source_url,
                label=citation.label,
                excerpt=citation.excerpt,
            )
        )


async def _citation_inputs(session: AsyncSession, version_id: uuid.UUID) -> list[CitationCreate]:
    rows = list(
        (
            await session.execute(
                select(DocumentCitation)
                .where(DocumentCitation.document_version_id == version_id)
                .order_by(DocumentCitation.created_at, DocumentCitation.id)
                .limit(MAX_CITATIONS_PER_VERSION)
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


async def _create_version(
    session: AsyncSession,
    document: Document,
    generation: int,
    content_json: dict[str, Any],
    content_text: str,
    citations: list[CitationCreate],
    principal: Principal,
    *,
    restored_from: uuid.UUID | None = None,
) -> DocumentVersion:
    normalized_text, digest = _canonical_content(content_json, content_text)
    metadata: dict[str, Any] = {
        "authored": True,
        "title": document.title,
        "kind": document.kind,
        "epistemic_status": document.epistemic_status,
    }
    if restored_from is not None:
        metadata["restored_from_version_id"] = str(restored_from)

    chunks = _text_chunks(normalized_text)
    version = DocumentVersion(
        document_id=document.id,
        generation=generation,
        parser=AUTHORED_PARSER,
        parser_version="1",
        source_sha256=None,
        status="completed",
        chunk_count=len(chunks),
        content_json=content_json,
        content_text=normalized_text,
        content_sha256=digest,
        search_status="ready",
        search_error=None,
        metadata_json=metadata,
        completed_at=datetime.now(UTC),
    )
    session.add(version)
    await session.flush()

    for ordinal, chunk_text in enumerate(chunks):
        session.add(
            DocumentChunk(
                id=_chunk_id(version.id, ordinal),
                document_version_id=version.id,
                ordinal=ordinal,
                text=chunk_text,
                content_sha256=hashlib.sha256(chunk_text.encode("utf-8")).hexdigest(),
                metadata_json={"projection": "authored-text"},
            )
        )
    await _add_citations(session, version.id, citations, principal)
    document.status = "ready"
    await session.flush()
    return version


async def _emit_version_event(
    session: AsyncSession,
    document: Document,
    version: DocumentVersion,
    principal: Principal,
    *,
    event_type: str,
    action: str,
    extra: dict[str, Any] | None = None,
) -> None:
    correlation_id = uuid.uuid4()
    payload = {
        "document_id": str(document.id),
        "document_version_id": str(version.id),
        "generation": version.generation,
        "kind": document.kind,
        **(extra or {}),
    }
    await enqueue_domain_event(
        session,
        event_type=event_type,
        aggregate_type="document",
        aggregate_id=document.id,
        correlation_id=correlation_id,
        payload=payload,
    )
    await append_audit(
        session,
        actor_type="user",
        actor_id=principal.subject,
        action=action,
        resource_type="document",
        resource_id=str(document.id),
        authority_level=1,
        correlation_id=correlation_id,
        request_json=payload,
    )


def _read(document: Document, version: DocumentVersion) -> AuthoredKnowledgeRead:
    return AuthoredKnowledgeRead(
        id=document.id,
        project_id=document.project_id,
        title=document.title,
        kind=document.kind,
        epistemic_status=document.epistemic_status,
        status=document.status,
        generation=version.generation,
        version=AuthoredKnowledgeVersionRead.model_validate(version),
    )


async def create_authored_knowledge(
    body: AuthoredKnowledgeCreate,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> AuthoredKnowledgeRead:
    if await get_owned_project(session, body.project_id, principal) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    document = Document(
        asset_id=None,
        project_id=body.project_id,
        title=body.title.strip(),
        media_type="application/vnd.nevolium.knowledge+json",
        source_sha256=None,
        status="ready",
        kind=body.kind,
        epistemic_status=body.epistemic_status,
        metadata_json={"owner_subject": principal.subject, "authored": True},
    )
    session.add(document)
    await session.flush()
    version = await _create_version(
        session,
        document,
        1,
        body.content_json,
        body.content_text,
        body.citations,
        principal,
    )
    await _emit_version_event(
        session,
        document,
        version,
        principal,
        event_type="knowledge.created",
        action="knowledge.create",
    )
    await session.commit()
    return _read(document, version)


async def create_authored_version(
    document_id: uuid.UUID,
    body: AuthoredKnowledgeVersionCreate,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> AuthoredKnowledgeRead:
    document = await _owned_document(session, document_id, principal, lock=True)
    if document.kind == "source" or document.asset_id is not None:
        raise HTTPException(status_code=409, detail="Imported source documents are not edited through authored versions")
    latest = await _latest_generation(session, document.id)
    if latest != body.expected_generation:
        raise HTTPException(status_code=409, detail="Document generation changed; reload before saving")
    version = await _create_version(
        session,
        document,
        latest + 1,
        body.content_json,
        body.content_text,
        body.citations,
        principal,
    )
    await _emit_version_event(
        session,
        document,
        version,
        principal,
        event_type="knowledge.version.created",
        action="knowledge.version.create",
    )
    await session.commit()
    return _read(document, version)


async def restore_authored_version(
    document_id: uuid.UUID,
    version_id: uuid.UUID,
    body: AuthoredKnowledgeRestore,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> AuthoredKnowledgeRead:
    document = await _owned_document(session, document_id, principal, lock=True)
    if document.kind == "source" or document.asset_id is not None:
        raise HTTPException(status_code=409, detail="Imported source documents cannot be restored as authored versions")
    latest = await _latest_generation(session, document.id)
    if latest != body.expected_generation:
        raise HTTPException(status_code=409, detail="Document generation changed; reload before restoring")
    source = await session.scalar(
        select(DocumentVersion).where(
            DocumentVersion.id == version_id,
            DocumentVersion.document_id == document.id,
            DocumentVersion.parser == AUTHORED_PARSER,
            DocumentVersion.status == "completed",
        )
    )
    if source is None or source.content_json is None:
        raise HTTPException(status_code=404, detail="Restorable authored version not found")
    citations = await _citation_inputs(session, source.id)
    version = await _create_version(
        session,
        document,
        latest + 1,
        dict(source.content_json),
        source.content_text or "",
        citations,
        principal,
        restored_from=source.id,
    )
    await _emit_version_event(
        session,
        document,
        version,
        principal,
        event_type="knowledge.version.restored",
        action="knowledge.version.restore",
        extra={"restored_from_version_id": str(source.id)},
    )
    await session.commit()
    return _read(document, version)


async def update_authored_metadata(
    document_id: uuid.UUID,
    body: DocumentMetadataUpdate,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> AuthoredKnowledgeRead:
    document = await _owned_document(session, document_id, principal, lock=True)
    if document.kind == "source" or document.asset_id is not None:
        raise HTTPException(status_code=409, detail="Imported source metadata is managed by the document ingestion surface")
    latest = await _latest_generation(session, document.id)
    if latest != body.expected_generation:
        raise HTTPException(status_code=409, detail="Document generation changed; reload before editing metadata")
    source = await session.scalar(
        select(DocumentVersion).where(
            DocumentVersion.document_id == document.id,
            DocumentVersion.generation == latest,
            DocumentVersion.parser == AUTHORED_PARSER,
            DocumentVersion.status == "completed",
        )
    )
    if source is None or source.content_json is None:
        raise HTTPException(status_code=409, detail="Latest authored version is unavailable")
    citations = await _citation_inputs(session, source.id)
    changed_fields: list[str] = []
    if body.title is not None and body.title.strip() != document.title:
        document.title = body.title.strip()
        changed_fields.append("title")
    if body.kind is not None and body.kind != document.kind:
        document.kind = body.kind
        changed_fields.append("kind")
    if "epistemic_status" in body.model_fields_set and body.epistemic_status != document.epistemic_status:
        document.epistemic_status = body.epistemic_status
        changed_fields.append("epistemic_status")
    if not changed_fields:
        raise HTTPException(status_code=422, detail="Metadata update does not change the document")
    version = await _create_version(
        session,
        document,
        latest + 1,
        dict(source.content_json),
        source.content_text or "",
        citations,
        principal,
    )
    await _emit_version_event(
        session,
        document,
        version,
        principal,
        event_type="knowledge.metadata.updated",
        action="knowledge.metadata.update",
        extra={"changed_fields": changed_fields},
    )
    await session.commit()
    return _read(document, version)


async def list_version_citations(
    version_id: uuid.UUID,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> list[DocumentCitationRead]:
    version = await session.get(DocumentVersion, version_id)
    if version is None:
        raise HTTPException(status_code=404, detail="Document version not found")
    await _owned_document(session, version.document_id, principal)
    rows = list(
        (
            await session.execute(
                select(DocumentCitation)
                .where(DocumentCitation.document_version_id == version.id)
                .order_by(DocumentCitation.created_at, DocumentCitation.id)
                .limit(MAX_CITATIONS_PER_VERSION)
            )
        ).scalars()
    )
    return [DocumentCitationRead.model_validate(row) for row in rows]


async def create_document_asset_link(
    document_id: uuid.UUID,
    body: DocumentAssetLinkCreate,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> DocumentAssetLinkRead:
    document = await _owned_document(session, document_id, principal, lock=True)
    asset = await session.get(Asset, body.asset_id)
    if asset is None or str((asset.metadata_json or {}).get("owner_subject") or "") != principal.subject:
        raise HTTPException(status_code=404, detail="Asset not found")
    count = int(
        await session.scalar(
            select(func.count()).select_from(DocumentAssetLink).where(DocumentAssetLink.document_id == document.id)
        )
        or 0
    )
    if count >= MAX_ASSET_LINKS_PER_DOCUMENT:
        raise HTTPException(status_code=422, detail="Document asset-link limit reached")
    existing = await session.scalar(
        select(DocumentAssetLink).where(
            DocumentAssetLink.document_id == document.id,
            DocumentAssetLink.asset_id == asset.id,
            DocumentAssetLink.role == body.role,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Asset is already linked with this role")
    link = DocumentAssetLink(
        document_id=document.id,
        asset_id=asset.id,
        role=body.role,
        label=body.label,
        ordinal=body.ordinal,
    )
    session.add(link)
    await session.flush()
    correlation_id = uuid.uuid4()
    await enqueue_domain_event(
        session,
        event_type="knowledge.asset.linked",
        aggregate_type="document",
        aggregate_id=document.id,
        correlation_id=correlation_id,
        payload={"document_id": str(document.id), "asset_id": str(asset.id), "role": body.role},
    )
    await append_audit(
        session,
        actor_type="user",
        actor_id=principal.subject,
        action="knowledge.asset.link",
        resource_type="document",
        resource_id=str(document.id),
        authority_level=1,
        correlation_id=correlation_id,
        request_json={"asset_id": str(asset.id), "role": body.role},
    )
    await session.commit()
    return DocumentAssetLinkRead.model_validate(link)


async def list_document_asset_links(
    document_id: uuid.UUID,
    role: AssetLinkRole | None = Query(default=None),
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> list[DocumentAssetLinkRead]:
    document = await _owned_document(session, document_id, principal)
    statement = select(DocumentAssetLink).where(DocumentAssetLink.document_id == document.id)
    if role is not None:
        statement = statement.where(DocumentAssetLink.role == role)
    rows = list(
        (
            await session.execute(
                statement.order_by(DocumentAssetLink.ordinal, DocumentAssetLink.created_at, DocumentAssetLink.id)
                .limit(MAX_ASSET_LINKS_PER_DOCUMENT)
            )
        ).scalars()
    )
    return [DocumentAssetLinkRead.model_validate(row) for row in rows]
