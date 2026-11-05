"""Facebook sync админы шийдвэрийг хүндэтгэнэ: news_posts.fb_sync_detached, news_fb_ignored (админы устгасан постууд)

Revision ID: 0018
Revises: 0017
Create Date: 2026-11-05
"""
from alembic import op
import sqlalchemy as sa

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("news_posts", sa.Column("fb_sync_detached", sa.Boolean, nullable=False, server_default=sa.false()))
    op.create_table(
        "news_fb_ignored",
        sa.Column("fb_post_id", sa.String(100), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("news_fb_ignored")
    op.drop_column("news_posts", "fb_sync_detached")
