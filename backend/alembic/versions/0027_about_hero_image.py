"""about_page.hero_image — Бидний тухай хуудасны бүтэн өргөнтэй дэвсгэр зураг

Revision ID: 0027
Revises: 0026
Create Date: 2026-11-16
"""
from alembic import op
import sqlalchemy as sa

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("about_page", sa.Column("hero_image", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("about_page", "hero_image")
