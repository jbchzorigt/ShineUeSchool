"""
Ангийн хуваарийг бүхэлд нь шалгаж хадгална. Grid PUT ба Excel импорт хоёулаа үүнийг дуудна.
Шалгалт: давхар нүд, weekday ≤ working_days, цаг ангийн хүснэгтэд байх ба завсарлага биш,
хичээл/багш/өрөө байх, дараа нь давхардал (conflicts.py). Алдаа гарвал юу ч өөрчлөгдөхгүй.
"""

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..common.errors import ConflictError, FieldError
from .conflicts import Slot, find_conflicts
from .models import WEEKDAY_NAMES, ClassGroup, Lesson, Room, Subject, Teacher
from .schemas import GridCell


def slot_of_lesson(lesson: Lesson) -> Slot:
    return Slot(class_group_id=lesson.class_group_id, class_name=lesson.class_group.name, weekday=lesson.weekday,
                period_id=lesson.period_id, period_order=lesson.period.order,
                start=lesson.period.start_time, end=lesson.period.end_time,
                teacher_id=lesson.teacher_id, teacher_name=lesson.teacher.short_name,
                room_id=lesson.room_id, room_name=lesson.room.name if lesson.room else "")


async def load_slots(db: AsyncSession, year_id: int, exclude_class_id: int | None = None) -> list[Slot]:
    """Тухайн жилийн бүх хичээл (exclude_class_id-г хасаад) — давхардал шалгах суурь."""
    q = select(Lesson).join(Lesson.class_group).where(ClassGroup.year_id == year_id)
    if exclude_class_id is not None:
        q = q.where(Lesson.class_group_id != exclude_class_id)
    q = q.order_by(Lesson.weekday, Lesson.period_id, Lesson.id)
    return [slot_of_lesson(l) for l in (await db.execute(q)).scalars().all()]


async def _by_ids(db: AsyncSession, model, ids: set[int], field: str, msg: str) -> dict[int, object]:
    if not ids:
        return {}
    rows = (await db.execute(select(model).where(model.id.in_(list(ids))))).scalars().all()
    found = {r.id: r for r in rows}
    missing = ids - found.keys()
    if missing:
        raise FieldError(field, f"{msg} (id {min(missing)}).")
    return found


async def validate_cells(db: AsyncSession, cg: ClassGroup, cells: list[GridCell]) -> list[Lesson]:
    """Нүднүүдийг шалгаад хадгалаагүй Lesson объектууд буцаана. Алдаа → FieldError / ConflictError."""
    seen: set[tuple[int, int]] = set()
    for c in cells:
        if (c.weekday, c.period_id) in seen:
            raise FieldError("cells", f"Нэг нүдэнд хоёр хичээл байна ({WEEKDAY_NAMES.get(c.weekday, c.weekday)}, цаг id {c.period_id}).")
        seen.add((c.weekday, c.period_id))
        if not 1 <= c.weekday <= cg.year.working_days:
            raise FieldError("weekday", f"Өдөр 1–{cg.year.working_days} хооронд байх ёстой.")

    periods = {p.id: p for p in cg.period_set.periods}
    for c in cells:
        p = periods.get(c.period_id)
        if p is None:
            raise FieldError("period_id", f"Цаг (id {c.period_id}) энэ ангийн цагийн хүснэгтэд байхгүй.")
        if p.is_break:
            raise FieldError("period_id", f"{p.start_time:%H:%M}–{p.end_time:%H:%M} завсарлага тул хичээл оруулж болохгүй.")

    await _by_ids(db, Subject, {c.subject_id for c in cells}, "subject_id", "Хичээл олдсонгүй")
    teachers = await _by_ids(db, Teacher, {c.teacher_id for c in cells}, "teacher_id", "Багш олдсонгүй")
    rooms = await _by_ids(db, Room, {c.room_id for c in cells if c.room_id is not None}, "room_id", "Өрөө олдсонгүй")

    candidates = [
        Slot(class_group_id=cg.id, class_name=cg.name, weekday=c.weekday, period_id=c.period_id,
             period_order=periods[c.period_id].order, start=periods[c.period_id].start_time,
             end=periods[c.period_id].end_time, teacher_id=c.teacher_id, teacher_name=teachers[c.teacher_id].short_name,
             room_id=c.room_id, room_name=rooms[c.room_id].name if c.room_id is not None else "")
        for c in cells
    ]
    conflicts = find_conflicts(candidates, await load_slots(db, cg.year_id, exclude_class_id=cg.id))
    if conflicts:
        raise ConflictError(conflicts)
    return [Lesson(class_group_id=cg.id, weekday=c.weekday, period_id=c.period_id, subject_id=c.subject_id,
                   teacher_id=c.teacher_id, room_id=c.room_id) for c in cells]


async def save_grid(db: AsyncSession, cg: ClassGroup, cells: list[GridCell]) -> list[Lesson]:
    """Шалгаад ангийн хуучин хуваарийг устгаж шинээр бичнэ (flush хүртэл; commit-ийг дуудагч хийнэ)."""
    lessons = await validate_cells(db, cg, cells)
    await db.execute(delete(Lesson).where(Lesson.class_group_id == cg.id))
    db.add_all(lessons)
    await db.flush()
    return lessons
