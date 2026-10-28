"""Хэсэг тус бүрийн харах/засах эрх: хуучин manager/olympiad/news бүлгийг "<хэсэг>.edit" кодууд болгоно

Revision ID: 0016
Revises: 0015
Create Date: 2026-10-28
"""
from alembic import op
import sqlalchemy as sa

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None

SECTIONS = {
    "olympiad": "Олимпиад", "timetable": "Хичээлийн хуваарь", "clubs": "Дугуйлан", "about": "Бидний тухай",
    "programs": "Хөтөлбөр", "graduates": "Төгсөгч", "news": "Мэдээ",
}
LEVELS = {"view": "харах", "edit": "засах"}
# хуучин бүлэг → шинэ хэсгүүд (бүгд "засах" түвшинтэй)
OLD = {
    "manager": ("timetable", "clubs", "about", "programs", "graduates"),
    "olympiad": ("olympiad",),
    "news": ("news",),
}
OLD_NAMES = {"manager": "Сургалтын менежер", "olympiad": "Олимпиад", "news": "Мэдээ"}


def _grant(conn, old_code: str, new_code: str) -> None:
    conn.execute(sa.text("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT ur.user_id, new.id FROM user_roles ur
        JOIN roles old ON old.id = ur.role_id AND old.code = :old
        JOIN roles new ON new.code = :new
        ON CONFLICT DO NOTHING
    """), {"old": old_code, "new": new_code})


def upgrade() -> None:
    conn = op.get_bind()
    for s, name in SECTIONS.items():
        for lv, lname in LEVELS.items():
            conn.execute(sa.text("INSERT INTO roles (code, name) VALUES (:c, :n) ON CONFLICT (code) DO NOTHING"),
                         {"c": f"{s}.{lv}", "n": f"{name} — {lname}"})
    for old, sections in OLD.items():
        for s in sections:
            _grant(conn, old, f"{s}.edit")
    # user_roles нь ON DELETE CASCADE
    conn.execute(sa.text("DELETE FROM roles WHERE code IN ('manager', 'olympiad', 'news')"))


def downgrade() -> None:
    conn = op.get_bind()
    for old, name in OLD_NAMES.items():
        conn.execute(sa.text("INSERT INTO roles (code, name) VALUES (:c, :n) ON CONFLICT (code) DO NOTHING"),
                     {"c": old, "n": name})
        for s in OLD[old]:
            _grant(conn, f"{s}.edit", old)  # зөвхөн харах эрхтэйг хуучин (засах) бүлэгт оруулахгүй
    conn.execute(sa.text("DELETE FROM roles WHERE code LIKE '%.view' OR code LIKE '%.edit'"))
