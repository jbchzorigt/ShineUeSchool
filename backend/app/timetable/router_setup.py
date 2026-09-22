"""
Хуваарийн тохиргооны API (/api/timetable/). Унших нээлттэй, бичих manager.
  years/ (GET, POST), years/{id}/ (PATCH, DELETE), years/{id}/set-current/ (POST)
  period-sets/?year= (GET), period-sets/ (POST), period-sets/{id}/ (PATCH, DELETE)
  periods/ (POST), periods/{id}/ (PATCH, DELETE)
  subjects/, teachers/, rooms/
  classes/, curriculum/, calendar/
"""

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select, update

from ..common.errors import FieldError
from .common import DB, Manager, commit_or_400, delete_or_400, get_or_404, resolve_year
from .models import AcademicYear, CalendarEvent, ClassGroup, CurriculumEntry, Lesson, Period, PeriodSet, Room, Subject, Teacher
from .schemas import (
    CalendarIn, CalendarOut, CalendarPatch, ClassIn, ClassOut, ClassPatch, CurriculumIn, CurriculumOut,
    CurriculumPatch, PeriodIn, PeriodOut, PeriodPatch, PeriodSetIn, PeriodSetOut, PeriodSetPatch, RoomIn, RoomOut,
    RoomPatch, SubjectIn, SubjectOut, SubjectPatch, TeacherIn, TeacherOut, TeacherPatch, YearIn, YearOut, YearPatch,
)

router = APIRouter(prefix="/api/timetable", tags=["timetable"])


# ---- жил ----
def _check_year_dates(start_date, end_date) -> None:
    if end_date <= start_date:
        raise FieldError("end_date", "Дуусах огноо эхлэх огнооноос хойш байх ёстой.")


@router.get("/years/", response_model=list[YearOut])
async def years_list(db: DB):
    return (await db.execute(select(AcademicYear).order_by(AcademicYear.start_date.desc()))).scalars().all()


@router.post("/years/", response_model=YearOut, status_code=201)
async def year_create(body: YearIn, db: DB, _: Manager):
    count = (await db.execute(select(func.count(AcademicYear.id)))).scalar_one()
    _check_year_dates(body.start_date, body.end_date)
    y = AcademicYear(**body.model_dump(), is_current=(count == 0))  # эхний жил автоматаар одоогийн
    db.add(y)
    await commit_or_400(db, "name", "Ийм нэртэй хичээлийн жил байна.")
    return y


@router.patch("/years/{id}/", response_model=YearOut)
async def year_patch(id: int, body: YearPatch, db: DB, _: Manager):
    y = await get_or_404(db, AcademicYear, id)
    data = body.model_dump(exclude_unset=True)
    _check_year_dates(data.get("start_date", y.start_date), data.get("end_date", y.end_date))
    for k, v in data.items():
        setattr(y, k, v)
    await commit_or_400(db, "name", "Ийм нэртэй хичээлийн жил байна.")
    return y


@router.delete("/years/{id}/", status_code=204)
async def year_delete(id: int, db: DB, _: Manager):
    y = await get_or_404(db, AcademicYear, id)
    await db.delete(y)  # DB cascade: цагийн хүснэгт, анги, хуваарь, хөтөлбөр, календарь
    await db.commit()


@router.post("/years/{id}/set-current/", response_model=YearOut)
async def year_set_current(id: int, db: DB, _: Manager):
    y = await get_or_404(db, AcademicYear, id)
    await db.execute(update(AcademicYear).values(is_current=False))  # эхлээд бүгдийг унтраана (partial unique)
    y.is_current = True
    await db.commit()
    return y


# ---- цагийн хүснэгт ----
@router.get("/period-sets/", response_model=list[PeriodSetOut])
async def period_sets_list(db: DB, year: int | None = None):
    y = await resolve_year(db, year)
    if y is None:
        return []
    return (await db.execute(select(PeriodSet).where(PeriodSet.year_id == y.id).order_by(PeriodSet.name))).scalars().all()


@router.post("/period-sets/", response_model=PeriodSetOut, status_code=201)
async def period_set_create(body: PeriodSetIn, db: DB, _: Manager):
    if await db.get(AcademicYear, body.year_id) is None:
        raise FieldError("year_id", "Хичээлийн жил олдсонгүй.")
    ps = PeriodSet(**body.model_dump())
    db.add(ps)
    await commit_or_400(db, "name", "Энэ жилд ийм нэртэй цагийн хүснэгт байна.")
    await db.refresh(ps)  # periods=[] ачаална (selectin)
    return ps


