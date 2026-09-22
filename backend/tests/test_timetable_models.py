from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.timetable.models import AcademicYear, ClassGroup, Lesson, Period
from tests.helpers import seed_timetable


async def test_seed_builds_expected_graph(db):
    tt = await seed_timetable(db)
    assert tt.classes["9а"].name == "9а" and tt.classes["9а"].period_set.name == "Дунд, ахлах анги"
    assert [p.order for p in tt.primary.periods] == [1, 101, 2] and tt.primary.periods[1].is_break is True
    assert tt.teachers["Б.Мухулай"].full_name == "Батаа Мухулай"
    assert [s.short_name for s in tt.teachers["Б.Мухулай"].subjects] == ["Мат"]


async def test_only_one_current_year(db):
    await seed_timetable(db)
    db.add(AcademicYear(name="2027–2028", start_date=date(2027, 9, 1), end_date=date(2028, 6, 10), is_current=True))
    with pytest.raises(IntegrityError):
        await db.flush()


async def test_lesson_slot_unique_per_class(db):
    tt = await seed_timetable(db)

    def mk():
        return Lesson(class_group_id=tt.classes["9а"].id, weekday=1, period_id=tt.p[("s", 1)].id,
                      subject_id=tt.subjects["Математик"].id, teacher_id=tt.teachers["Б.Мухулай"].id)

    db.add(mk())
    await db.flush()
    db.add(mk())
    with pytest.raises(IntegrityError):
        await db.flush()


async def test_deleting_year_cascades(db):
    tt = await seed_timetable(db)
    db.add(Lesson(class_group_id=tt.classes["9а"].id, weekday=1, period_id=tt.p[("s", 1)].id,
                  subject_id=tt.subjects["Математик"].id, teacher_id=tt.teachers["Б.Мухулай"].id))
    await db.flush()
    await db.delete(tt.year)
    await db.flush()
    assert (await db.execute(select(ClassGroup))).scalars().all() == []
    assert (await db.execute(select(Period))).scalars().all() == []
    assert (await db.execute(select(Lesson))).scalars().all() == []
