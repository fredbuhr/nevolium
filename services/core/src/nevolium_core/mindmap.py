from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import Principal, require_nevolium_user
from .db import get_session
from .document_models import Document
from .mindmap_schemas import MindMapEdgeRead, MindMapNodeRead, MindMapSnapshotRead
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
        metadata_json=dict(row.metadata_json or {}),
        created_at=row.created_at,
    )


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
