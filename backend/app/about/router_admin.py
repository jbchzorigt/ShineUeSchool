"""
Бидний тухай — менежерийн API (manager эрх), prefix /api/about/admin.
  GET/PATCH /page/   POST /upload-image/
  GET/POST /leaders/   PATCH/DELETE /leaders/{id}/   POST/DELETE /leaders/{id}/photo/   PUT /leaders/order/
  GET/POST /departments/   PATCH/DELETE /departments/{id}/   PUT /departments/order/
  POST /departments/{id}/teachers/   PATCH/DELETE /teachers/{id}/   PUT /departments/{id}/teachers/order/
"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import require_role
from ..auth.models import User
from ..common.errors import FieldError
from ..common.media import delete_file, save_upload
from ..db import get_db
from ..news.sanitize import clean_html
from .models import Department, DeptTeacher, Leader
from .schemas import (DepartmentIn, DepartmentOut, DepartmentPatch, LeaderOut, LeaderPatch, LeadersOrderIn, OrderIn, PageOut,
                      PagePatch, TeacherIn, TeacherOut, TeacherPatch)
from .service import department_out, get_page, leader_out, list_departments, list_leaders, media_url, page_out

router = APIRouter(prefix="/api/about/admin", tags=["about-admin"])
DB = Annotated[AsyncSession, Depends(get_db)]
Manager = Annotated[User, Depends(require_role("manager"))]

STATS_MAX = 4
LEVEL_MAX = 10   # удирдлагын түвшний дээд хязгаар (admin "Түвшин нэмэх")


async def _get_or_404(db: AsyncSession, model, id: int):
    obj = await db.get(model, id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return obj


# ---- танилцуулгын тохиргоо ----
@router.get("/page/", response_model=PageOut)
async def page_get(db: DB, _: Manager):
    return page_out(await get_page(db))


@router.patch("/page/", response_model=PageOut)
async def page_patch(body: PagePatch, db: DB, _: Manager):
    p = await get_page(db)
    data = body.model_dump(exclude_unset=True)
    if "stats" in data and data["stats"] is not None:
        if len(data["stats"]) > STATS_MAX:
            raise FieldError("stats", "Үзүүлэлт 4-өөс олон байж болохгүй.")
        p.stats = [dict(s) for s in data["stats"]]
    if data.get("intro_title") is not None:
        p.intro_title = _clean_name(data["intro_title"], "intro_title", "Гарчиг оруулна уу.")
    if data.get("intro_html") is not None:
        p.intro_html = clean_html(data["intro_html"])
    await db.commit()
    return page_out(p)


@router.post("/upload-image/", status_code=201)
async def upload_image(request: Request, _: Manager, image: Annotated[UploadFile, File()]):
    """Танилцуулгын rich text дундах зураг: файлыг хадгалаад URL буцаана (мэдээнийхтэй ижил, manager эрхээр)."""
    return {"url": media_url(request, await save_upload(image, "about/body"))}


# ---- удирдлага ----
def _clean_name(v: str | None, field: str, msg: str) -> str:
    v = (v or "").strip()
    if not v:
        raise FieldError(field, msg)
    return v


def _check_level(level: int) -> int:
    if not 1 <= level <= LEVEL_MAX:
        raise FieldError("level", f"Түвшин 1–{LEVEL_MAX} байна.")
    return level


async def _next_order(db: AsyncSession, level: int) -> int:
    mx = (await db.execute(select(func.max(Leader.order)).where(Leader.level == level))).scalar_one()
    return (mx or 0) + 1


@router.get("/leaders/", response_model=list[LeaderOut])
async def leaders_list(request: Request, db: DB, _: Manager):
    return [leader_out(request, l) for l in await list_leaders(db)]


@router.post("/leaders/", response_model=LeaderOut, status_code=201)
async def leader_create(request: Request, db: DB, _: Manager, full_name: Annotated[str, Form()], position: Annotated[str, Form()],
                        level: Annotated[int, Form()], photo: Annotated[UploadFile | None, File()] = None):
    l = Leader(full_name=_clean_name(full_name, "full_name", "Нэр оруулна уу."),
               position=_clean_name(position, "position", "Албан тушаал оруулна уу."), level=_check_level(level))
    l.order = await _next_order(db, l.level)
    if photo is not None and photo.filename:
        l.photo = await save_upload(photo, "about", "photo")
    db.add(l)
    await db.commit()
    return leader_out(request, l)


@router.patch("/leaders/{id}/", response_model=LeaderOut)
async def leader_patch(id: int, body: LeaderPatch, request: Request, db: DB, _: Manager):
    l = await _get_or_404(db, Leader, id)
    d = body.model_dump(exclude_unset=True)
    if "full_name" in d:
        l.full_name = _clean_name(d["full_name"], "full_name", "Нэр оруулна уу.")
    if "position" in d:
        l.position = _clean_name(d["position"], "position", "Албан тушаал оруулна уу.")
    if d.get("level") is not None and d["level"] != l.level:
        l.level = _check_level(d["level"])
        l.order = await _next_order(db, l.level)
    await db.commit()
    return leader_out(request, l)


@router.delete("/leaders/{id}/", status_code=204)
async def leader_delete(id: int, db: DB, _: Manager):
    l = await _get_or_404(db, Leader, id)
    old = l.photo
    await db.delete(l)
    await db.commit()
    if old:
        delete_file(old)


@router.post("/leaders/{id}/photo/", response_model=LeaderOut)
async def leader_photo(id: int, request: Request, db: DB, _: Manager, photo: Annotated[UploadFile, File()]):
    l = await _get_or_404(db, Leader, id)
    old = l.photo
    l.photo = await save_upload(photo, "about", "photo")
    await db.commit()
    if old:
        delete_file(old)
    return leader_out(request, l)


@router.delete("/leaders/{id}/photo/", response_model=LeaderOut)
async def leader_photo_delete(id: int, request: Request, db: DB, _: Manager):
    l = await _get_or_404(db, Leader, id)
    old = l.photo
    l.photo = None
    await db.commit()
    if old:
        delete_file(old)
    return leader_out(request, l)


@router.put("/leaders/order/", response_model=list[LeaderOut])
async def leaders_order(body: LeadersOrderIn, request: Request, db: DB, _: Manager):
    leaders = await list_leaders(db)
    if sorted(i.id for i in body.items) != sorted(l.id for l in leaders):
        raise FieldError("items", "Бүх гишүүний id байх ёстой.")
    by_id = {i.id: i for i in body.items}
    for l in leaders:
        l.level = _check_level(by_id[l.id].level)
        l.order = by_id[l.id].order
    await db.commit()
    return [leader_out(request, l) for l in await list_leaders(db)]


# ---- тэнхим, багш ----
@router.get("/departments/", response_model=list[DepartmentOut])
async def departments_list(db: DB, _: Manager):
    return [department_out(d) for d in await list_departments(db)]


@router.post("/departments/", response_model=DepartmentOut, status_code=201)
async def department_create(body: DepartmentIn, db: DB, _: Manager):
    mx = (await db.execute(select(func.max(Department.order)))).scalar_one()
    d = Department(name=_clean_name(body.name, "name", "Нэр оруулна уу."), order=(mx or 0) + 1)
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return department_out(d)


@router.patch("/departments/{id}/", response_model=DepartmentOut)
async def department_patch(id: int, body: DepartmentPatch, db: DB, _: Manager):
    d = await _get_or_404(db, Department, id)
    if body.name is not None:
        d.name = _clean_name(body.name, "name", "Нэр оруулна уу.")
    await db.commit()
    await db.refresh(d)
    return department_out(d)


@router.delete("/departments/{id}/", status_code=204)
async def department_delete(id: int, db: DB, _: Manager):
    d = await _get_or_404(db, Department, id)
    await db.delete(d)
    await db.commit()


@router.put("/departments/order/", response_model=list[DepartmentOut])
async def departments_order(body: OrderIn, db: DB, _: Manager):
    deps = await list_departments(db)
    if sorted(body.ids) != sorted(d.id for d in deps):
        raise FieldError("ids", "Бүх тэнхимийн id байх ёстой.")
    pos = {did: i + 1 for i, did in enumerate(body.ids)}
    for d in deps:
        d.order = pos[d.id]
    await db.commit()
    return [department_out(d) for d in await list_departments(db)]


@router.post("/departments/{id}/teachers/", response_model=TeacherOut, status_code=201)
async def teacher_create(id: int, body: TeacherIn, db: DB, _: Manager):
    d = await _get_or_404(db, Department, id)
    mx = (await db.execute(select(func.max(DeptTeacher.order)).where(DeptTeacher.department_id == d.id))).scalar_one()
    t = DeptTeacher(department_id=d.id, full_name=_clean_name(body.full_name, "full_name", "Нэр оруулна уу."),
                    role=body.role.strip(), is_head=body.is_head, order=(mx or 0) + 1)
    db.add(t)
    await db.commit()
    return TeacherOut(id=t.id, full_name=t.full_name, role=t.role, is_head=t.is_head)


@router.patch("/teachers/{id}/", response_model=TeacherOut)
async def teacher_patch(id: int, body: TeacherPatch, db: DB, _: Manager):
    t = await _get_or_404(db, DeptTeacher, id)
    d = body.model_dump(exclude_unset=True)
    if "full_name" in d:
        t.full_name = _clean_name(d["full_name"], "full_name", "Нэр оруулна уу.")
    if d.get("role") is not None:
        t.role = d["role"].strip()
    if d.get("is_head") is not None:
        t.is_head = d["is_head"]
    await db.commit()
    return TeacherOut(id=t.id, full_name=t.full_name, role=t.role, is_head=t.is_head)


@router.delete("/teachers/{id}/", status_code=204)
async def teacher_delete(id: int, db: DB, _: Manager):
    t = await _get_or_404(db, DeptTeacher, id)
    await db.delete(t)
    await db.commit()


@router.put("/departments/{id}/teachers/order/", response_model=DepartmentOut)
async def teachers_order(id: int, body: OrderIn, db: DB, _: Manager):
    d = await _get_or_404(db, Department, id)
    if sorted(body.ids) != sorted(t.id for t in d.teachers):
        raise FieldError("ids", "Тэнхимийн бүх багшийн id байх ёстой.")
    pos = {tid: i + 1 for i, tid in enumerate(body.ids)}
    for t in d.teachers:
        t.order = pos[t.id]
    await db.commit()
    await db.refresh(d)
    return department_out(d)
