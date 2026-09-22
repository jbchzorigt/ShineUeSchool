"""
Хуваарийн жишээ өгөгдөл (local тест, UI үзэхэд зориулав).

    uv run python scripts/seed_timetable.py           # 2026–2027 жил байхгүй бол л оруулна
    uv run python scripts/seed_timetable.py --reset   # тухайн жилийг (бүх хуваарьтай нь) устгаад дахин оруулна

⚠ Жишээ мэдээлэл: багш, ангийн нэрс зохиомол.
"""

import asyncio
import sys
from datetime import date, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.timetable.models import (  # noqa: E402
    AcademicYear, CalendarEvent, ClassGroup, CurriculumEntry, Lesson, Period, PeriodSet, Room, Subject, Teacher,
)

YEAR_NAME = "2026–2027"

SUBJECTS = [("Математик", "Мат", "#1e3a8f"), ("Монгол хэл", "Мон", "#b91c1c"), ("Англи хэл", "Анг", "#7c3aed"),
            ("Физик", "Физ", "#047857"), ("Хими", "Хим", "#d97706"), ("Биологи", "Био", "#65a30d"),
            ("Түүх", "Түү", "#9f1239"), ("Биеийн тамир", "БТ", "#0e7490")]
TEACHERS = [("Батаа", "Мухулай", "Б.Мухулай", ["Математик"]), ("Дорж", "Сараа", "Д.Сараа", ["Монгол хэл"]),
            ("Цэнд", "Болд", "Ц.Болд", ["Физик", "Математик"]), ("Ганбат", "Оюун", "Г.Оюун", ["Англи хэл"]),
            ("Насан", "Түвшин", "Н.Түвшин", ["Хими", "Биологи"]), ("Эрдэнэ", "Ариунаа", "Э.Ариунаа", ["Түүх"]),
            ("Лхагва", "Баяр", "Л.Баяр", ["Биеийн тамир"]), ("Сүх", "Наран", "С.Наран", ["Математик", "Монгол хэл"]),
            ("Бат", "Энхжин", "Б.Энхжин", ["Англи хэл"])]  # 1а-ийн багш нар 9а-тай давхцахгүй байхаар
ROOMS = [("101", 30, "classroom"), ("102", 30, "classroom"), ("204", 32, "classroom"), ("205", 32, "classroom"),
         ("Физикийн лаб", 24, "lab"), ("Спорт заал", 60, "gym")]
CLASSES = [(1, "а", "p", "Д.Сараа"), (1, "б", "p", "С.Наран"), (5, "а", "p", None),
           (9, "а", "s", "Б.Мухулай"), (9, "б", "s", "Ц.Болд"), (12, "а", "s", "Г.Оюун")]
# (хичээл, багш, өрөө) — 9а: 5 өдөр × 4 цаг; 1а: 5 өдөр × 3 цаг
GRID_9A = {
    1: [("Математик", "Б.Мухулай", "204"), ("Монгол хэл", "Д.Сараа", "204"), ("Физик", "Ц.Болд", "Физикийн лаб"), ("Англи хэл", "Г.Оюун", "204")],
    2: [("Англи хэл", "Г.Оюун", "204"), ("Математик", "Б.Мухулай", "204"), ("Хими", "Н.Түвшин", "204"), ("Түүх", "Э.Ариунаа", "204")],
    3: [("Математик", "Б.Мухулай", "204"), ("Биологи", "Н.Түвшин", "204"), ("Монгол хэл", "Д.Сараа", "204"), ("Биеийн тамир", "Л.Баяр", "Спорт заал")],
    4: [("Физик", "Ц.Болд", "Физикийн лаб"), ("Математик", "Б.Мухулай", "204"), ("Англи хэл", "Г.Оюун", "204"), ("Түүх", "Э.Ариунаа", "204")],
    5: [("Монгол хэл", "Д.Сараа", "204"), ("Хими", "Н.Түвшин", "204"), ("Математик", "Б.Мухулай", "204"), ("Биеийн тамир", "Л.Баяр", "Спорт заал")],
}
GRID_1A = {d: [("Монгол хэл", "С.Наран", "101"), ("Математик", "С.Наран", "101"), ("Англи хэл", "Б.Энхжин", "101")] for d in range(1, 6)}
CURRICULUM_9A = {"Математик": 5, "Монгол хэл": 3, "Англи хэл": 3, "Физик": 2, "Хими": 2, "Биологи": 1, "Түүх": 2, "Биеийн тамир": 2}
EVENTS = [
    ("1-р улирал", "term", date(2026, 9, 1), date(2026, 11, 6), "all"),
    ("Намрын амралт", "holiday", date(2026, 11, 7), date(2026, 11, 15), "all"),
    ("2-р улирал", "term", date(2026, 11, 16), date(2027, 1, 22), "all"),
    ("Өвлийн амралт", "holiday", date(2027, 1, 23), date(2027, 2, 7), "all"),
    ("3-р улирал", "term", date(2027, 2, 8), date(2027, 4, 2), "all"),
    ("Улирлын шалгалт", "exam", date(2027, 3, 29), date(2027, 4, 2), "secondary"),
    ("4-р улирал", "term", date(2027, 4, 12), date(2027, 6, 10), "all"),
    ("Ү.Маамын нэрэмжит олимпиад", "event", date(2027, 2, 20), date(2027, 2, 20), "all", "#7c3aed"),  # өөрийн өнгөтэй жишээ
]


