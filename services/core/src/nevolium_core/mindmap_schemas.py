from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

MindMapEntityType = Literal["project", "task", "document"]


class MindMapNodeRead(BaseModel):
    key: str
    entity_type: MindMapEntityType
    entity_id: uuid.UUID
    project_id: uuid.UUID
    label: str
    kind: str
    status: str
    epistemic_status: str | None = None
    priority: int | None = None


class MindMapEdgeRead(BaseModel):
    id: uuid.UUID
    source_key: str
    target_key: str
    source_type: MindMapEntityType
    source_id: uuid.UUID
    relation_type: str
    target_type: MindMapEntityType
    target_id: uuid.UUID
    metadata_json: dict[str, Any]
    created_at: datetime


class MindMapSnapshotRead(BaseModel):
    project_id: uuid.UUID
    nodes: list[MindMapNodeRead]
    edges: list[MindMapEdgeRead]
    task_count: int = Field(ge=0)
    document_count: int = Field(ge=0)
    relationship_count: int = Field(ge=0)
    tasks_truncated: bool
    documents_truncated: bool
    relationships_truncated: bool
    task_limit: int = Field(ge=1)
    document_limit: int = Field(ge=1)
    relationship_limit: int = Field(ge=1)
