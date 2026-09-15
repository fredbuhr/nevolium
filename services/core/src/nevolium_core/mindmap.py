from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, require_nevolium_user
from .db import get_session
from .document_models import Document
from .events import append_audit, enqueue_domain_event
from .mindmap_schemas import (
    MindMapEdgeRead,
    MindMapEntityType,
    MindMapNodeRead,
    MindMapRelationshipCreate,
    MindMapSnapshotRead,
)
from .models import Project, RelationshipRecord, Task
from .project_access import get_owned_project

router = APIRouter()

MAX_MINDMAP_TASKS = 200
MAX_MINDMAP_DOCUMENTS = 200
MAX_MINDMAP_RELATIONSHIPS = 1_000
DEFAULT_MINDMAP_TASKS = 100
DEFAULT_MINDMAP_DOCUMENTS = 100
DEFAULT_MINDMAP_RELATIONSHIPS = 300


def mindmap_entity_key(entity_type: str, entity_id: uuid.UUID) -> str:
    return f"{entity_type}:{entity_id}"


def mindmap_layout_workspace_key(project_id: uuid.UUID) -> str:
    return f"mindmap.project.{project_id}"


def _project_node(project: Project) -> MindMapNodeRead:
    return MindMapNodeRead(
        key=mindmap_entity_key("project", project.id),
        entity_type="project",
        entity_id=project.id,
        project_id=project.id,
        label=project.name,
        kind="project",
        status=project.status,
    )


def _task_node(task: Task) -> MindMapNodeRead:
    return MindMapNodeRead(
        key=mindmap_entity_key("task", task.id),
        entity_type="task",
        entity_id=task.id,
        project_id=task.project_id,
        label=task.title,
        kind="task",
        status=task.status,
        priority=task.priority,
    )


def _document_node(document: Document) -> MindMapNodeRead:
    return MindMapNodeRead(
        key=mindmap_entity_key("document", document.id),
        entity_type="document",
        entity_id=document.id,
        project_id=document.project_id,
        label=document.title,
        kind=document.kind,
        status=document.status,
        epistemic_status=document.epistemic_status,
    )


def _edge(row: RelationshipRecord) -> MindMapEdgeRead:
    return MindMapEdgeRead(
        id=row.id,
        source_key=mindmap_entity_key(row.source_type, row.source_id),
        target_key=mindmap_entity_key(row.target_type, row.target_id),
        source_type=row.source_type,
        source_id=row.source_id,
        relation_type=row.relation_type,
        target_type=row.target_type,
        target_id=row.target_id,
        directed=row.relation_type != "related_to",
        metadata_json=dict(row.metadata_json or {}),
        created_at=row.created_at,
    )


async def _locked_owned_project(
    session: AsyncSession,
    project_id: uuid.UUID,
    principal: Principal,
) -> Project:
    project = await get_owned_project(session, project_id, principal)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    locked = await session.scalar(select(Project).where(Project.id == project.id).with_for_update())
    if locked is None or await get_owned_project(session, project_id, principal) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return locked


async def _entity_is_in_project(
    session: AsyncSession,
    *,
    project: Project,
    entity_type: MindMapEntityType,
    entity_id: uuid.UUID,
    principal: Principal,
) -> bool:
    if entity_type == "project":
        return entity_id == project.id
    if entity_type == "task":
        return (
            await session.scalar(
                select(Task.id).where(Task.id == entity_id, Task.project_id == project.id)
            )
            is not None
        )
    return (
        await session.scalar(
            select(Document.id).where(
                Document.id == entity_id,
                Document.project_id == project.id,
                Document.metadata_json["owner_subject"].astext == principal.subject,
            )
        )
        is not None
    )


async def _require_entity_in_project(
    session: AsyncSession,
    *,
    project: Project,
    entity_type: MindMapEntityType,
    entity_id: uuid.UUID,
    principal: Principal,
) -> None:
    if not await _entity_is_in_project(
        session,
        project=project,
        entity_type=entity_type,
        entity_id=entity_id,
        principal=principal,
    ):
        raise HTTPException(status_code=404, detail="Mindmap entity not found")


