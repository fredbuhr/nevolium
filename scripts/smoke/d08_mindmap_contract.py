#!/usr/bin/env python3
"""Static contract for D08 bounded canonical mindmap projection and mutations."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MINDMAP = ROOT / "services/core/src/nevolium_core/mindmap.py"
SCHEMAS = ROOT / "services/core/src/nevolium_core/mindmap_schemas.py"
KNOWLEDGE = ROOT / "services/core/src/nevolium_core/knowledge.py"
MAIN = ROOT / "services/core/src/nevolium_core/main.py"


def main() -> int:
    mindmap = MINDMAP.read_text(encoding="utf-8")
    schemas = SCHEMAS.read_text(encoding="utf-8")
    knowledge = KNOWLEDGE.read_text(encoding="utf-8")
    main_py = MAIN.read_text(encoding="utf-8")

    assert '@router.get("/v1/projects/{project_id}/mindmap"' in mindmap
    assert '"""Return one bounded project map; never an owner-global graph."""' in mindmap
    assert "MAX_MINDMAP_TASKS = 200" in mindmap
    assert "MAX_MINDMAP_DOCUMENTS = 200" in mindmap
    assert "MAX_MINDMAP_RELATIONSHIPS = 1_000" in mindmap
    assert ".limit(task_limit + 1)" in mindmap
    assert ".limit(document_limit + 1)" in mindmap
    assert ".limit(relationship_limit + 1)" in mindmap

    # Project ownership gates the whole snapshot; Documents retain D07 owner metadata scoping.
    assert "await get_owned_project(session, project_id, principal)" in mindmap
    assert 'Document.metadata_json["owner_subject"].astext == principal.subject' in mindmap
    assert "RelationshipRecord.owner_subject == principal.subject" in mindmap

    # Both endpoints of an edge must be inside the visible project node set.
    assert "or_(*source_visibility)" in mindmap
    assert "or_(*target_visibility)" in mindmap
    assert 'RelationshipRecord.source_type == "task"' in mindmap
    assert 'RelationshipRecord.target_type == "task"' in mindmap
    assert 'RelationshipRecord.source_type == "document"' in mindmap
    assert 'RelationshipRecord.target_type == "document"' in mindmap

    # Stable identity and one canonical WorkspaceLayout key; no D08-specific business IDs.
    assert 'return f"{entity_type}:{entity_id}"' in mindmap
    assert 'return f"mindmap.project.{project_id}"' in mindmap
    assert "layout_workspace_key=mindmap_layout_workspace_key(project.id)" in mindmap
    assert 'MindMapEntityType = Literal["project", "task", "document"]' in schemas
    assert "tasks_truncated: bool" in schemas
    assert "documents_truncated: bool" in schemas
    assert "relationships_truncated: bool" in schemas

    # D08 proposes one bounded vocabulary without changing legacy RelationshipRecord semantics.
    for relation in (
        "related_to",
        "supports",
        "contradicts",
        "depends_on",
        "references",
        "derived_from",
        "converted_to",
    ):
        assert f'"{relation}"' in schemas
    assert "relation_type: MindMapRelationType" in schemas
    assert "Mindmap relationship cannot target the same entity" in schemas
    assert 'directed=row.relation_type != "related_to"' in mindmap

    # Mutations are project-scoped, serialized and auditable; legacy edges are read-only here.
    assert '"/v1/projects/{project_id}/mindmap/relationships"' in mindmap
    assert '"/v1/projects/{project_id}/mindmap/relationships/{relationship_id}"' in mindmap
    assert ".with_for_update()" in mindmap
    assert "await _require_entity_in_project(" in mindmap
    assert 'detail="Relationship already exists"' in mindmap
    assert 'metadata_json={"surface": "mindmap", "project_id": str(project.id)}' in mindmap
    assert 'detail="Relationship is read-only in mindmap"' in mindmap
    assert 'event_type="relationship.created"' in mindmap
    assert 'event_type="relationship.deleted"' in mindmap
    assert 'action="relationship.create"' in mindmap
    assert 'action="relationship.delete"' in mindmap

    # Reuse the already included Knowledge router; never add another top-level main.py registration.
    assert "from .mindmap import router as mindmap_router" in knowledge
    assert "router.include_router(mindmap_router)" in knowledge
    assert "mindmap_router" not in main_py

    print(
        "D08 MINDMAP CONTRACT PASS: project-scoped canonical identities, bounded reads, owner "
        "isolation, typed link mutations and WorkspaceLayout handoff are explicit"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
