"""Read one canonical neighbourhood. No new graph store, inferred links or writes."""
from __future__ import annotations

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import String, and_, cast, func, literal, or_, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, require_nevolium_user
from .autonomy_models import ApprovalRequest
from .command_models import Conversation, CommandRecord
from .db import get_session
from .document_models import Document, DocumentAssetLink, DocumentCitation, DocumentVersion
from .models import Artifact, Asset, Project, RelationshipRecord, Task, WorkflowExecution
from .pagination import decode_cursor, encode_cursor
from .planning_models import TaskDependency, TaskPlanningProfile
from .project_access import entity_belongs_to_principal, get_owned_project

router = APIRouter()
EntityType = Literal["project", "task", "document", "asset", "artifact", "conversation", "workflow_execution", "approval", "citation"]
MODELS = {"project": Project, "task": Task, "document": Document, "asset": Asset,
          "artifact": Artifact, "conversation": Conversation, "workflow_execution": WorkflowExecution,
          "approval": ApprovalRequest, "citation": DocumentCitation}
ALIASES = {"workflow": "workflow_execution", "execution": "workflow_execution", "approval_request": "approval"}


class BrowserNode(BaseModel):
    id: str
    entityType: EntityType
    entityId: uuid.UUID
    projectId: uuid.UUID | None = None
    label: str
    kind: str
    status: str
    summary: str = ""
    url: str | None = None
    mediaType: str | None = None
    citingGeneration: int | None = None
    sourceGeneration: int | None = None
    sourceVersionId: uuid.UUID | None = None
    sourceChunkId: uuid.UUID | None = None


class BrowserEdge(BaseModel):
    id: str
    source: str
    target: str
    relation: str
    directed: bool = True
    category: Literal["membership", "relationship", "provenance", "planning", "execution"]
    dependencyType: str | None = None
    lagSeconds: int | None = None


class BrowserPage(BaseModel):
    focus: str
    nodes: list[BrowserNode]
    edges: list[BrowserEdge]
    next_cursor: str | None = None


def normalized_type(value: str) -> str:
    normalized = value.strip().lower().replace("-", "_")
    return ALIASES.get(normalized, normalized)


async def read_node(session: AsyncSession, kind: str, identity: uuid.UUID,
                    principal: Principal, *, preview: bool = False) -> BrowserNode | None:
    kind = normalized_type(kind)
    if kind not in MODELS:
        return None
    if kind == "citation":
        row = await session.get(DocumentCitation, identity)
        version = await session.get(DocumentVersion, row.document_version_id) if row else None
        if not version or not await entity_belongs_to_principal(session, "document", version.document_id, principal):
            return None
        document = await session.get(Document, version.document_id)
        if not document or not await get_owned_project(session, document.project_id, principal):
            return None
        # A citation may outlive a source's ownership; never disclose its old label or excerpt.
        if row.source_document_id and not await read_node(session, "document", row.source_document_id, principal):
            return None
        source_version = await session.get(DocumentVersion, row.source_document_version_id) if row.source_document_version_id else None
        if source_version and source_version.document_id != row.source_document_id:
            return None
        url = row.source_url if row.source_url and row.source_url.startswith(("https://", "http://")) else None
        return BrowserNode(id=f"citation:{identity}", entityType="citation", entityId=identity,
                           projectId=document.project_id, label=row.label or url or "Citation",
                           kind="citation", status="ready", summary=(row.excerpt or "")[:1800], url=url,
                           sourceVersionId=row.source_document_version_id, sourceChunkId=row.source_chunk_id,
                           citingGeneration=version.generation, sourceGeneration=source_version.generation if source_version else None)
    if not await entity_belongs_to_principal(session, kind, identity, principal):
        return None
    row = await session.get(MODELS[kind], identity)
    if row is None:
        return None
    project_id = identity if kind == "project" else getattr(row, "project_id", None)
    if kind in {"workflow_execution", "approval"}:
        task = await session.get(Task, row.task_id)
        if task is None:
            return None
        project_id = task.project_id
    if project_id and not await get_owned_project(session, project_id, principal):
        return None
    metadata = getattr(row, "metadata_json", {}) or {}
    label = getattr(row, "name", None) or getattr(row, "title", None) or metadata.get("filename") or getattr(row, "action", None) or kind
    summary = getattr(row, "summary", None) or getattr(row, "description", None) or ""
    if preview and kind == "document":
        version = await session.scalar(select(DocumentVersion).where(DocumentVersion.document_id == identity)
                                       .order_by(DocumentVersion.generation.desc()).limit(1))
        summary = version.content_text or "" if version else ""
    return BrowserNode(id=f"{kind}:{identity}", entityType=kind, entityId=identity,
                       projectId=project_id, label=label, kind=getattr(row, "kind", kind),
                       status=getattr(row, "status", "ready"), summary=summary[:1800],
                       mediaType=getattr(row, "mime_type", None) or getattr(row, "media_type", None))


