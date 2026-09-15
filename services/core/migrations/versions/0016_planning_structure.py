"""D06: canonical task hierarchy, milestones, progress and dependencies.

Revision ID: 0016_planning_structure
Revises: 0015_model_configurations

The planning renderer must not own task structure. D06 therefore keeps hierarchy,
planning progress, recurrence metadata and dependency edges in Core-owned tables
bound to canonical Task rows.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0016_planning_structure"
down_revision = "0015_model_configurations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "task_planning_profiles",
        sa.Column(
            "task_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "parent_task_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tasks.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("kind", sa.String(16), nullable=False, server_default="task"),
        sa.Column("progress_percent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("planning_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("recurrence_rule", sa.Text(), nullable=True),
        sa.Column("recurrence_timezone", sa.String(120), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "parent_task_id IS NULL OR parent_task_id <> task_id",
            name="ck_task_planning_parent_not_self",
        ),
        sa.CheckConstraint(
            "kind IN ('task', 'milestone')",
            name="ck_task_planning_kind",
        ),
        sa.CheckConstraint(
            "progress_percent >= 0 AND progress_percent <= 100",
            name="ck_task_planning_progress",
        ),
        sa.CheckConstraint(
            "planning_version >= 1",
            name="ck_task_planning_version_positive",
        ),
        sa.CheckConstraint(
            "recurrence_timezone IS NULL OR recurrence_rule IS NOT NULL",
            name="ck_task_planning_recurrence_timezone_requires_rule",
        ),
    )
    op.create_index(
        "ix_task_planning_parent",
        "task_planning_profiles",
        ["parent_task_id", "task_id"],
    )
    op.create_index(
        "ix_task_planning_kind",
        "task_planning_profiles",
        ["kind", "task_id"],
    )

    op.create_table(
        "task_dependencies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "predecessor_task_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "successor_task_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("dependency_type", sa.String(2), nullable=False, server_default="FS"),
        sa.Column("lag_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "predecessor_task_id <> successor_task_id",
            name="ck_task_dependencies_not_self",
        ),
        sa.CheckConstraint(
            "dependency_type IN ('FS', 'SS', 'FF', 'SF')",
            name="ck_task_dependencies_type",
        ),
        sa.CheckConstraint(
            "lag_seconds >= 0",
            name="ck_task_dependencies_lag_nonnegative",
        ),
        sa.UniqueConstraint(
            "predecessor_task_id",
            "successor_task_id",
            name="uq_task_dependencies_pair",
        ),
    )
    op.create_index(
        "ix_task_dependencies_predecessor",
        "task_dependencies",
        ["predecessor_task_id", "successor_task_id"],
    )
    op.create_index(
        "ix_task_dependencies_successor",
        "task_dependencies",
        ["successor_task_id", "predecessor_task_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_task_dependencies_successor", table_name="task_dependencies")
    op.drop_index("ix_task_dependencies_predecessor", table_name="task_dependencies")
    op.drop_table("task_dependencies")
    op.drop_index("ix_task_planning_kind", table_name="task_planning_profiles")
    op.drop_index("ix_task_planning_parent", table_name="task_planning_profiles")
    op.drop_table("task_planning_profiles")
