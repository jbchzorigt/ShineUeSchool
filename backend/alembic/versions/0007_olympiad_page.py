"""olympiad page settings (single row)

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "olympiad_page",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("eyebrow", sa.String(80), nullable=False, server_default=""),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("bio", sa.Text, nullable=False, server_default=""),
        sa.Column("portrait_image", sa.String(255), nullable=True),
        sa.Column("portrait_caption", sa.String(160), nullable=False, server_default=""),
        sa.Column("about_title", sa.String(160), nullable=False, server_default=""),
        sa.Column("about_lead", sa.Text, nullable=False, server_default=""),
        sa.Column("stats", JSONB, nullable=False, server_default="[]"),
        sa.Column("contact_address", sa.String(200), nullable=False, server_default=""),
        sa.Column("contact_phone", sa.String(60), nullable=False, server_default=""),
        sa.Column("contact_email", sa.String(120), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_table("olympiad_page")