def edge_queries(kind: str, identity: uuid.UUID, subject: str):
    """Each SELECT is incident to the focus before paging; SQL never loads the global graph."""
    queries = []

    def add(prefix, model, source_kind, source_id, relation, target_kind, target_id, category,
            *, row_id=None, extra=None, from_clause=None):
        if kind not in {source_kind, target_kind}:
            return
        incident = []
        if kind == source_kind:
            incident.append(source_id == identity)
        if kind == target_kind:
            incident.append(target_id == identity)
        query = select(
            (literal(prefix + ":") + cast(row_id if row_id is not None else model.id, String)).label("key"),
            literal(source_kind).label("source_kind"), source_id.label("source_id"),
            (literal(relation) if isinstance(relation, str) else relation).label("relation"),
            literal(target_kind).label("target_kind"), target_id.label("target_id"),
            literal(category).label("category"),
        ).select_from(from_clause if from_clause is not None else model).where(
            or_(*incident), source_id.is_not(None), target_id.is_not(None))
        if extra is not None:
            query = query.where(extra)
        queries.append(query)

    add("project-parent", Project, "project", Project.parent_id, "contains", "project", Project.id, "membership")
    for model, member in [(Task, "task"), (Document, "document"), (Asset, "asset"), (Artifact, "artifact")]:
        add(f"project-{member}", model, "project", model.project_id, "contains", member, model.id, "membership")
    add("task-parent", TaskPlanningProfile, "task", TaskPlanningProfile.parent_task_id, "contains", "task", TaskPlanningProfile.task_id,
        "planning", row_id=TaskPlanningProfile.task_id)
    add("dependency", TaskDependency, "task", TaskDependency.successor_task_id, "depends_on", "task", TaskDependency.predecessor_task_id, "planning")
    add("source-file", Document, "document", Document.id, "source_file", "asset", Document.asset_id, "provenance")
    add("document-file", DocumentAssetLink, "document", DocumentAssetLink.document_id, DocumentAssetLink.role,
        "asset", DocumentAssetLink.asset_id, "provenance")
    add("document-processing", DocumentVersion, "document", DocumentVersion.document_id, "processed_by", "task", DocumentVersion.task_id, "provenance")
    add("citation", DocumentCitation, "document", DocumentVersion.document_id, "cites", "citation", DocumentCitation.id, "provenance",
        from_clause=DocumentCitation.__table__.join(DocumentVersion, DocumentVersion.id == DocumentCitation.document_version_id))
    add("citation-source", DocumentCitation, "citation", DocumentCitation.id, "references", "document", DocumentCitation.source_document_id, "provenance")
    add("task-execution", WorkflowExecution, "task", WorkflowExecution.task_id, "execution", "workflow_execution", WorkflowExecution.id, "execution")
    add("task-approval", ApprovalRequest, "task", ApprovalRequest.task_id, "approval", "approval", ApprovalRequest.id, "execution")
    add("execution-approval", ApprovalRequest, "workflow_execution", ApprovalRequest.workflow_execution_id, "approval", "approval", ApprovalRequest.id, "execution")
    add("task-result", Artifact, "task", Artifact.task_id, "produced", "artifact", Artifact.id, "execution")
    add("execution-result", Artifact, "workflow_execution", Artifact.workflow_execution_id, "produced", "artifact", Artifact.id, "execution")
    add("conversation-task", CommandRecord, "conversation", CommandRecord.conversation_id, "requested", "task", CommandRecord.task_id, "execution")

    add("conversation-execution", CommandRecord, "conversation", CommandRecord.conversation_id, "requested", "workflow_execution", CommandRecord.workflow_execution_id, "execution")

    source_type = func.lower(func.replace(func.trim(RelationshipRecord.source_type), "-", "_"))
    target_type = func.lower(func.replace(func.trim(RelationshipRecord.target_type), "-", "_"))
    aliases = [kind, *[alias for alias, target in ALIASES.items() if target == kind]]
    queries.append(select(
        (literal("relationship:") + cast(RelationshipRecord.id, String)).label("key"),
        RelationshipRecord.source_type.label("source_kind"), RelationshipRecord.source_id.label("source_id"),
        RelationshipRecord.relation_type.label("relation"), RelationshipRecord.target_type.label("target_kind"),
        RelationshipRecord.target_id.label("target_id"), literal("relationship").label("category"),
    ).where(RelationshipRecord.owner_subject == subject, or_(
        and_(source_type.in_(aliases), RelationshipRecord.source_id == identity),
        and_(target_type.in_(aliases), RelationshipRecord.target_id == identity),
    )))
    return union_all(*queries).subquery()


