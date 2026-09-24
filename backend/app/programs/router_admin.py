"""
Хөтөлбөр — менежерийн API (manager эрх), prefix /api/programs/admin.
  GET/POST /programs/   GET/PATCH/DELETE /programs/{id}/   PUT /programs/order/   POST/DELETE /programs/{id}/cover/
  POST /programs/{id}/works/   PATCH/DELETE /works/{id}/   POST /works/{id}/image/   PUT /programs/{id}/works/order/
  POST /programs/{id}/scholarships/   PATCH/DELETE /scholarships/{id}/   POST/DELETE /scholarships/{id}/photo/   PUT /programs/{id}/scholarships/order/
  POST /upload-image/  (rich text дундах зураг)
"""

import re
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import require_role
from ..auth.models import User
from ..common.errors import FieldError
from ..common.media import delete_file, save_upload
from ..db import get_db
from ..news.sanitize import clean_html
from .models import Program, ProgramWork, Scholarship
from .schemas import (OrderIn, ProgramAdmin, ProgramAdminDetail, ProgramIn, ProgramPatch, ScholarshipIn, ScholarshipOut, ScholarshipPatch,
                      WorkOut, WorkPatch)
from .service import admin_detail_out, admin_out, get_or_404, list_programs, media_url, scholarship_out, unique_slug, work_out

router = APIRouter(prefix="/api/programs/admin", tags=["programs-admin"])
DB = Annotated[AsyncSession, Depends(get_db)]
Manager = Annotated[User, Depends(require_role("manager"))]


def _clean(v: str | None, field: str, msg: str) -> str:
    v = (v or "").strip()
    if not v:
        raise FieldError(field, msg)
    return v


_EMPTY_BODY_RE = re.compile(r"(\s*<p>\s*</p>\s*)*")


def _clean_body(html: str) -> str:
    """clean_html(...)-ийн үр дүнг цэвэрлэнэ: Tiptap хоосон үедээ "<p></p>" буцаадаг тул
    зөвхөн хоосон <p></p>-ээс тогтсон бол "" болгож, нийтэд харагдах хэсгийг нуух боломжтой болгоно."""
    html = clean_html(html)
    if _EMPTY_BODY_RE.fullmatch(html):
        return ""
    return html


def _check_grades(gf: int, gt: int) -> None:
    for field, g in (("grade_from", gf), ("grade_to", gt)):
        if not 1 <= g <= 12:
            raise FieldError(field, "Анги 1–12 байна.")
    if gf > gt:
        raise FieldError("grade_to", "Төгсөх анги эхлэх ангиас бага байж болохгүй.")


async def _program_files(p: Program) -> list[str]:
    return [r for r in [p.cover_image, *[w.image for w in p.works], *[s.photo for s in p.scholarships]] if r]


# ---- хөтөлбөр ----
@router.get("/programs/", response_model=list[ProgramAdmin])
async def programs_list(request: Request, db: DB, _: Manager):
    return [admin_out(request, p) for p in await list_programs(db, published_only=False)]


@router.post("/programs/", response_model=ProgramAdmin, status_code=201)
async def program_create(body: ProgramIn, request: Request, db: DB, _: Manager):
    name = _clean(body.name, "name", "Нэр оруулна уу.")
    badge = _clean(body.badge, "badge", "Badge оруулна уу.")
    _check_grades(body.grade_from, body.grade_to)
    mx = (await db.execute(select(func.max(Program.order)))).scalar_one()
    p = Program(slug=await unique_slug(db, name), name=name, badge=badge, summary=body.summary.strip(), grade_from=body.grade_from,
                grade_to=body.grade_to, body_html=_clean_body(body.body_html), is_published=body.is_published, order=(mx or 0) + 1)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return admin_out(request, p)


@router.get("/programs/{id}/", response_model=ProgramAdminDetail)
async def program_get(id: int, request: Request, db: DB, _: Manager):
    return admin_detail_out(request, await get_or_404(db, Program, id))