@router.patch("/period-sets/{id}/", response_model=PeriodSetOut)
async def period_set_patch(id: int, body: PeriodSetPatch, db: DB, _: Manager):
    ps = await get_or_404(db, PeriodSet, id)
    ps.name = body.name
    await commit_or_400(db, "name", "Энэ жилд ийм нэртэй цагийн хүснэгт байна.")
    return ps


@router.delete("/period-sets/{id}/", status_code=204)
async def period_set_delete(id: int, db: DB, _: Manager):
    ps = await get_or_404(db, PeriodSet, id)
    await delete_or_400(db, ps, "Энэ цагийн хүснэгтийг анги эсвэл хуваарь ашиглаж байна.")


# ---- цаг ----
def _check_period(start_time, end_time) -> None:
    if end_time <= start_time:
        raise FieldError("end_time", "Дуусах цаг эхлэх цагаас хойш байх ёстой.")


@router.post("/periods/", response_model=PeriodOut, status_code=201)
async def period_create(body: PeriodIn, db: DB, _: Manager):
    if await db.get(PeriodSet, body.period_set_id) is None:
        raise FieldError("period_set_id", "Цагийн хүснэгт олдсонгүй.")
    _check_period(body.start_time, body.end_time)
    p = Period(**body.model_dump())
    db.add(p)
    await commit_or_400(db, "order", "Энэ хүснэгтэд ийм дугаартай цаг байна.")
    return p


@router.patch("/periods/{id}/", response_model=PeriodOut)
async def period_patch(id: int, body: PeriodPatch, db: DB, _: Manager):
    p = await get_or_404(db, Period, id)
    data = body.model_dump(exclude_unset=True)
    _check_period(data.get("start_time", p.start_time), data.get("end_time", p.end_time))
    merged_is_break = data.get("is_break", p.is_break)
    if merged_is_break and not p.is_break:
        lesson_count = (await db.execute(select(func.count(Lesson.id)).where(Lesson.period_id == p.id))).scalar_one()
        if lesson_count > 0:
            raise FieldError("is_break", "Энэ цагт хичээл байна.")
    for k, v in data.items():
        setattr(p, k, v)
    await commit_or_400(db, "order", "Энэ хүснэгтэд ийм дугаартай цаг байна.")
    return p


@router.delete("/periods/{id}/", status_code=204)
async def period_delete(id: int, db: DB, _: Manager):
    p = await get_or_404(db, Period, id)
    await delete_or_400(db, p, "Энэ цагт хичээл байна.")


# ---- хичээл ----
@router.get("/subjects/", response_model=list[SubjectOut])
async def subjects_list(db: DB):
    return (await db.execute(select(Subject).order_by(Subject.name))).scalars().all()


@router.post("/subjects/", response_model=SubjectOut, status_code=201)
async def subject_create(body: SubjectIn, db: DB, _: Manager):
    s = Subject(**body.model_dump())
    db.add(s)
    await commit_or_400(db, "name", "Ийм нэртэй хичээл байна.")
    return s


