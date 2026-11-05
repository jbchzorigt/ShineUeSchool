"""
Элсэлт — админы API ("admissions" хэсгийн эрх: GET — харах, бусад — засах).
  GET/POST /api/admissions/admin/rounds/          PATCH/DELETE /rounds/{id}/
     PATCH: registration_open/registration_deadline, results_published/results_deadline — асаахад ирээдүйн хугацаа заавал;
     хугацаа өнгөрмөгц service.expire_sections() автоматаар унтраана.
  GET  /rounds/{id}/applicants/?grade=&q=         PATCH /applicants/{id}/
  GET  /rounds/{id}/applicants.xlsx (засах эрх: бүх хувийн мэдээллийн экспорт)   POST /rounds/{id}/results/  (Excel: Код, Оноо, Дүн)
"""

import asyncio
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import require_section
from ..auth.models import User
from ..common.errors import FieldError
from ..db import get_db
from .excel import build_applicants_xlsx, parse_results_xlsx
from .models import APP_REGISTERED, AdmissionRound, Applicant
from .schemas import ApplicantAdminOut, ApplicantPatch, ImportReport, RoundAdminOut, RoundIn, RoundPatch
from .service import expire_sections, normalize_code, round_admin_out

router = APIRouter(prefix="/api/admissions/admin", tags=["admissions-admin"])
DB = Annotated[AsyncSession, Depends(get_db)]
Manager = Annotated[User, Depends(require_section("admissions"))]
Editor = Annotated[User, Depends(require_section("admissions", "edit"))]
MAX_UPLOAD = 5 * 1024 * 1024


async def _get_or_404(db: AsyncSession, model, id: int):
    obj = await db.get(model, id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return obj


# ---- ээлж ----
@router.get("/rounds/", response_model=list[RoundAdminOut])
async def rounds_list(db: DB, _: Manager):
    await expire_sections(db)
    rounds = (await db.execute(select(AdmissionRound).order_by(AdmissionRound.id.desc()))).scalars().all()
    return [await round_admin_out(db, r) for r in rounds]


@router.post("/rounds/", response_model=RoundAdminOut, status_code=201)
async def round_create(body: RoundIn, db: DB, _: Manager):
    rnd = AdmissionRound(**body.model_dump(), is_active=False, results_published=False)
    db.add(rnd)
    await db.commit()
    await db.refresh(rnd)
    return await round_admin_out(db, rnd)


def _section_patch(rnd: AdmissionRound, data: dict, flag: str, deadline_key: str, now: datetime) -> None:
    """Нэг хэсгийн товч + хугацааг шалгаж тохируулна. Асаалттай байх (эсвэл асаах) үед хугацаа ирээдүйд байх ёстой."""
    enable = data.pop(flag, None)
    deadline = data.pop(deadline_key, getattr(rnd, deadline_key))
    will_be_on = enable if enable is not None else getattr(rnd, flag)
    if will_be_on and (deadline is None or deadline <= now):
        raise FieldError(deadline_key, "Асаахын тулд ирээдүйн эцсийн хугацаа тохируулна уу.")
    setattr(rnd, deadline_key, deadline)
    if enable is not None:
        setattr(rnd, flag, enable)


@router.patch("/rounds/{id}/", response_model=RoundAdminOut)
async def round_patch(id: int, body: RoundPatch, db: DB, _: Manager):
    await expire_sections(db)
    rnd = await _get_or_404(db, AdmissionRound, id)
    data = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    now = datetime.now(UTC)
    was_published = rnd.results_published
    # Нэг л хэсэг асаалттай байж болно — нөгөөг нь эхлээд унтраана (баазын CHECK ч хамгаална).
    # Мөрийг өөрчлөхөөс ӨМНӨ шалгана: татгалзсан өөрчлөлт session-д үлдэж дараа нь flush хийгдэхээс сэргийлнэ.
    if data.get("registration_open", rnd.registration_open) and data.get("results_published", rnd.results_published):
        if rnd.registration_open:
            raise FieldError("results_published", "Шалгалтын бүртгэл асаалттай байна. Дүнг асаахын өмнө бүртгэлийг унтраана уу.")
        if rnd.results_published:
            raise FieldError("registration_open", "Шалгалтын дүн асаалттай байна. Бүртгэлийг асаахын өмнө дүнг унтраана уу.")
        raise FieldError("results_published", "Бүртгэл, дүн хоёрыг зэрэг асаах боломжгүй.")
    _section_patch(rnd, data, "registration_open", "registration_deadline", now)
    _section_patch(rnd, data, "results_published", "results_deadline", now)
    if rnd.results_published and not was_published:
        rnd.results_published_at = now
    if "grades" in data:
        used = (await db.execute(select(Applicant.grade).where(
            Applicant.round_id == rnd.id, Applicant.status == APP_REGISTERED).distinct())).scalars().all()
        missing = sorted(set(used) - set(data["grades"]))
        if missing:
            raise FieldError("grades", f"{', '.join(map(str, missing))}-р ангид бүртгэл байгаа тул хасах боломжгүй")
    if data.pop("is_active", None) is True:
        await db.execute(update(AdmissionRound).where(AdmissionRound.id != rnd.id).values(is_active=False))
        rnd.is_active = True
    elif body.is_active is False:
        rnd.is_active = False
    for k, v in data.items():
        setattr(rnd, k, v)
    await db.commit()
    return await round_admin_out(db, rnd)


@router.delete("/rounds/{id}/", status_code=204)
async def round_delete(id: int, db: DB, _: Manager):
    rnd = await _get_or_404(db, AdmissionRound, id)
    n = (await db.execute(select(func.count(Applicant.id)).where(Applicant.round_id == rnd.id))).scalar_one()
    if n:
        raise HTTPException(status.HTTP_409_CONFLICT, "Бүртгэлтэй ээлжийг устгах боломжгүй")
    await db.delete(rnd)
    await db.commit()


# ---- элсэгчид ----
@router.get("/rounds/{id}/applicants/", response_model=list[ApplicantAdminOut])
async def applicants_list(id: int, db: DB, _: Manager, grade: int | None = None, q: str | None = None):
    await _get_or_404(db, AdmissionRound, id)
    stmt = select(Applicant).where(Applicant.round_id == id)
    if grade is not None:
        stmt = stmt.where(Applicant.grade == grade)
    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Applicant.code.ilike(f"%{normalize_code(q)}%"), Applicant.child_last_name.ilike(like),
                              Applicant.child_first_name.ilike(like), Applicant.email.ilike(like), Applicant.phone.ilike(like)))
    stmt = stmt.order_by(Applicant.grade, Applicant.status != APP_REGISTERED, Applicant.child_last_name, Applicant.id)
    return (await db.execute(stmt)).scalars().all()


