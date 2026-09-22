"""
Олимпиадын API. Унших нээлттэй, бичих staff.

  GET  /api/olympiad/years/                      → {"schedule": [...], "results": [...]}
  GET  /api/olympiad/stats/                      → админ дашбоардын тоон үзүүлэлт
  GET  /api/olympiad/categories/?year=           → [{value, label}]
  GET  /api/olympiad/schedule/?year=             → шатууд (order-оор)
  GET  /api/olympiad/results/?year=&category=    → үр дүн (байртай)
  GET  /api/olympiad/album/                      → нийтлэгдсэн зургууд (staff: бүгд)
  GET  /api/olympiad/page/                        → хуудасны тохиргоо (эхний удаад анхдагчаар үүснэ)
  PATCH /api/olympiad/page/                       → тохиргоо засах (staff)
  POST  /api/olympiad/page/portrait/               → хөрөг зураг оруулах (staff)
  DELETE /api/olympiad/page/portrait/              → хөрөг зураг устгах (staff)
"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import optional_user, require_staff
from ..auth.models import User
from ..common.errors import FieldError
from ..common.media import delete_file, save_upload
from ..config import settings
from ..db import get_db
from .importer import import_workbook, parse_workbook
from .models import CATEGORIES, CATEGORY_LABELS, PAGE_DEFAULTS, AlbumPhoto, OlympiadPage, Result, Stage
from .schemas import (
    AlbumOut, AlbumPatch, PageOut, PagePatch, ResultIn, ResultOut, ResultPatch, StageIn, StageOut, StagePatch,
    StatItem,
)

router = APIRouter(prefix="/api/olympiad", tags=["olympiad"])

DB = Annotated[AsyncSession, Depends(get_db)]


def result_out(r: Result, rank: int | None) -> ResultOut:
    return ResultOut(
        id=r.id, year=r.year, category=r.category, category_label=CATEGORY_LABELS.get(r.category, r.category),
        rank=r.rank or rank, rank_label=r.rank_label, medal=r.medal, last_name=r.last_name, first_name=r.first_name,
        student=r.student, full_name=r.full_name, school=r.school, code=r.code,
        scores=[None if s is None else float(s) for s in (r.scores or [])],
        score=None if r.score is None else float(r.score), note=r.note,
    )


def _media_url(request: Request, rel: str) -> str:
    if settings.media_base_url:
        return f"{settings.media_base_url.rstrip('/')}/media/{rel}"
    return f"{request.base_url}media/{rel}"


def album_out(request: Request, p: AlbumPhoto) -> AlbumOut:
    return AlbumOut(id=p.id, order=p.order, title=p.title, caption=p.caption, is_published=p.is_published,
                    image=_media_url(request, p.image))


@router.get("/years/")
async def years(db: DB):
    sched = (await db.execute(select(Stage.year).distinct().order_by(Stage.year))).scalars().all()
    res = (await db.execute(select(Result.year).distinct().order_by(Result.year))).scalars().all()
    return {"schedule": list(sched), "results": list(res)}


@router.get("/categories/")
async def categories(db: DB, year: int | None = None):
    if year is None:
        return CATEGORIES
    present = set((await db.execute(select(Result.category).where(Result.year == year).distinct())).scalars().all())
    return [c for c in CATEGORIES if c["value"] in present]


@router.get("/stats/")
async def stats(db: DB):
    stages = (await db.execute(select(func.count(Stage.id)))).scalar_one()
    results = (await db.execute(select(func.count(Result.id)))).scalar_one()
    photos = (await db.execute(select(func.count(AlbumPhoto.id)))).scalar_one()
    by_year = (await db.execute(
        select(Result.year, func.count(Result.id)).group_by(Result.year).order_by(Result.year)
    )).all()
    latest = (await db.execute(select(func.max(Stage.year)))).scalar_one()
    return {
        "stages": stages, "results": results, "photos": photos,
        "results_by_year": [{"year": y, "count": c} for y, c in by_year],
        "latest_year": latest,
    }


@router.get("/schedule/", response_model=list[StageOut])
async def schedule_list(db: DB, year: int | None = None):
    q = select(Stage).order_by(Stage.year, Stage.order)
    if year is not None:
        q = q.where(Stage.year == year)
    return (await db.execute(q)).scalars().all()


def _ranked_results_query(year: int | None, category: str | None):
    """Оноогоор он+ангилал дотор RANK() тооцсон query. Мөр: (Result, computed_rank)."""
    rank_col = func.rank().over(
        partition_by=[Result.year, Result.category], order_by=Result.score.desc().nulls_last()
    ).label("computed_rank")
    q = select(Result, rank_col)
    if year is not None:
        q = q.where(Result.year == year)
    if category is not None:
        q = q.where(Result.category == category)
    return q.order_by(Result.year, Result.category, rank_col, Result.last_name, Result.first_name)


@router.get("/results/", response_model=list[ResultOut])
async def results_list(db: DB, year: int | None = None, category: str | None = None):
    rows = (await db.execute(_ranked_results_query(year, category))).all()
    return [result_out(r, int(rank)) for r, rank in rows]


@router.get("/album/", response_model=list[AlbumOut])
async def album_list(request: Request, db: DB, user: Annotated[User | None, Depends(optional_user)]):
    q = select(AlbumPhoto).order_by(AlbumPhoto.order, AlbumPhoto.id)
    if not (user and user.is_staff):
        q = q.where(AlbumPhoto.is_published.is_(True))
    return [album_out(request, p) for p in (await db.execute(q)).scalars().all()]


Staff = Annotated[User, Depends(require_staff)]


async def _get_or_404(db: AsyncSession, model, id: int):
    obj = await db.get(model, id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return obj


# ---- шатууд ----
@router.post("/schedule/", response_model=StageOut, status_code=201)
async def stage_create(body: StageIn, db: DB, _: Staff):
    s = Stage(**body.model_dump())
    db.add(s)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise FieldError("order", "Энэ онд ийм дараалалтай шат аль хэдийн байна.") from None
    await db.commit()
    return s


@router.patch("/schedule/{id}/", response_model=StageOut)
async def stage_patch(id: int, body: StagePatch, db: DB, _: Staff):
    s = await _get_or_404(db, Stage, id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise FieldError("order", "Энэ онд ийм дараалалтай шат аль хэдийн байна.") from None
    await db.commit()
    return s


@router.delete("/schedule/{id}/", status_code=204)
async def stage_delete(id: int, db: DB, _: Staff):
    s = await _get_or_404(db, Stage, id)
    await db.delete(s)
    await db.commit()


# ---- үр дүн ----
async def _rank_of(db: AsyncSession, r: Result) -> int | None:
    rows = (await db.execute(_ranked_results_query(r.year, r.category))).all()
    return next((int(rank) for row, rank in rows if row.id == r.id), None)


@router.post("/results/", response_model=ResultOut, status_code=201)
async def result_create(body: ResultIn, db: DB, _: Staff):
    r = Result(**body.model_dump())
    db.add(r)
    await db.commit()
    return result_out(r, await _rank_of(db, r))


@router.post("/results/import/")
async def results_import(db: DB, _: Staff, file: Annotated[UploadFile, File()],
                         year: Annotated[int | None, Form()] = None,
                         dry_run: Annotated[str | None, Form()] = None,
                         replace: Annotated[str | None, Form()] = None):
    """Excel-ээс үр дүн импортлох. dry_run=true бол зөвхөн шалгаад тайлан буцаана."""
    if not (file.filename or "").lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise FieldError("file", "Зөвхөн Excel (.xlsx) файл хүлээн авна.")
    if year is not None and not (2000 <= year <= 2100):
        raise FieldError("year", "Он 2000–2100 хооронд байх ёстой.")
    try:
        parsed = parse_workbook(await file.read(), year)
    except Exception as e:  # noqa: BLE001
        raise FieldError("file", f"Файлыг уншиж чадсангүй: {e}")
    year = year or (parsed.detected_date.year if parsed.detected_date else None)
    if not year:
        raise FieldError("year", "Оныг тодорхойлж чадсангүй. Оноо оруулна уу.")
    is_dry = _to_bool(dry_run, False)
    payload = {
        "year": year, "detected_date": parsed.detected_date.isoformat() if parsed.detected_date else None,
        "total": parsed.total, "sheets": [s.summary() for s in parsed.sheets], "dry_run": is_dry,
    }
    if not is_dry:
        payload.update(await import_workbook(db, parsed, year, replace=_to_bool(replace, True)))
    return payload


@router.patch("/results/{id}/", response_model=ResultOut)
async def result_patch(id: int, body: ResultPatch, db: DB, _: Staff):
    r = await _get_or_404(db, Result, id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    await db.commit()
    return result_out(r, await _rank_of(db, r))


@router.delete("/results/{id}/", status_code=204)
async def result_delete(id: int, db: DB, _: Staff):
    r = await _get_or_404(db, Result, id)
    await db.delete(r)
    await db.commit()


# ---- албум ----
def _to_bool(v: str | None, default: bool) -> bool:
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


@router.post("/album/", response_model=AlbumOut, status_code=201)
async def album_create(request: Request, db: DB, _: Staff,
                       image: Annotated[UploadFile, File()], title: Annotated[str, Form()],
                       caption: Annotated[str, Form()],
                       order: Annotated[int, Form()] = 1, is_published: Annotated[str | None, Form()] = None):
    title = title.strip()
    if not title:
        raise FieldError("title", "Гарчиг хоосон байж болохгүй.")
    if len(title) > 120:
        raise FieldError("title", "Гарчиг 120 тэмдэгтээс урт байж болохгүй.")
    rel = await save_upload(image, "album")
    p = AlbumPhoto(image=rel, title=title, caption=caption, order=order, is_published=_to_bool(is_published, True))
    db.add(p)
    await db.commit()
    return album_out(request, p)


@router.patch("/album/{id}/", response_model=AlbumOut)
async def album_patch(id: int, body: AlbumPatch, request: Request, db: DB, _: Staff):
    p = await _get_or_404(db, AlbumPhoto, id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    await db.commit()
    return album_out(request, p)


@router.delete("/album/{id}/", status_code=204)
async def album_delete(id: int, db: DB, _: Staff):
    p = await _get_or_404(db, AlbumPhoto, id)
    rel = p.image
    await db.delete(p)
    await db.commit()
    delete_file(rel)


# ---- олимпиадын хуудасны тохиргоо ----
async def get_page(db: AsyncSession) -> OlympiadPage:
    """Нэг мөрт тохиргоо; байхгүй бол анхдагч утгаар үүсгэнэ (зэрэг үүсгэх оролдлогод хоёр дахь нь дахин уншина)."""
    p = await db.get(OlympiadPage, 1)
    if p is not None:
        return p
    db.add(OlympiadPage(id=1, **PAGE_DEFAULTS))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
    return await db.get(OlympiadPage, 1)  # type: ignore[return-value]


def page_out(request: Request, p: OlympiadPage) -> PageOut:
    return PageOut(
        eyebrow=p.eyebrow, title=p.title, bio=p.bio,
        portrait_image=_media_url(request, p.portrait_image) if p.portrait_image else None,
        portrait_caption=p.portrait_caption, about_title=p.about_title, about_lead=p.about_lead,
        stats=[StatItem(**s) for s in (p.stats or [])],
        contact_address=p.contact_address, contact_phone=p.contact_phone, contact_email=p.contact_email,
    )


@router.get("/page/", response_model=PageOut)
async def page_get(request: Request, db: DB):
    return page_out(request, await get_page(db))


@router.patch("/page/", response_model=PageOut)
async def page_patch(body: PagePatch, request: Request, db: DB, _: Staff):
    p = await get_page(db)
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(p, k, [dict(s) for s in v] if k == "stats" else v)
    await db.commit()
    return page_out(request, p)


@router.post("/page/portrait/", response_model=PageOut)
async def page_portrait(request: Request, db: DB, _: Staff, image: Annotated[UploadFile, File()]):
    p = await get_page(db)
    old = p.portrait_image
    p.portrait_image = await save_upload(image, "olympiad")
    await db.commit()
    if old:
        delete_file(old)
    return page_out(request, p)


@router.delete("/page/portrait/", response_model=PageOut)
async def page_portrait_delete(request: Request, db: DB, _: Staff):
    p = await get_page(db)
    old = p.portrait_image
    p.portrait_image = None
    await db.commit()
    if old:
        delete_file(old)
    return page_out(request, p)
