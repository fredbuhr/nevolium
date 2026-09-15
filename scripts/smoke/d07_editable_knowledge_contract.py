#!/usr/bin/env python3
"""Static contract for the D07 canonical editable-knowledge foundation and authored APIs."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "services/core/src/nevolium_core/document_models.py"
MIGRATION = ROOT / "services/core/migrations/versions/0018_editable_knowledge.py"
EDITABLE = ROOT / "services/core/src/nevolium_core/editable_knowledge.py"
KNOWLEDGE = ROOT / "services/core/src/nevolium_core/knowledge.py"


def main() -> int:
    model = MODEL.read_text(encoding="utf-8")
    migration = MIGRATION.read_text(encoding="utf-8")
    editable = EDITABLE.read_text(encoding="utf-8")
    knowledge = KNOWLEDGE.read_text(encoding="utf-8")

    assert 'revision = "0018_editable_knowledge"' in migration
    assert 'down_revision = "0017_project_work_calendar"' in migration
    assert '"asset_id"' in migration and "nullable=True" in migration
    assert "kind IN ('source', 'note', 'idea', 'decision')" in migration
    assert "epistemic_status IS NULL" in migration
    assert "content_json" in migration and "content_text" in migration
    assert "content_sha256" in migration
    assert "search_status IN ('pending', 'ready', 'failed')" in migration
    assert "WHEN status = 'completed' THEN 'ready'" in migration
    assert '"document_citations"' in migration
    assert "ck_document_citations_one_source" in migration
    assert "ck_document_citations_chunk_requires_version" in migration
    assert '"document_asset_links"' in migration
    assert "role IN ('attachment', 'whiteboard')" in migration
    assert "0018 downgrade refused: authored documents without source assets exist" in migration
    assert "IF EXISTS (SELECT 1 FROM documents WHERE asset_id IS NULL)" in migration

    assert "asset_id: Mapped[uuid.UUID | None]" in model
    assert 'kind: Mapped[str]' in model and 'default="source"' in model
    assert "epistemic_status: Mapped[str | None]" in model
    assert "content_json: Mapped[dict[str, Any] | None]" in model
    assert "content_text: Mapped[str | None]" in model
    assert "content_sha256: Mapped[str | None]" in model
    assert 'search_status: Mapped[str]' in model
    assert "class DocumentCitation(Base):" in model
    assert "document_version_id: Mapped[uuid.UUID]" in model
    assert "source_url: Mapped[str | None]" in model
    assert "class DocumentAssetLink(Base):" in model
    assert 'role: Mapped[str]' in model
    assert "UniqueConstraint(\"document_id\", \"asset_id\", \"role\"" in model

    assert 'AUTHORED_PARSER = "nevolium-authored"' in editable
    assert "expected_generation" in editable
    assert 'detail="Document generation changed; reload before saving"' in editable
    assert "latest + 1" in editable
    assert "restored_from_version_id" in editable
    assert "changed_fields" in editable
    assert "_citation_inputs" in editable
    assert "SEARCH_CHUNK_CHARS" in editable
    assert 'metadata_json={"projection": "authored-text"}' in editable
    assert "content_sha256=hashlib.sha256" in editable
    assert "MAX_CITATIONS_PER_VERSION" in editable
    assert "MAX_ASSET_LINKS_PER_DOCUMENT" in editable
    assert "await get_owned_project" in editable
    assert 'owner_subject"].astext == principal.subject' in editable
    assert 'role: AssetLinkRole' in editable

    for route in (
        '"/v1/knowledge/items"',
        '"/v1/knowledge/items/{document_id}/versions"',
        '"/v1/knowledge/items/{document_id}/versions/{version_id}/restore"',
        '"/v1/knowledge/items/{document_id}/metadata"',
        '"/v1/knowledge/versions/{version_id}/citations"',
        '"/v1/knowledge/items/{document_id}/assets"',
    ):
        assert route in knowledge
    assert "project_id: uuid.UUID | None = None" in knowledge
    assert "if project_id is not None" in knowledge
    assert 'Document.metadata_json["owner_subject"].astext == principal.subject' in knowledge
    assert 'DocumentVersion.search_status == "ready"' in knowledge

    print(
        "D07 EDITABLE KNOWLEDGE PASS: canonical Document supports authored kinds, immutable "
        "rich/plain generations, version-bound citations, Asset links, optimistic concurrency, "
        "restore-by-new-generation, owner-wide search, failed-projection exclusion and safe rollback"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
