"""D06: canonical project work calendars.

Revision ID: 0017_project_work_calendar
Revises: 0016_planning_structure

Work calendars belong to Core, not to Gantt/calendar renderers. A project row stores
validated local weekly intervals and dated overrides while planning engines retain
a single authoritative timezone and optimistic version.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0017_project_work_calendar"
down_revision = "0016_planning_structure"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_work_calendars",
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("timezone", sa.String(120), nullable=False),
        sa.Column("weekly_intervals", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("exceptions", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("calendar_version", sa.Integer(), nullable=False, server_default="1"),
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
            "calendar_version >= 1",
            name="ck_project_work_calendar_version_positive",
        ),
    )


def downgrade() -> None:
    op.drop_table("project_work_calendars")
