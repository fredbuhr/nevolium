from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

MindMapEntityType = Literal["project", "task", "document"]
MindMapRelationType = Literal[
    "related_to",
    "supports",
    "contradicts",
    "depends_on",
    "references",
    "derived_from",
    "converted_to",
]


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


class MindMapRelationshipCreate(BaseModel):
    source_type: MindMapEntityType
    source_id: uuid.UUID
    relation_type: MindMapRelationType
    target_type: MindMapEntityType
    target_id: uuid.UUID

    @model_validator(mode="after")
    def reject_self_link(self) -> "MindMapRelationshipCreate":
        if self.source_type == self.target_type and self.source_id == self.target_id:
            raise ValueError("Mindmap relationship cannot target the same entity")
        return self


class MindMapEdgeRead(BaseModel):
    id: uuid.UUID
    source_key: str
    target_key: str
    source_type: MindMapEntityType
    source_id: uuid.UUID
    relation_type: str
    target_type: MindMapEntityType
    target_id: uuid.UUID
    directed: bool
    metadata_json: dict[str, Any]
    created_at: datetime


class MindMapSnapshotRead(BaseModel):
    project_id: uuid.UUID
    layout_workspace_key: str
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
