#!/usr/bin/env python3
"""Static contract for the D07 canonical editable-knowledge foundation."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "services/core/src/nevolium_core/document_models.py"
MIGRATION = ROOT / "services/core/migrations/versions/0018_editable_knowledge.py"


def main() -> int:
    model = MODEL.read_text(encoding="utf-8")
    migration = MIGRATION.read_text(encoding="utf-8")

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

    print(
        "D07 EDITABLE KNOWLEDGE FOUNDATION PASS: canonical Document supports authored kinds, "
        "immutable rich/plain versions expose derived-search health, citations are version-bound, "
        "and attachments/whiteboards reuse Assets"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