@router.patch("/programs/{id}/", response_model=ProgramAdmin)
async def program_patch(id: int, body: ProgramPatch, request: Request, db: DB, _: Manager):
    p = await get_or_404(db, Program, id)
    d = body.model_dump(exclude_unset=True)
    if "name" in d:
        p.name = _clean(d["name"], "name", "Нэр оруулна уу.")      # slug хэвээр
    if "badge" in d:
        p.badge = _clean(d["badge"], "badge", "Badge оруулна уу.")
    if d.get("summary") is not None:
        p.summary = d["summary"].strip()
    gf, gt = d.get("grade_from", p.grade_from), d.get("grade_to", p.grade_to)
    if gf is not None and gt is not None:
        _check_grades(gf, gt)
        p.grade_from, p.grade_to = gf, gt
    if d.get("body_html") is not None:
        p.body_html = _clean_body(d["body_html"])
    if d.get("is_published") is not None:
        p.is_published = d["is_published"]
    await db.commit()
    await db.refresh(p)
    return admin_out(request, p)


@router.delete("/programs/{id}/", status_code=204)
async def program_delete(id: int, db: DB, _: Manager):
    p = await get_or_404(db, Program, id)
    files = await _program_files(p)
    await db.delete(p)
    await db.commit()
    for rel in files:
        delete_file(rel)


@router.put("/programs/order/", response_model=list[ProgramAdmin])
async def programs_order(body: OrderIn, request: Request, db: DB, _: Manager):
    progs = await list_programs(db, published_only=False)
    if sorted(body.ids) != sorted(p.id for p in progs):
        raise FieldError("ids", "Бүх хөтөлбөрийн id байх ёстой.")
    pos = {pid: i + 1 for i, pid in enumerate(body.ids)}
    for p in progs:
        p.order = pos[p.id]
    await db.commit()
    return [admin_out(request, p) for p in await list_programs(db, published_only=False)]


@router.post("/programs/{id}/cover/", response_model=ProgramAdmin)
async def program_cover(id: int, request: Request, db: DB, _: Manager, image: Annotated[UploadFile, File()]):
    p = await get_or_404(db, Program, id)
    old = p.cover_image
    p.cover_image = await save_upload(image, "programs", "image")
    await db.commit()
    if old:
        delete_file(old)
    await db.refresh(p)
    return admin_out(request, p)


@router.delete("/programs/{id}/cover/", response_model=ProgramAdmin)
async def program_cover_delete(id: int, request: Request, db: DB, _: Manager):
    p = await get_or_404(db, Program, id)
    old = p.cover_image
    p.cover_image = None
    await db.commit()
    if old:
        delete_file(old)
    await db.refresh(p)
    return admin_out(request, p)


@router.post("/upload-image/", status_code=201)
async def upload_image(request: Request, _: Manager, image: Annotated[UploadFile, File()]):
    """Хэрэгжилтийн rich text дундах зураг: файлыг хадгалаад URL буцаана."""
    return {"url": media_url(request, await save_upload(image, "programs/body", "image"))}


# ---- бүтээлийн булан ----
async def _next_order(db: AsyncSession, model, program_id: int) -> int:
    mx = (await db.execute(select(func.max(model.order)).where(model.program_id == program_id))).scalar_one()
    return (mx or 0) + 1


@router.post("/programs/{id}/works/", response_model=WorkOut, status_code=201)
async def work_create(id: int, request: Request, db: DB, _: Manager, title: Annotated[str, Form()],
                      student: Annotated[str, Form()] = "", caption: Annotated[str, Form()] = "",
                      image: Annotated[UploadFile | None, File()] = None):
    p = await get_or_404(db, Program, id)
    if image is None or not image.filename:
        raise FieldError("image", "Зураг оруулна уу.")
    w = ProgramWork(program_id=p.id, title=_clean(title, "title", "Гарчиг оруулна уу."), student=student.strip(), caption=caption.strip(),
                    order=await _next_order(db, ProgramWork, p.id))
    w.image = await save_upload(image, "programs", "image")
    db.add(w)
    await db.commit()
    return work_out(request, w)


@router.patch("/works/{id}/", response_model=WorkOut)
async def work_patch(id: int, body: WorkPatch, request: Request, db: DB, _: Manager):
    w = await get_or_404(db, ProgramWork, id)
    d = body.model_dump(exclude_unset=True)
    if "title" in d:
        w.title = _clean(d["title"], "title", "Гарчиг оруулна уу.")
    if d.get("student") is not None:
        w.student = d["student"].strip()
    if d.get("caption") is not None:
        w.caption = d["caption"].strip()
    await db.commit()
    return work_out(request, w)


@router.post("/works/{id}/image/", response_model=WorkOut)
async def work_image(id: int, request: Request, db: DB, _: Manager, image: Annotated[UploadFile, File()]):
    w = await get_or_404(db, ProgramWork, id)
    old = w.image
    w.image = await save_upload(image, "programs", "image")
    await db.commit()
    delete_file(old)
    return work_out(request, w)


