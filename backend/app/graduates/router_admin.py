"""
Төгсөгчид — менежерийн API (manager эрх), prefix /api/graduates/admin.
  GET/PATCH /stats/                     → нүүрний тоонууд (нийт төгсөгч, их дээд сургуульд элссэн хувь/тоо, гадаад)
  GET /catalogue/                       → улсын каталог (код, нэр, тив, координат) — select-д; тив автоматаар
  GET/POST /countries/   PATCH/DELETE /countries/{id}/   PUT /countries/order/
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import require_role
from ..auth.models import User
from ..common.errors import FieldError
from ..db import get_db
from .countries import CATALOGUE
from .models import GraduateCountry
from .schemas import CatalogueItem, DestinationIn, DestinationOut, DestinationPatch, OrderIn, StatsOut, StatsPatch
from .service import apply_stats, clean_universities, get_stats, list_countries, out, stats_out

router = APIRouter(prefix="/api/graduates/admin", tags=["graduates-admin"])
DB = Annotated[AsyncSession, Depends(get_db)]
Manager = Annotated[User, Depends(require_role("manager"))]


async def _get(db: AsyncSession, cid: int) -> GraduateCountry:
    c = await db.get(GraduateCountry, cid)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return c


@router.get("/stats/", response_model=StatsOut)
async def stats_get(db: DB, _: Manager):
    return stats_out(await get_stats(db))


@router.patch("/stats/", response_model=StatsOut)
async def stats_patch(data: StatsPatch, db: DB, _: Manager):
    st = await get_stats(db)
    apply_stats(st, data)
    await db.commit()
    await db.refresh(st)
    return stats_out(st)


@router.get("/catalogue/", response_model=list[CatalogueItem])
async def catalogue(_: Manager):
    return sorted(CATALOGUE.values(), key=lambda i: (i["continent"], i["name"]))


@router.get("/countries/", response_model=list[DestinationOut])
async def countries_list(db: DB, _: Manager):
    return [out(c) for c in await list_countries(db)]


@router.post("/countries/", response_model=DestinationOut, status_code=201)
async def country_create(data: DestinationIn, db: DB, _: Manager):
    code = (data.code or "").strip().upper()
    if code not in CATALOGUE:
        raise FieldError("code", "Улс сонгоно уу.")
    if (await db.execute(select(GraduateCountry.id).where(GraduateCountry.code == code))).scalar_one_or_none() is not None:
        raise FieldError("code", "Энэ улс аль хэдийн нэмэгдсэн.")
    unis = clean_universities(data.universities)
    order = ((await db.execute(select(func.max(GraduateCountry.order)))).scalar() or 0) + 1
    c = GraduateCountry(code=code, universities=unis, order=order)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return out(c)


@router.patch("/countries/{cid}/", response_model=DestinationOut)
async def country_patch(cid: int, data: DestinationPatch, db: DB, _: Manager):
    c = await _get(db, cid)
    if data.universities is not None:
        c.universities = clean_universities(data.universities)
    await db.commit()
    await db.refresh(c)
    return out(c)


@router.delete("/countries/{cid}/", status_code=204)
async def country_delete(cid: int, db: DB, _: Manager):
    c = await _get(db, cid)
    await db.delete(c)
    await db.commit()


@router.put("/countries/order/", response_model=list[DestinationOut])
async def countries_order(data: OrderIn, db: DB, _: Manager):
    items = await list_countries(db)
    if sorted(data.ids) != sorted(c.id for c in items):
        raise FieldError("ids", "Бүх улсын id-г нэг удаа өгнө.")
    pos = {cid: i + 1 for i, cid in enumerate(data.ids)}
    for c in items:
        c.order = pos[c.id]
    await db.commit()
    return [out(c) for c in await list_countries(db)]