@router.patch("/subjects/{id}/", response_model=SubjectOut)
async def subject_patch(id: int, body: SubjectPatch, db: DB, _: Manager):
    s = await get_or_404(db, Subject, id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    await commit_or_400(db, "name", "Ийм нэртэй хичээл байна.")
    return s


@router.delete("/subjects/{id}/", status_code=204)
async def subject_delete(id: int, db: DB, _: Manager):
    s = await get_or_404(db, Subject, id)
    await delete_or_400(db, s, "Энэ хичээл хуваарьт ашиглагдаж байна.")


# ---- багш ----
def teacher_out(t: Teacher) -> TeacherOut:
    return TeacherOut(id=t.id, last_name=t.last_name, first_name=t.first_name, short_name=t.short_name,
                      full_name=t.full_name, is_active=t.is_active, subject_ids=[s.id for s in t.subjects])


async def _subjects_by_ids(db, ids: list[int]) -> list[Subject]:
    if not ids:
        return []
    subs = (await db.execute(select(Subject).where(Subject.id.in_(ids)))).scalars().all()
    if len(subs) != len(set(ids)):
        raise FieldError("subject_ids", "Хичээл олдсонгүй.")
    return list(subs)


@router.get("/teachers/", response_model=list[TeacherOut])
async def teachers_list(db: DB, active: bool | None = None):
    q = select(Teacher).order_by(Teacher.short_name)
    if active is not None:
        q = q.where(Teacher.is_active.is_(active))
    return [teacher_out(t) for t in (await db.execute(q)).scalars().all()]


@router.post("/teachers/", response_model=TeacherOut, status_code=201)
async def teacher_create(body: TeacherIn, db: DB, _: Manager):
    data = body.model_dump()
    subjects = await _subjects_by_ids(db, data.pop("subject_ids"))
    t = Teacher(**data, subjects=subjects)
    db.add(t)
    await commit_or_400(db, "short_name", "Ийм товч нэртэй багш байна.")
    return teacher_out(t)


@router.patch("/teachers/{id}/", response_model=TeacherOut)
async def teacher_patch(id: int, body: TeacherPatch, db: DB, _: Manager):
    t = await get_or_404(db, Teacher, id)
    data = body.model_dump(exclude_unset=True)
    if "subject_ids" in data:
        t.subjects = await _subjects_by_ids(db, data.pop("subject_ids") or [])
    for k, v in data.items():
        setattr(t, k, v)
    await commit_or_400(db, "short_name", "Ийм товч нэртэй багш байна.")
    return teacher_out(t)


@router.delete("/teachers/{id}/", status_code=204)
async def teacher_delete(id: int, db: DB, _: Manager):
    t = await get_or_404(db, Teacher, id)
    await delete_or_400(db, t, "Энэ багш хуваарьт байна.")


# ---- өрөө ----
@router.get("/rooms/", response_model=list[RoomOut])
async def rooms_list(db: DB):
    return (await db.execute(select(Room).order_by(Room.name))).scalars().all()


@router.post("/rooms/", response_model=RoomOut, status_code=201)
async def room_create(body: RoomIn, db: DB, _: Manager):
    r = Room(**body.model_dump())
    db.add(r)
    await commit_or_400(db, "name", "Ийм нэртэй өрөө байна.")
    return r


@router.patch("/rooms/{id}/", response_model=RoomOut)
async def room_patch(id: int, body: RoomPatch, db: DB, _: Manager):
    r = await get_or_404(db, Room, id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    await commit_or_400(db, "name", "Ийм нэртэй өрөө байна.")
    return r


@router.delete("/rooms/{id}/", status_code=204)
async def room_delete(id: int, db: DB, _: Manager):
    r = await get_or_404(db, Room, id)
    await db.delete(r)  # lessons.room_id → NULL
    await db.commit()


# ---- анги ----
def class_out(c: ClassGroup) -> ClassOut:
    return ClassOut(id=c.id, year_id=c.year_id, grade=c.grade, letter=c.letter, name=c.name,
                    period_set_id=c.period_set_id, homeroom_teacher_id=c.homeroom_teacher_id)


async def _check_class_refs(db, year_id: int, period_set_id: int, homeroom_teacher_id: int | None) -> None:
    ps = await db.get(PeriodSet, period_set_id)
    if ps is None:
        raise FieldError("period_set_id", "Цагийн хүснэгт олдсонгүй.")
    if ps.year_id != year_id:
        raise FieldError("period_set_id", "Цагийн хүснэгт энэ жилийнх биш.")
    if homeroom_teacher_id is not None and await db.get(Teacher, homeroom_teacher_id) is None:
        raise FieldError("homeroom_teacher_id", "Багш олдсонгүй.")


@router.get("/classes/", response_model=list[ClassOut])
async def classes_list(db: DB, year: int | None = None):
    y = await resolve_year(db, year)
    if y is None:
        return []
    q = select(ClassGroup).where(ClassGroup.year_id == y.id).order_by(ClassGroup.grade, ClassGroup.letter)
    return [class_out(c) for c in (await db.execute(q)).scalars().all()]


@router.post("/classes/", response_model=ClassOut, status_code=201)
async def class_create(body: ClassIn, db: DB, _: Manager):
    if await db.get(AcademicYear, body.year_id) is None:
        raise FieldError("year_id", "Хичээлийн жил олдсонгүй.")
    await _check_class_refs(db, body.year_id, body.period_set_id, body.homeroom_teacher_id)
    c = ClassGroup(**{**body.model_dump(), "letter": body.letter.strip()})
    db.add(c)
    await commit_or_400(db, "letter", "Энэ жилд ийм анги байна.")
    return class_out(c)


@router.patch("/classes/{id}/", response_model=ClassOut)
async def class_patch(id: int, body: ClassPatch, db: DB, _: Manager):
    c = await get_or_404(db, ClassGroup, id)
    data = body.model_dump(exclude_unset=True)
    if "letter" in data and data["letter"] is not None:
        data["letter"] = data["letter"].strip()
    merged_period_set_id = data.get("period_set_id", c.period_set_id)
    merged_homeroom_teacher_id = data.get("homeroom_teacher_id", c.homeroom_teacher_id)
    await _check_class_refs(db, c.year_id, merged_period_set_id, merged_homeroom_teacher_id)
    if merged_period_set_id != c.period_set_id:
        lesson_count = (await db.execute(select(func.count(Lesson.id)).where(Lesson.class_group_id == c.id))).scalar_one()
        if lesson_count > 0:
            raise FieldError("period_set_id", "Энэ ангид хуваарь байна; эхлээд хуваарийг хоослоно уу.")
    for k, v in data.items():
        if v is not None or k == "homeroom_teacher_id":
            setattr(c, k, v)
    await commit_or_400(db, "letter", "Энэ жилд ийм анги байна.")
    await db.refresh(c)
    return class_out(c)


@router.delete("/classes/{id}/", status_code=204)
async def class_delete(id: int, db: DB, _: Manager):
    c = await get_or_404(db, ClassGroup, id)
    await db.delete(c)  # cascade: хуваарь, хөтөлбөр
    await db.commit()


# ---- хөтөлбөр ----
@router.get("/curriculum/", response_model=list[CurriculumOut])
async def curriculum_list(db: DB, class_: Annotated[int | None, Query(alias="class")] = None):
    if class_ is None:
        raise FieldError("class", "Ангийг заана уу (?class=).")
    q = (select(CurriculumEntry).join(CurriculumEntry.subject).where(CurriculumEntry.class_group_id == class_)
         .order_by(Subject.name))
    return (await db.execute(q)).scalars().all()


@router.post("/curriculum/", response_model=CurriculumOut, status_code=201)
async def curriculum_create(body: CurriculumIn, db: DB, _: Manager):
    if await db.get(ClassGroup, body.class_group_id) is None:
        raise FieldError("class_group_id", "Анги олдсонгүй.")
    if await db.get(Subject, body.subject_id) is None:
        raise FieldError("subject_id", "Хичээл олдсонгүй.")
    e = CurriculumEntry(**body.model_dump())
    db.add(e)
    await commit_or_400(db, "subject_id", "Энэ ангид энэ хичээл аль хэдийн байна.")
    await db.refresh(e)
    return e


@router.patch("/curriculum/{id}/", response_model=CurriculumOut)
async def curriculum_patch(id: int, body: CurriculumPatch, db: DB, _: Manager):
    e = await get_or_404(db, CurriculumEntry, id)
    e.hours_per_week = body.hours_per_week
    await db.commit()
    return e


@router.delete("/curriculum/{id}/", status_code=204)
async def curriculum_delete(id: int, db: DB, _: Manager):
    e = await get_or_404(db, CurriculumEntry, id)
    await db.delete(e)
    await db.commit()


# ---- календарь ----
def _check_event_dates(start_date, end_date) -> None:
    if end_date < start_date:
        raise FieldError("end_date", "Дуусах огноо эхлэх огнооноос өмнө байж болохгүй.")


@router.get("/calendar/", response_model=list[CalendarOut])
async def calendar_list(db: DB, year: int | None = None):
    y = await resolve_year(db, year)
    if y is None:
        return []
    q = select(CalendarEvent).where(CalendarEvent.year_id == y.id).order_by(CalendarEvent.start_date, CalendarEvent.id)
    return (await db.execute(q)).scalars().all()


@router.post("/calendar/", response_model=CalendarOut, status_code=201)
async def calendar_create(body: CalendarIn, db: DB, _: Manager):
    if await db.get(AcademicYear, body.year_id) is None:
        raise FieldError("year_id", "Хичээлийн жил олдсонгүй.")
    _check_event_dates(body.start_date, body.end_date)
    e = CalendarEvent(**body.model_dump())
    db.add(e)
    await db.commit()
    return e


@router.patch("/calendar/{id}/", response_model=CalendarOut)
async def calendar_patch(id: int, body: CalendarPatch, db: DB, _: Manager):
    e = await get_or_404(db, CalendarEvent, id)
    data = body.model_dump(exclude_unset=True)
    _check_event_dates(data.get("start_date", e.start_date), data.get("end_date", e.end_date))
    for k, v in data.items():
        if v is not None:
            setattr(e, k, v)
    await db.commit()
    return e


@router.delete("/calendar/{id}/", status_code=204)
async def calendar_delete(id: int, db: DB, _: Manager):
    e = await get_or_404(db, CalendarEvent, id)
    await db.delete(e)
    await db.commit()
