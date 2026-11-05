"""news category color and post views

Revision ID: 0019
Revises: 0018
Create Date: 2026-11-05
"""
from alembic import op
import sqlalchemy as sa

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("news_categories", sa.Column("color", sa.String(7), nullable=False, server_default="#1e3a8f"))
    op.add_column("news_posts", sa.Column("views_count", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("news_posts", "views_count")
    op.drop_column("news_categories", "color")
