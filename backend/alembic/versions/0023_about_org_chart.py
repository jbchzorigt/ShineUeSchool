"""about: байгууллагын бүтэц — about_leaders.parent_id (харьяалагдах дээд албан тушаалтан), about_departments.leader_id (харьяалагдах удирдлага).
Анхны утга: гишүүн бүр өмнөх хамгийн ойрын түвшний эхний гишүүнд харьяалагдана (одоогийн level-ээс).

Revision ID: 0023
Revises: 0022
Create Date: 2026-11-16
"""
from alembic import op
import sqlalchemy as sa

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


def parent_map(rows: list[tuple[int, int, int]]) -> dict[int, int]:
    """(id, level, order) мөрүүдээс {id: parent_id}: өөрөөсөө бага түвшнүүдийн хамгийн их нь болох түвшний (order, id)-аар эхний гишүүн.
    Хамгийн дээд түвшний гишүүд харьяалалгүй (жагсаалтад орохгүй)."""
    first: dict[int, int] = {}   # level → тухайн түвшний эхний гишүүний id
    for id_, level, _ in sorted(rows, key=lambda r: (r[1], r[2], r[0])):
        first.setdefault(level, id_)
    out = {}
    for id_, level, _ in rows:
        lower = [lv for lv in first if lv < level]
        if lower:
            out[id_] = first[max(lower)]
    return out


def upgrade() -> None:
    op.add_column("about_leaders", sa.Column("parent_id", sa.Integer(), nullable=True))
    op.create_foreign_key("about_leaders_parent_id_fkey", "about_leaders", "about_leaders", ["parent_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_about_leaders_parent_id", "about_leaders", ["parent_id"])
    op.add_column("about_departments", sa.Column("leader_id", sa.Integer(), nullable=True))
    op.create_foreign_key("about_departments_leader_id_fkey", "about_departments", "about_leaders", ["leader_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_about_departments_leader_id", "about_departments", ["leader_id"])

    conn = op.get_bind()
    rows = conn.execute(sa.text('SELECT id, level, "order" FROM about_leaders WHERE parent_id IS NULL')).fetchall()
    for id_, parent in parent_map([tuple(r) for r in rows]).items():
        conn.execute(sa.text("UPDATE about_leaders SET parent_id = :p WHERE id = :id"), {"p": parent, "id": id_})


def downgrade() -> None:
    op.drop_index("ix_about_departments_leader_id", table_name="about_departments")
    op.drop_constraint("about_departments_leader_id_fkey", "about_departments", type_="foreignkey")
    op.drop_column("about_departments", "leader_id")
    op.drop_index("ix_about_leaders_parent_id", table_name="about_leaders")
    op.drop_constraint("about_leaders_parent_id_fkey", "about_leaders", type_="foreignkey")
    op.drop_column("about_leaders", "parent_id")