@router.get("/v1/mycelium/{entity_type}/{entity_id}", response_model=BrowserPage)
async def get_neighbourhood(
    entity_type: EntityType, entity_id: uuid.UUID,
    limit: int = Query(default=36, ge=1, le=80),
    cursor: str | None = Query(default=None, max_length=2048),
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> BrowserPage:
    focus = await read_node(session, entity_type, entity_id, principal, preview=True)
    if focus is None:
        raise HTTPException(404, "Mycelium item not found")
    candidates = edge_queries(entity_type, entity_id, principal.subject)
    query = select(candidates).order_by(candidates.c.key).limit(limit + 1)
    if cursor:
        scope, last = decode_cursor(cursor, 2)
        if scope != focus.id or not isinstance(last, str) or len(last) > 200:
            raise HTTPException(422, "Invalid Mycelium cursor")
        query = query.where(candidates.c.key > last)
    rows = (await session.execute(query)).mappings().all()
    next_cursor = encode_cursor([focus.id, rows[limit - 1]["key"]]) if len(rows) > limit else None
    nodes: dict[str, BrowserNode] = {focus.id: focus}
    checked: dict[str, BrowserNode | None] = dict(nodes)
    edges = []
    for row in rows[:limit]:
        endpoints = []
        for side in ("source", "target"):
            kind = normalized_type(row[f"{side}_kind"])
            identity = row[f"{side}_id"]
            key = f"{kind}:{identity}"
            if key not in checked:
                checked[key] = await read_node(session, kind, identity, principal)
            endpoints.append(checked[key])
        source, target = endpoints
        if source is None or target is None:
            continue
        nodes[source.id], nodes[target.id] = source, target
        dependency = await session.get(TaskDependency, uuid.UUID(row["key"].split(":", 1)[1])) if row["key"].startswith("dependency:") else None
        edges.append(BrowserEdge(id=row["key"], source=source.id, target=target.id,
                                 relation=row["relation"], directed=row["relation"] != "related_to", category=row["category"],
                                 dependencyType=dependency.dependency_type if dependency else None,
                                 lagSeconds=dependency.lag_seconds if dependency else None))
    return BrowserPage(focus=focus.id, nodes=list(nodes.values()), edges=edges, next_cursor=next_cursor)
