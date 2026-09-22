"""
Дугуйлан — менежерийн API (manager эрх).
  GET/POST   /api/clubs/admin/rounds/                 PATCH/DELETE /rounds/{id}/
  GET/POST   /rounds/{id}/clubs/    PUT /rounds/{id}/clubs/order/
  PATCH/DELETE /clubs/{id}/
  POST /clubs/{id}/images/   DELETE /images/{id}/   PUT /clubs/{id}/images/order/
  GET  /clubs/{id}/registrations/   POST /registrations/{id}/remove/   PATCH /registrations/{id}/
  GET  /rounds/{id}/registrations.xlsx
"""

import asyncio
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import require_role
from ..auth.models import User
from ..common.errors import FieldError
from ..common.media import delete_file, save_upload
from ..db import get_db
from .export import build_registrations_xlsx
from .models import REG_CONFIRMED, REG_REMOVED, Club, ClubImage, ClubRegistration, ClubRound
from .schemas import ClubAdminOut, ClubIn, ClubPatch, OrderIn, RegistrationAdminOut, RegistrationPatch, RoundIn, RoundOut, RoundPatch
from .service import club_admin_out, taken_by_grade

router = APIRouter(prefix="/api/clubs/admin", tags=["clubs-admin"])
DB = Annotated[AsyncSession, Depends(get_db)]
Manager = Annotated[User, Depends(require_role("manager"))]


