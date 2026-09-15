"""D07: editable knowledge, provenance and asset links.

Revision ID: 0018_editable_knowledge
Revises: 0017_project_work_calendar

Imported files and authored knowledge share the canonical Document aggregate. Authored versions
store immutable rich/plain representations while search chunks remain a rebuildable projection.
Citations belong to a target version so restoring or editing never rewrites historical provenance.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0018_editable_knowledge"
down_revision = "0017_project_work_calendar"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "documents", "asset_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True
    )
    op.add_column(
        "documents", sa.Column("kind", sa.String(32), nullable=False, server_default="source")
    )
    op.add_column("documents", sa.Column("epistemic_status", sa.String(32), nullable=True))
    op.create_check_constraint(
        "ck_documents_kind", "documents", "kind IN ('source', 'note', 'idea', 'decision')"
    )
    op.create_check_constraint(
        "ck_documents_epistemic_status",
        "documents",
        "epistemic_status IS NULL OR epistemic_status IN ('hypothesis', 'supported', 'contested', 'verified')",
    )
    op.create_index("ix_documents_project_kind", "documents", ["project_id", "kind"])

    op.add_column(
        "document_versions",
        sa.Column("content_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column("document_versions", sa.Column("content_text", sa.Text(), nullable=True))
    op.add_column("document_versions", sa.Column("content_sha256", sa.String(64), nullable=True))
    op.add_column(
        "document_versions",
        sa.Column("search_status", sa.String(32), nullable=False, server_default="pending"),
    )
    op.add_column("document_versions", sa.Column("search_error", sa.Text(), nullable=True))
    op.create_check_constraint(
        "ck_document_versions_search_status",
        "document_versions",
        "search_status IN ('pending', 'ready', 'failed')",
    )
    op.create_check_constraint(
        "ck_document_versions_content_sha256",
        "document_versions",
        "content_sha256 IS NULL OR char_length(content_sha256) = 64",
    )
    op.execute(
        """
        UPDATE document_versions
        SET search_status = CASE
            WHEN status = 'completed' THEN 'ready'
            WHEN status = 'failed' THEN 'failed'
            ELSE 'pending'
        END
        """
    )
    op.create_index(
        "ix_document_versions_document_search",
        "document_versions",
        ["document_id", "search_status", "generation"],
    )

    op.create_table(
        "document_citations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "document_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("document_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "source_document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("documents.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "source_document_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("document_versions.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "source_chunk_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("document_chunks.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("label", sa.String(320), nullable=True),
        sa.Column("excerpt", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "(source_document_id IS NOT NULL AND source_url IS NULL) OR "
            "(source_document_id IS NULL AND source_url IS NOT NULL)",
            name="ck_document_citations_one_source",
        ),
        sa.CheckConstraint(
            "source_document_version_id IS NULL OR source_document_id IS NOT NULL",
            name="ck_document_citations_version_requires_document",
        ),
        sa.CheckConstraint(
            "source_chunk_id IS NULL OR source_document_version_id IS NOT NULL",
            name="ck_document_citations_chunk_requires_version",
        ),
    )
    op.create_index(
        "ix_document_citations_target",
        "document_citations",
        ["document_version_id", "created_at", "id"],
    )
    op.create_index(
        "ix_document_citations_source_document", "document_citations", ["source_document_id"]
    )

    op.create_table(
        "document_asset_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "asset_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("assets.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("label", sa.String(320), nullable=True),
        sa.Column("ordinal", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "role IN ('attachment', 'whiteboard')", name="ck_document_asset_links_role"
        ),
        sa.CheckConstraint("ordinal >= 0", name="ck_document_asset_links_ordinal"),
        sa.UniqueConstraint(
            "document_id", "asset_id", "role", name="uq_document_asset_link_role"
        ),
    )
    op.create_index(
        "ix_document_asset_links_document",
        "document_asset_links",
        ["document_id", "ordinal", "id"],
    )


def downgrade() -> None:
    # Once authored knowledge exists, making asset_id NOT NULL would require deleting or inventing
    # source Assets. Refuse that destructive downgrade and keep the canonical data intact.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM documents WHERE asset_id IS NULL) THEN
                RAISE EXCEPTION '0018 downgrade refused: authored documents without source assets exist';
            END IF;
        END
        $$;
        """
    )

    op.drop_index("ix_document_asset_links_document", table_name="document_asset_links")
    op.drop_table("document_asset_links")
    op.drop_index("ix_document_citations_source_document", table_name="document_citations")
    op.drop_index("ix_document_citations_target", table_name="document_citations")
    op.drop_table("document_citations")

    op.drop_index("ix_document_versions_document_search", table_name="document_versions")
    op.drop_constraint(
        "ck_document_versions_content_sha256", "document_versions", type_="check"
    )
    op.drop_constraint(
        "ck_document_versions_search_status", "document_versions", type_="check"
    )
    op.drop_column("document_versions", "search_error")
    op.drop_column("document_versions", "search_status")
    op.drop_column("document_versions", "content_sha256")
    op.drop_column("document_versions", "content_text")
    op.drop_column("document_versions", "content_json")

    op.drop_index("ix_documents_project_kind", table_name="documents")
    op.drop_constraint("ck_documents_epistemic_status", "documents", type_="check")
    op.drop_constraint("ck_documents_kind", "documents", type_="check")
    op.drop_column("documents", "epistemic_status")
    op.drop_column("documents", "kind")
    op.alter_column(
        "documents",
        "asset_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