@router.patch("/applicants/{id}/", response_model=ApplicantAdminOut)
async def applicant_patch(id: int, body: ApplicantPatch, db: DB, _: Manager):
    a = await _get_or_404(db, Applicant, id)
    if body.clear_result:
        a.score, a.result = None, None
    else:
        if body.score is not None:
            a.score = body.score
        if body.result is not None:
            a.result = body.result
    if body.status is not None:
        a.status = body.status
    await db.commit()
    await db.refresh(a)
    return a


@router.get("/rounds/{id}/applicants.xlsx")
async def applicants_xlsx(id: int, db: DB, _: Editor):
    await _get_or_404(db, AdmissionRound, id)
    apps = (await db.execute(select(Applicant).where(Applicant.round_id == id))).scalars().all()
    data = await asyncio.to_thread(build_applicants_xlsx, list(apps))
    return Response(data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="admission-{id}.xlsx"'})


@router.post("/rounds/{id}/results/", response_model=ImportReport)
async def results_import(id: int, db: DB, _: Manager, file: Annotated[UploadFile, File()]):
    """Код, Оноо, Дүн баганатай Excel. Нэг ч алдаа байвал юу ч хадгалахгүй — бүх алдааг жагсааж буцаана."""
    await _get_or_404(db, AdmissionRound, id)
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise FieldError("file", "Файл 5 MB-аас том байж болохгүй.")
    rows, errors, blank = await asyncio.to_thread(parse_results_xlsx, data)

    apps = {a.code: a for a in (await db.execute(select(Applicant).where(Applicant.round_id == id))).scalars()}
    seen: dict[str, int] = {}
    for r in rows:
        if r.code in seen:
            errors.append(f"{r.row}-р мөр: {r.code} код {seen[r.code]}-р мөрөнд давхардсан.")
        elif r.code not in apps:
            errors.append(f"{r.row}-р мөр: {r.code} код энэ элсэлтэд олдсонгүй.")
        seen.setdefault(r.code, r.row)
    if errors:
        return ImportReport(applied=False, updated=0, unchanged=0, skipped_blank=blank, errors=errors)

    updated = unchanged = 0
    for r in rows:
        a = apps[r.code]
        new_score = r.score if r.score is not None else a.score
        new_result = r.result if r.result is not None else a.result
        if new_score == a.score and new_result == a.result:
            unchanged += 1
            continue
        a.score, a.result = new_score, new_result
        updated += 1
    await db.commit()
    return ImportReport(applied=True, updated=updated, unchanged=unchanged, skipped_blank=blank, errors=[])
