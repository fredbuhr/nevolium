"""D05: tested server-side model configurations for the instance."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0015_model_configurations"
down_revision = "0014_capacity_and_data"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "model_configurations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("model_name", sa.String(240), nullable=False),
        sa.Column("model_alias", sa.String(120), nullable=False, unique=True),
        sa.Column("litellm_model_id", sa.String(160), nullable=False, unique=True),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("created_by_subject", sa.String(320), nullable=False),
        sa.Column(
            "test_task_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tasks.id", ondelete="RESTRICT"),
            nullable=False,
            unique=True,
        ),
        sa.Column("test_estimated_cost_usd", sa.Numeric(12, 6), nullable=False),
        sa.Column("provider_model", sa.String(240)),
        sa.Column("failure_code", sa.String(80)),
        sa.Column("tested_at", sa.DateTime(timezone=True)),
        sa.Column("activated_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "provider IN ('openai', 'anthropic', 'xai', 'moonshot')",
            name="ck_model_configurations_provider",
        ),
        sa.CheckConstraint(
            "status IN ('testing', 'verified', 'active', 'retired', 'failed')",
            name="ck_model_configurations_status",
        ),
    )
    op.create_index(
        "ix_model_configurations_status_created",
        "model_configurations",
        ["status", "created_at"],
    )
    op.create_index(
        "uq_model_configurations_single_active",
        "model_configurations",
        ["status"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )


def downgrade():
    op.drop_index(
        "uq_model_configurations_single_active", table_name="model_configurations"
    )
    op.drop_index(
        "ix_model_configurations_status_created", table_name="model_configurations"
    )
    op.drop_table("model_configurations")
