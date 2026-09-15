#!/usr/bin/env python3
"""Static contract for D08 bounded canonical mindmap projection."""
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

    # Stable entity keys preserve identity across reload/layouts; no D08-specific business node IDs.
    assert 'return f"{entity_type}:{entity_id}"' in mindmap
    assert 'MindMapEntityType = Literal["project", "task", "document"]' in schemas
    assert "tasks_truncated: bool" in schemas
    assert "documents_truncated: bool" in schemas
    assert "relationships_truncated: bool" in schemas

    # Reuse the already included Knowledge router; never add another top-level main.py registration.
    assert "from .mindmap import router as mindmap_router" in knowledge
    assert "router.include_router(mindmap_router)" in knowledge
    assert "mindmap_router" not in main_py

    print(
        "D08 MINDMAP CONTRACT PASS: project-scoped canonical identities, bounded reads, owner "
        "isolation and visible-endpoint relationship filtering are explicit"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
