"""about page: page settings, leaders, departments, teachers

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "about_page",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("intro_title", sa.String(160), nullable=False, server_default="Шинэ Үе сургууль"),
        sa.Column("intro_html", sa.Text, nullable=False, server_default=""),
        sa.Column("stats", JSONB, nullable=False, server_default="[]"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "about_leaders",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("position", sa.String(160), nullable=False),
        sa.Column("level", sa.SmallInteger, nullable=False, server_default="1"),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="0"),
        sa.Column("photo", sa.String(255), nullable=True),
    )
    op.create_table(
        "about_departments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="0"),
    )
    op.create_table(
        "about_teachers",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("department_id", sa.Integer, sa.ForeignKey("about_departments.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("role", sa.String(120), nullable=False, server_default=""),
        sa.Column("is_head", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("about_teachers")
    op.drop_table("about_departments")
    op.drop_table("about_leaders")
    op.drop_table("about_page")