@router.get("/v1/projects/{project_id}/mindmap", response_model=MindMapSnapshotRead)
async def get_project_mindmap(
    project_id: uuid.UUID,
    task_limit: int = Query(default=DEFAULT_MINDMAP_TASKS, ge=1, le=MAX_MINDMAP_TASKS),
    document_limit: int = Query(
        default=DEFAULT_MINDMAP_DOCUMENTS,
        ge=1,
        le=MAX_MINDMAP_DOCUMENTS,
    ),
    relationship_limit: int = Query(
        default=DEFAULT_MINDMAP_RELATIONSHIPS,
        ge=1,
        le=MAX_MINDMAP_RELATIONSHIPS,
    ),
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> MindMapSnapshotRead:
    """Return one bounded project map; never an owner-global graph."""
    project = await get_owned_project(session, project_id, principal)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    task_rows = list(
        (
            await session.execute(
                select(Task)
                .where(Task.project_id == project.id)
                .order_by(Task.created_at.desc(), Task.id.desc())
                .limit(task_limit + 1)
            )
        ).scalars()
    )
    document_rows = list(
        (
            await session.execute(
                select(Document)
                .where(
                    Document.project_id == project.id,
                    Document.metadata_json["owner_subject"].astext == principal.subject,
                )
                .order_by(Document.created_at.desc(), Document.id.desc())
                .limit(document_limit + 1)
            )
        ).scalars()
    )

    tasks_truncated = len(task_rows) > task_limit
    documents_truncated = len(document_rows) > document_limit
    tasks = task_rows[:task_limit]
    documents = document_rows[:document_limit]

    task_ids = [row.id for row in tasks]
    document_ids = [row.id for row in documents]

    source_visibility = [
        and_(
            RelationshipRecord.source_type == "project",
            RelationshipRecord.source_id == project.id,
        )
    ]
    target_visibility = [
        and_(
            RelationshipRecord.target_type == "project",
            RelationshipRecord.target_id == project.id,
        )
    ]
    if task_ids:
        source_visibility.append(
            and_(
                RelationshipRecord.source_type == "task",
                RelationshipRecord.source_id.in_(task_ids),
            )
        )
        target_visibility.append(
            and_(
                RelationshipRecord.target_type == "task",
                RelationshipRecord.target_id.in_(task_ids),
            )
        )
    if document_ids:
        source_visibility.append(
            and_(
                RelationshipRecord.source_type == "document",
                RelationshipRecord.source_id.in_(document_ids),
            )
        )
        target_visibility.append(
            and_(
                RelationshipRecord.target_type == "document",
                RelationshipRecord.target_id.in_(document_ids),
            )
        )

    relationship_rows = list(
        (
            await session.execute(
                select(RelationshipRecord)
                .where(
                    RelationshipRecord.owner_subject == principal.subject,
                    or_(*source_visibility),
                    or_(*target_visibility),
                )
                .order_by(RelationshipRecord.created_at.desc(), RelationshipRecord.id.desc())
                .limit(relationship_limit + 1)
            )
        ).scalars()
    )
    relationships_truncated = len(relationship_rows) > relationship_limit
    relationships = relationship_rows[:relationship_limit]

    nodes = [_project_node(project)]
    nodes.extend(_task_node(row) for row in tasks)
    nodes.extend(_document_node(row) for row in documents)

    return MindMapSnapshotRead(
        project_id=project.id,
        layout_workspace_key=mindmap_layout_workspace_key(project.id),
        nodes=nodes,
        edges=[_edge(row) for row in relationships],
        task_count=len(tasks),
        document_count=len(documents),
        relationship_count=len(relationships),
        tasks_truncated=tasks_truncated,
        documents_truncated=documents_truncated,
        relationships_truncated=relationships_truncated,
        task_limit=task_limit,
        document_limit=document_limit,
        relationship_limit=relationship_limit,
    )


@router.post(
    "/v1/projects/{project_id}/mindmap/relationships",
    response_model=MindMapEdgeRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_mindmap_relationship(
    project_id: uuid.UUID,
    body: MindMapRelationshipCreate,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> MindMapEdgeRead:
    project = await _locked_owned_project(session, project_id, principal)
    await _require_entity_in_project(
        session,
        project=project,
        entity_type=body.source_type,
        entity_id=body.source_id,
        principal=principal,
    )
    await _require_entity_in_project(
        session,
        project=project,
        entity_type=body.target_type,
        entity_id=body.target_id,
        principal=principal,
    )

    duplicate = await session.scalar(
        select(RelationshipRecord.id).where(
            RelationshipRecord.owner_subject == principal.subject,
            RelationshipRecord.source_type == body.source_type,
            RelationshipRecord.source_id == body.source_id,
            RelationshipRecord.relation_type == body.relation_type,
            RelationshipRecord.target_type == body.target_type,
            RelationshipRecord.target_id == body.target_id,
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=409, detail="Relationship already exists")

    correlation_id = uuid.uuid4()
    relationship = RelationshipRecord(
        owner_subject=principal.subject,
        source_type=body.source_type,
        source_id=body.source_id,
        relation_type=body.relation_type,
        target_type=body.target_type,
        target_id=body.target_id,
        metadata_json={"surface": "mindmap", "project_id": str(project.id)},
    )
    session.add(relationship)
    await session.flush()
    await enqueue_domain_event(
        session,
        event_type="relationship.created",
        aggregate_type="relationship",
        aggregate_id=relationship.id,
        correlation_id=correlation_id,
        payload={
            "relationship_id": str(relationship.id),
            "project_id": str(project.id),
            "source_type": relationship.source_type,
            "source_id": str(relationship.source_id),
            "relation_type": relationship.relation_type,
            "target_type": relationship.target_type,
            "target_id": str(relationship.target_id),
            "surface": "mindmap",
        },
    )
    await append_audit(
        session,
        actor_type="user",
        actor_id=principal.subject,
        action="relationship.create",
        resource_type="relationship",
        resource_id=str(relationship.id),
        authority_level=1,
        correlation_id=correlation_id,
        request_json={"project_id": str(project.id), **body.model_dump(mode="json")},
    )
    await session.commit()
    await session.refresh(relationship)
    return _edge(relationship)


@router.delete(
    "/v1/projects/{project_id}/mindmap/relationships/{relationship_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_mindmap_relationship(
    project_id: uuid.UUID,
    relationship_id: uuid.UUID,
    principal: Principal = Depends(require_nevolium_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    project = await _locked_owned_project(session, project_id, principal)
    relationship = await session.scalar(
        select(RelationshipRecord).where(
            RelationshipRecord.id == relationship_id,
            RelationshipRecord.owner_subject == principal.subject,
        )
    )
    if relationship is None:
        raise HTTPException(status_code=404, detail="Relationship not found")
    if (relationship.metadata_json or {}).get("surface") != "mindmap":
        raise HTTPException(status_code=409, detail="Relationship is read-only in mindmap")

    await _require_entity_in_project(
        session,
        project=project,
        entity_type=relationship.source_type,
        entity_id=relationship.source_id,
        principal=principal,
    )
    await _require_entity_in_project(
        session,
        project=project,
        entity_type=relationship.target_type,
        entity_id=relationship.target_id,
        principal=principal,
    )

    correlation_id = uuid.uuid4()
    event_payload = {
        "relationship_id": str(relationship.id),
        "project_id": str(project.id),
        "source_type": relationship.source_type,
        "source_id": str(relationship.source_id),
        "relation_type": relationship.relation_type,
        "target_type": relationship.target_type,
        "target_id": str(relationship.target_id),
        "surface": "mindmap",
    }
    await session.delete(relationship)
    await enqueue_domain_event(
        session,
        event_type="relationship.deleted",
        aggregate_type="relationship",
        aggregate_id=relationship_id,
        correlation_id=correlation_id,
        payload=event_payload,
    )
    await append_audit(
        session,
        actor_type="user",
        actor_id=principal.subject,
        action="relationship.delete",
        resource_type="relationship",
        resource_id=str(relationship_id),
        authority_level=1,
        correlation_id=correlation_id,
        request_json={"project_id": str(project.id)},
        result_json=event_payload,
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