async def _get_or_404(db: AsyncSession, model, id: int):
    obj = await db.get(model, id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return obj


async def _club_admin(request: Request, db: AsyncSession, club: Club) -> ClubAdminOut:
    taken = (await taken_by_grade(db, [club.id])).get(club.id, {})
    return club_admin_out(request, club, taken, datetime.now(UTC))


async def _clubs_of_round(request: Request, db: AsyncSession, round_id: int) -> list[ClubAdminOut]:
    clubs = (await db.execute(select(Club).where(Club.round_id == round_id).order_by(Club.order, Club.id))).scalars().all()
    taken = await taken_by_grade(db, [c.id for c in clubs])
    now = datetime.now(UTC)
    return [club_admin_out(request, c, taken.get(c.id, {}), now) for c in clubs]


def _quotas_to_columns(quotas) -> dict:
    """[{grade, capacity}] → {"quotas": {"5": 2}, "grades": [5]}."""
    qm = {int(q.grade): int(q.capacity) for q in quotas}
    return {"quotas": {str(g): n for g, n in sorted(qm.items())}, "grades": sorted(qm)}


async def _round_out(db: AsyncSession, rnd: ClubRound) -> RoundOut:
    clubs = (await db.execute(select(func.count(Club.id)).where(Club.round_id == rnd.id))).scalar_one()
    regs = (await db.execute(select(func.count(ClubRegistration.id)).where(
        ClubRegistration.round_id == rnd.id, ClubRegistration.status == REG_CONFIRMED))).scalar_one()
    return RoundOut(id=rnd.id, name=rnd.name, is_active=rnd.is_active, clubs_count=int(clubs),
                    registrations_count=int(regs), created_at=rnd.created_at)


# ---- ээлж ----
@router.get("/rounds/", response_model=list[RoundOut])
async def rounds_list(db: DB, _: Manager):
    rounds = (await db.execute(select(ClubRound).order_by(ClubRound.id.desc()))).scalars().all()
    return [await _round_out(db, r) for r in rounds]


@router.post("/rounds/", response_model=RoundOut, status_code=201)
async def round_create(body: RoundIn, db: DB, _: Manager):
    rnd = ClubRound(name=body.name, is_active=False)
    db.add(rnd)
    await db.commit()
    await db.refresh(rnd)
    return await _round_out(db, rnd)


@router.patch("/rounds/{id}/", response_model=RoundOut)
async def round_patch(id: int, body: RoundPatch, db: DB, _: Manager):
    rnd = await _get_or_404(db, ClubRound, id)
    if body.name is not None:
        rnd.name = body.name
    if body.is_active is True:
        await db.execute(update(ClubRound).where(ClubRound.id != rnd.id).values(is_active=False))
        rnd.is_active = True
    elif body.is_active is False:
        rnd.is_active = False
    await db.commit()
    return await _round_out(db, rnd)


async def _has_registrations(db: AsyncSession, *, round_id: int | None = None, club_id: int | None = None) -> bool:
    q = select(func.count(ClubRegistration.id))
    q = q.where(ClubRegistration.round_id == round_id) if round_id is not None else q.where(ClubRegistration.club_id == club_id)
    return (await db.execute(q)).scalar_one() > 0


@router.delete("/rounds/{id}/", status_code=204)
async def round_delete(id: int, db: DB, _: Manager):
    rnd = await _get_or_404(db, ClubRound, id)
    if await _has_registrations(db, round_id=rnd.id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Бүртгэлтэй ээлжийг устгах боломжгүй")
    clubs = (await db.execute(select(Club).where(Club.round_id == rnd.id))).scalars().all()
    files = [i.file for c in clubs for i in c.images]
    for c in clubs:
        await db.delete(c)
    await db.delete(rnd)
    await db.commit()
    for f in files:
        delete_file(f)


# ---- дугуйлан ----
@router.get("/rounds/{id}/clubs/", response_model=list[ClubAdminOut])
async def clubs_list(id: int, request: Request, db: DB, _: Manager):
    await _get_or_404(db, ClubRound, id)
    return await _clubs_of_round(request, db, id)


@router.post("/rounds/{id}/clubs/", response_model=ClubAdminOut, status_code=201)
async def club_create(id: int, body: ClubIn, request: Request, db: DB, _: Manager):
    await _get_or_404(db, ClubRound, id)
    if body.registration_start >= body.registration_end:
        raise FieldError("registration_end", "Дуусах хугацаа эхлэх хугацаанаас хойш байх ёстой.")
    if body.is_paid and body.fee < 1:
        raise FieldError("fee", "Төлбөртэй дугуйлангийн дүн 1-ээс их байх ёстой.")
    max_order = (await db.execute(select(func.coalesce(func.max(Club.order), 0)).where(Club.round_id == id))).scalar_one()
    data = body.model_dump(exclude={"quotas"})
    club = Club(round_id=id, order=int(max_order) + 1, **data, **_quotas_to_columns(body.quotas))
    db.add(club)
    await db.commit()
    await db.refresh(club)
    return await _club_admin(request, db, club)


@router.patch("/clubs/{id}/", response_model=ClubAdminOut)
async def club_patch(id: int, body: ClubPatch, request: Request, db: DB, _: Manager):
    # мөрийг түгжинэ: квот буурах шалгалт ба бүртгэлийн уралдаанаас хамгаална
    club = (await db.execute(select(Club).where(Club.id == id).with_for_update())).scalar_one_or_none()
    if club is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    data = body.model_dump(exclude_unset=True)
    data = {k: v for k, v in data.items() if v is not None}   # JSON null-аар NOT NULL багана бичихээс сэргийлнэ
    merged = {k: data.get(k, getattr(club, k)) for k in
              ("registration_start", "registration_end", "is_paid", "fee", "fee_note")}
    if merged["registration_start"] >= merged["registration_end"]:
        raise FieldError("registration_end", "Дуусах хугацаа эхлэх хугацаанаас хойш байх ёстой.")
    if merged["is_paid"] and merged["fee"] < 1:
        raise FieldError("fee", "Төлбөртэй дугуйлангийн дүн 1-ээс их байх ёстой.")
    if not merged["is_paid"]:
        data["fee"], data["fee_note"] = 0, ""
    if body.quotas is not None:
        new = {int(q.grade): int(q.capacity) for q in body.quotas}
        taken_g = (await taken_by_grade(db, [club.id])).get(club.id, {})
        for g, n in sorted(taken_g.items()):
            if n <= 0:
                continue
            if g not in new:
                raise FieldError("quotas", f"{g}-р ангид бүртгэл байгаа тул хасах боломжгүй")
            if new[g] < n:
                raise FieldError("quotas", f"{g}-р ангид бүртгэгдсэн {n} сурагчаас бага байж болохгүй")
        data.pop("quotas", None)
        data.update(_quotas_to_columns(body.quotas))
    for k, v in data.items():
        setattr(club, k, v)
    await db.commit()
    return await _club_admin(request, db, club)


@router.put("/rounds/{id}/clubs/order/", response_model=list[ClubAdminOut])
async def clubs_order(id: int, body: OrderIn, request: Request, db: DB, _: Manager):
    await _get_or_404(db, ClubRound, id)
    clubs = (await db.execute(select(Club).where(Club.round_id == id))).scalars().all()
    if sorted(body.ids) != sorted(c.id for c in clubs):
        raise FieldError("ids", "Ээлжийн бүх дугуйлангийн id байх ёстой.")
    pos = {cid: i + 1 for i, cid in enumerate(body.ids)}
    for c in clubs:
        c.order = pos[c.id]
    await db.commit()
    return await _clubs_of_round(request, db, id)


@router.delete("/clubs/{id}/", status_code=204)
async def club_delete(id: int, db: DB, _: Manager):
    club = await _get_or_404(db, Club, id)
    if await _has_registrations(db, club_id=club.id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Бүртгэлтэй дугуйланг устгах боломжгүй")
    files = [i.file for i in club.images]
    await db.delete(club)
    await db.commit()
    for f in files:
        delete_file(f)


# ---- зураг ----
@router.post("/clubs/{id}/images/", response_model=ClubAdminOut, status_code=201)
async def image_add(id: int, request: Request, db: DB, _: Manager, image: Annotated[UploadFile, File()]):
    club = await _get_or_404(db, Club, id)
    rel = await save_upload(image, "clubs")
    max_order = max((i.order for i in club.images), default=0)
    db.add(ClubImage(club_id=club.id, file=rel, order=max_order + 1))
    await db.commit()
    await db.refresh(club)
    return await _club_admin(request, db, club)


@router.delete("/images/{id}/", response_model=ClubAdminOut)
async def image_delete(id: int, request: Request, db: DB, _: Manager):
    img = await _get_or_404(db, ClubImage, id)
    club_id, rel = img.club_id, img.file
    await db.delete(img)
    await db.commit()
    delete_file(rel)
    club = await _get_or_404(db, Club, club_id)
    await db.refresh(club)
    return await _club_admin(request, db, club)


@router.put("/clubs/{id}/images/order/", response_model=ClubAdminOut)
async def images_order(id: int, body: OrderIn, request: Request, db: DB, _: Manager):
    club = await _get_or_404(db, Club, id)
    if sorted(body.ids) != sorted(i.id for i in club.images):
        raise FieldError("ids", "Дугуйлангийн бүх зургийн id байх ёстой.")
    pos = {iid: i + 1 for i, iid in enumerate(body.ids)}
    for img in club.images:
        img.order = pos[img.id]
    await db.commit()
    await db.refresh(club)
    return await _club_admin(request, db, club)


# ---- бүртгэл ----
def _reg_order():
    # confirmed эхэнд, дараа нь removed; тус бүр огноогоор
    return ((ClubRegistration.status != REG_CONFIRMED), ClubRegistration.created_at, ClubRegistration.id)


@router.get("/clubs/{id}/registrations/", response_model=list[RegistrationAdminOut])
async def registrations_list(id: int, db: DB, _: Manager):
    await _get_or_404(db, Club, id)
    q = select(ClubRegistration).where(ClubRegistration.club_id == id).order_by(*_reg_order())
    return (await db.execute(q)).scalars().all()


@router.post("/registrations/{id}/remove/", response_model=RegistrationAdminOut)
async def registration_remove(id: int, db: DB, _: Manager):
    reg = await _get_or_404(db, ClubRegistration, id)
    if reg.status == REG_REMOVED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Энэ бүртгэл аль хэдийн хасагдсан")
    reg.status, reg.removed_at = REG_REMOVED, datetime.now(UTC)
    await db.commit()
    return reg


@router.patch("/registrations/{id}/", response_model=RegistrationAdminOut)
async def registration_patch(id: int, body: RegistrationPatch, db: DB, _: Manager):
    reg = await _get_or_404(db, ClubRegistration, id)
    reg.is_paid_marked = body.is_paid_marked
    await db.commit()
    return reg


@router.get("/rounds/{id}/registrations.xlsx")
async def registrations_xlsx(id: int, db: DB, _: Manager):
    await _get_or_404(db, ClubRound, id)
    clubs = (await db.execute(select(Club).where(Club.round_id == id).order_by(Club.order, Club.id))).scalars().all()
    regs = (await db.execute(select(ClubRegistration).where(ClubRegistration.round_id == id))).scalars().all()
    by_club: dict[int, list[ClubRegistration]] = {}
    for r in regs:
        by_club.setdefault(r.club_id, []).append(r)
    data = await asyncio.to_thread(build_registrations_xlsx, [(c.name, c.is_paid, by_club.get(c.id, [])) for c in clubs])
    return Response(data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="clubs-{id}.xlsx"'})
