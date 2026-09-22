"""olympiad stages, results, album photos

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "olympiad_stages",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("year", sa.Integer, nullable=False, index=True),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="1"),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("date_text", sa.String(60), nullable=False),
        sa.Column("date", sa.Date, nullable=True),
        sa.Column("text", sa.Text, nullable=False, server_default=""),
        sa.Column("tags", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("location", sa.String(120), nullable=False, server_default=""),
        sa.UniqueConstraint("year", "order", name="uq_stage_year_order"),
    )
    op.create_table(
        "olympiad_results",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("year", sa.Integer, nullable=False, index=True),
        sa.Column("category", sa.String(20), nullable=False, index=True),
        sa.Column("last_name", sa.String(80), nullable=False, server_default=""),
        sa.Column("first_name", sa.String(80), nullable=False),
        sa.Column("school", sa.String(160), nullable=False, server_default=""),
        sa.Column("code", sa.String(30), nullable=False, server_default=""),
        sa.Column("scores", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("score", sa.Numeric(6, 2), nullable=True),
        sa.Column("rank_label", sa.String(4), nullable=False, server_default=""),
        sa.Column("medal", sa.String(10), nullable=False, server_default=""),
        sa.Column("rank", sa.SmallInteger, nullable=True),
        sa.Column("note", sa.String(200), nullable=False, server_default=""),
    )
    op.create_table(
        "olympiad_album_photos",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("image", sa.String(255), nullable=False),
        sa.Column("caption", sa.Text, nullable=False),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="1"),
        sa.Column("is_published", sa.Boolean, nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_table("olympiad_album_photos")
    op.drop_table("olympiad_results")
    op.drop_table("olympiad_stages")
