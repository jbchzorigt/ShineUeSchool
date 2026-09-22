"""clubs: per-grade quotas replace capacity

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-22
"""
import json

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clubs", sa.Column("quotas", JSONB, nullable=False, server_default="{}"))
    conn = op.get_bind()
    # Хуучин нийт багтаамжийг анги тутамд квот болгон тавина (одоогоор тестийн өгөгдөл л байна)
    for cid, grades, cap in conn.execute(sa.text("SELECT id, grades, capacity FROM clubs")).fetchall():
        conn.execute(sa.text("UPDATE clubs SET quotas = CAST(:q AS jsonb) WHERE id = :id"),
                     {"q": json.dumps({str(g): int(cap) for g in (grades or [])}), "id": cid})
    op.drop_column("clubs", "capacity")


def downgrade() -> None:
    op.add_column("clubs", sa.Column("capacity", sa.Integer, nullable=False, server_default="1"))
    op.get_bind().execute(sa.text(
        "UPDATE clubs SET capacity = COALESCE((SELECT MAX(v::int) FROM jsonb_each_text(quotas) AS t(k, v)), 1)"))
    op.drop_column("clubs", "quotas")