def periods(set_id: int, start: time, minutes: int, count: int, long_break_after: int) -> list[Period]:
    """
    count хичээл, хооронд 10 мин завсарлага (long_break_after-ийн дараа 20 мин), завсарлага мөр болно.
    order: хичээлүүд 1..count дугаартай (харагдана), завсарлагууд 101, 102, ... дугаартай (харагдахгүй,
    зөвхөн start_time-аар эрэмблэгдэнэ).
    """
    out, lesson_order, break_order, cur = [], 1, 101, start
    for i in range(1, count + 1):
        end = _add(cur, minutes)
        out.append(Period(period_set_id=set_id, order=lesson_order, start_time=cur, end_time=end))
        lesson_order += 1
        if i < count:
            brk = 20 if i == long_break_after else 10
            out.append(Period(period_set_id=set_id, order=break_order, start_time=end, end_time=_add(end, brk), is_break=True))
            break_order += 1
            cur = _add(end, brk)
    return out


def _add(t: time, minutes: int) -> time:
    total = t.hour * 60 + t.minute + minutes
    return time(total // 60, total % 60)


async def main(reset: bool) -> None:
    async with SessionLocal() as db:
        existing = (await db.execute(select(AcademicYear).where(AcademicYear.name == YEAR_NAME))).scalar_one_or_none()
        if existing and not reset:
            print(f"{YEAR_NAME} жил аль хэдийн байна. --reset өгвөл дахин оруулна.")
            return
        if existing:
            await db.execute(delete(AcademicYear).where(AcademicYear.id == existing.id))
            await db.flush()
        has_current = (await db.execute(select(AcademicYear.id).where(AcademicYear.is_current.is_(True)))).first()
        year = AcademicYear(name=YEAR_NAME, start_date=date(2026, 9, 1), end_date=date(2027, 6, 10),
                            working_days=5, is_current=not has_current)
        db.add(year)
        await db.flush()

        sets = {"p": PeriodSet(year_id=year.id, name="Бага анги"), "s": PeriodSet(year_id=year.id, name="Дунд, ахлах анги")}
        db.add_all(sets.values())
        await db.flush()
        ps = {"p": periods(sets["p"].id, time(8, 30), 35, 5, 2), "s": periods(sets["s"].id, time(8, 0), 40, 7, 3)}
        db.add_all([*ps["p"], *ps["s"]])

        subjects = {n: (await db.execute(select(Subject).where(Subject.name == n))).scalar_one_or_none()
                    or Subject(name=n, short_name=s, color=c) for n, s, c in SUBJECTS}
        db.add_all(subjects.values())
        await db.flush()
        teachers = {}
        for ln, fn, sn, subs in TEACHERS:
            t = (await db.execute(select(Teacher).where(Teacher.short_name == sn))).scalar_one_or_none()
            if t is None:
                t = Teacher(last_name=ln, first_name=fn, short_name=sn, subjects=[subjects[s] for s in subs])
                db.add(t)
            teachers[sn] = t
        rooms = {}
        for n, cap, kind in ROOMS:
            r = (await db.execute(select(Room).where(Room.name == n))).scalar_one_or_none()
            if r is None:
                r = Room(name=n, capacity=cap, kind=kind)
                db.add(r)
            rooms[n] = r
        await db.flush()

        classes = {}
        for grade, letter, ps_key, homeroom in CLASSES:
            c = ClassGroup(year_id=year.id, grade=grade, letter=letter, period_set_id=sets[ps_key].id,
                           homeroom_teacher_id=teachers[homeroom].id if homeroom else None)
            db.add(c)
            classes[f"{grade}{letter}"] = c
        await db.flush()

        lesson_periods = {k: [p for p in v if not p.is_break] for k, v in ps.items()}
        for cname, grid, key in (("9а", GRID_9A, "s"), ("1а", GRID_1A, "p")):
            for weekday, cells in grid.items():
                for p, (subj, teacher, room) in zip(lesson_periods[key], cells):
                    db.add(Lesson(class_group_id=classes[cname].id, weekday=weekday, period_id=p.id,
                                  subject_id=subjects[subj].id, teacher_id=teachers[teacher].id, room_id=rooms[room].id))
        for subj, hours in CURRICULUM_9A.items():
            db.add(CurriculumEntry(class_group_id=classes["9а"].id, subject_id=subjects[subj].id, hours_per_week=hours))
        for title, cat, s, e, who, *color in EVENTS:
            db.add(CalendarEvent(year_id=year.id, title=title, category=cat, start_date=s, end_date=e, applies_to=who,
                                 color=color[0] if color else ""))
        await db.commit()
        print(f"{YEAR_NAME}: {len(classes)} анги, {len(subjects)} хичээл, {len(teachers)} багш, {len(rooms)} өрөө, "
              f"{len(EVENTS)} үйл явдал оруулав.")


if __name__ == "__main__":
    asyncio.run(main(reset="--reset" in sys.argv))