@router.delete("/works/{id}/", status_code=204)
async def work_delete(id: int, db: DB, _: Manager):
    w = await get_or_404(db, ProgramWork, id)
    old = w.image
    await db.delete(w)
    await db.commit()
    delete_file(old)


@router.put("/programs/{id}/works/order/", response_model=ProgramAdminDetail)
async def works_order(id: int, body: OrderIn, request: Request, db: DB, _: Manager):
    p = await get_or_404(db, Program, id)
    if sorted(body.ids) != sorted(w.id for w in p.works):
        raise FieldError("ids", "Хөтөлбөрийн бүх бүтээлийн id байх ёстой.")
    pos = {wid: i + 1 for i, wid in enumerate(body.ids)}
    for w in p.works:
        w.order = pos[w.id]
    await db.commit()
    await db.refresh(p)
    return admin_detail_out(request, p)


# ---- тэтгэлэг ----
def _check_scholarship(year: int | None, amount: int | None) -> None:
    if year is not None and not 2000 <= year <= 2100:
        raise FieldError("year", "Он 2000–2100 байна.")
    if amount is not None and amount < 0:
        raise FieldError("amount_usd", "Дүн сөрөг байж болохгүй.")


@router.post("/programs/{id}/scholarships/", response_model=ScholarshipOut, status_code=201)
async def scholarship_create(id: int, body: ScholarshipIn, request: Request, db: DB, _: Manager):
    p = await get_or_404(db, Program, id)
    name = _clean(body.student_name, "student_name", "Нэр оруулна уу.")
    _check_scholarship(body.year, body.amount_usd)
    s = Scholarship(program_id=p.id, student_name=name, university=body.university.strip(), year=body.year, amount_usd=body.amount_usd,
                    order=await _next_order(db, Scholarship, p.id))
    db.add(s)
    await db.commit()
    return scholarship_out(request, s)


@router.patch("/scholarships/{id}/", response_model=ScholarshipOut)
async def scholarship_patch(id: int, body: ScholarshipPatch, request: Request, db: DB, _: Manager):
    s = await get_or_404(db, Scholarship, id)
    d = body.model_dump(exclude_unset=True)
    _check_scholarship(d.get("year"), d.get("amount_usd"))
    if "student_name" in d:
        s.student_name = _clean(d["student_name"], "student_name", "Нэр оруулна уу.")
    if d.get("university") is not None:
        s.university = d["university"].strip()
    if d.get("year") is not None:
        s.year = d["year"]
    if d.get("amount_usd") is not None:
        s.amount_usd = d["amount_usd"]
    await db.commit()
    return scholarship_out(request, s)


@router.delete("/scholarships/{id}/", status_code=204)
async def scholarship_delete(id: int, db: DB, _: Manager):
    s = await get_or_404(db, Scholarship, id)
    old = s.photo
    await db.delete(s)
    await db.commit()
    if old:
        delete_file(old)


@router.post("/scholarships/{id}/photo/", response_model=ScholarshipOut)
async def scholarship_photo(id: int, request: Request, db: DB, _: Manager, photo: Annotated[UploadFile, File()]):
    s = await get_or_404(db, Scholarship, id)
    old = s.photo
    s.photo = await save_upload(photo, "programs", "photo")
    await db.commit()
    if old:
        delete_file(old)
    return scholarship_out(request, s)


@router.delete("/scholarships/{id}/photo/", response_model=ScholarshipOut)
async def scholarship_photo_delete(id: int, request: Request, db: DB, _: Manager):
    s = await get_or_404(db, Scholarship, id)
    old = s.photo
    s.photo = None
    await db.commit()
    if old:
        delete_file(old)
    return scholarship_out(request, s)


@router.put("/programs/{id}/scholarships/order/", response_model=ProgramAdminDetail)
async def scholarships_order(id: int, body: OrderIn, request: Request, db: DB, _: Manager):
    p = await get_or_404(db, Program, id)
    if sorted(body.ids) != sorted(s.id for s in p.scholarships):
        raise FieldError("ids", "Хөтөлбөрийн бүх тэтгэлгийн id байх ёстой.")
    pos = {sid: i + 1 for i, sid in enumerate(body.ids)}
    for s in p.scholarships:
        s.order = pos[s.id]
    await db.commit()
    await db.refresh(p)
    return admin_detail_out(request, p)
