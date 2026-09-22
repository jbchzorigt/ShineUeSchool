"""
Дугуйлан — олон нийт.
  GET  /api/clubs/?grade=            → идэвхтэй ээлжийн нийтлэгдсэн дугуйлангууд
  POST /api/clubs/email/send/        → баталгаажуулах код илгээх
  POST /api/clubs/email/verify/      → код шалгаж token авах
  POST /api/clubs/registrations/     → бүртгүүлэх (token шаардана)
"""

import hmac
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..common.errors import FieldError
from ..config import settings
from ..db import get_db
from . import mailer
from .models import REG_CONFIRMED, Club, ClubRegistration, ClubRound, EmailCode
from .schemas import ClubRef, ClubsResponse, EmailIn, RegistrationIn, RegistrationOut, RoundRef, VerifyIn
from .service import (
    active_round,
    check_domain,
    club_out,
    club_state,
    create_reg_token,
    decode_reg_token,
    find_confirmed,
    hash_code,
    new_code,
    normalize_email,
    quota_map,
    taken_by_grade,
)

router = APIRouter(prefix="/api/clubs", tags=["clubs"])
DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/", response_model=ClubsResponse)
async def clubs_list(request: Request, db: DB, grade: int | None = None):
    rnd = await active_round(db)
    if rnd is None:
        return ClubsResponse(round=None, clubs=[])
    q = select(Club).where(Club.round_id == rnd.id, Club.is_published.is_(True)).order_by(Club.order, Club.id)
    if grade is not None:
        q = q.where(Club.grades.any(grade))
    clubs = (await db.execute(q)).scalars().all()
    taken = await taken_by_grade(db, [c.id for c in clubs])
    now = datetime.now(UTC)
    return ClubsResponse(round=RoundRef(id=rnd.id, name=rnd.name),
                         clubs=[club_out(request, c, taken.get(c.id, {}), now) for c in clubs])


MAX_SENDS_PER_HOUR = 3
MAX_ATTEMPTS = 5
CODE_INVALID = "Код хүчингүй. Дахин код авна уу"

# per-IP хязгаарлалт: "already registered" 400 хариу (доорх find_confirmed шалгалт) ашиглан
# бүртгүүлэгчдийг санамсаргүйгээр хайж (enumerate) олохоос сэргийлнэ. Процесс тус бүрд тусдаа
# (олон worker/restart үед дахин тэглэгдэнэ) — тул зөвхөн нэмэлт хамгаалалт, цорын ганц биш.
_ip_hits: dict[str, tuple[datetime, int]] = {}
MAX_SENDS_PER_IP_HOUR = 30


def _throttle_ip(request: Request) -> None:
    ip = request.client.host if request.client else "?"
    now = datetime.now(UTC)
    if len(_ip_hits) > 1000:
        for k, (first_hit, _) in list(_ip_hits.items()):
            if now - first_hit >= timedelta(hours=1):
                del _ip_hits[k]
    first_hit, count = _ip_hits.get(ip, (now, 0))
    if now - first_hit < timedelta(hours=1):
        if count >= MAX_SENDS_PER_IP_HOUR:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Хэт олон хүсэлт. Дараа дахин оролдоно уу")
        _ip_hits[ip] = (first_hit, count + 1)
    else:
        _ip_hits[ip] = (now, 1)


@router.post("/email/send/")
async def email_send(body: EmailIn, request: Request, db: DB):
    _throttle_ip(request)
    email = normalize_email(body.email)
    if not check_domain(email):
        raise FieldError("email", f"Зөвхөн @{settings.club_email_domain} хаягаар бүртгүүлнэ")
    rnd = await active_round(db)
    if rnd is None:
        raise FieldError("email", "Одоогоор бүртгэл нээгдээгүй байна")
    existing = await find_confirmed(db, rnd.id, email)
    if existing is not None:
        raise FieldError("email", f"Энэ хаягаар «{existing.club.name}» дугуйланд бүртгүүлсэн байна")

    now = datetime.now(UTC)
    row = (await db.execute(select(EmailCode).where(EmailCode.email == email))).scalar_one_or_none()
    if row is not None and now - row.first_sent_at < timedelta(hours=1):
        if row.sent_count >= MAX_SENDS_PER_HOUR:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                                "Хэт олон удаа код авлаа. 1 цагийн дараа дахин оролдоно уу")
        row.sent_count += 1
    elif row is not None:
        row.sent_count, row.first_sent_at = 1, now
    else:
        row = EmailCode(email=email, sent_count=1, first_sent_at=now)
        db.add(row)
    code = new_code()
    row.code_hash = hash_code(email, code)
    row.expires_at = now + timedelta(minutes=settings.club_code_ttl_minutes)
    row.attempts = 0
    try:
        await mailer.send_code(email, code)
    except mailer.MailError:
        await db.rollback()
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Имэйл илгээж чадсангүй. Дараа дахин оролдоно уу")
    await db.commit()
    return {"ok": True, "expires_in": settings.club_code_ttl_minutes * 60}


@router.post("/email/verify/")
async def email_verify(body: VerifyIn, db: DB):
    email = normalize_email(body.email)
    now = datetime.now(UTC)
    row = (await db.execute(select(EmailCode).where(EmailCode.email == email))).scalar_one_or_none()
    if row is None or row.expires_at <= now or row.attempts >= MAX_ATTEMPTS:
        raise FieldError("code", CODE_INVALID)
    if not hmac.compare_digest(row.code_hash, hash_code(email, body.code.strip())):
        row.attempts += 1
        await db.commit()
        raise FieldError("code", "Код буруу байна")
    await db.delete(row)
    await db.commit()
    return {"token": create_reg_token(email), "expires_in": settings.club_token_ttl_minutes * 60}


@router.post("/registrations/", response_model=RegistrationOut, status_code=201)
async def register(body: RegistrationIn, db: DB):
    email = decode_reg_token(body.token)
    # Дугуйлангийн мөрийг түгжинэ: слот тоолох ба бүртгэл нэмэх нэг transaction-д (сүүлийн слотын уралдаан)
    club = (await db.execute(
        select(Club).where(Club.id == body.club_id).with_for_update()
    )).scalar_one_or_none()
    if club is None or not club.is_published:
        raise FieldError("club", "Дугуйлан олдсонгүй")
    rnd = await db.get(ClubRound, club.round_id)
    if rnd is None or not rnd.is_active:
        raise FieldError("club", "Дугуйлан олдсонгүй")
    now = datetime.now(UTC)
    taken_g = (await taken_by_grade(db, [club.id])).get(club.id, {})
    state = club_state(club, taken_g, now)
    if state == "upcoming":
        raise FieldError("club", "Бүртгэл хараахан эхлээгүй")
    if state == "closed":
        raise FieldError("club", "Бүртгэлийн хугацаа дууссан")
    qm = quota_map(club)
    if body.grade not in qm:
        raise FieldError("grade", f"Энэ дугуйлан {body.grade}-р ангид зориулагдаагүй")
    existing = await find_confirmed(db, rnd.id, email)
    if existing is not None:
        raise FieldError("email", f"Энэ хаягаар «{existing.club.name}» дугуйланд бүртгүүлсэн байна")
    if taken_g.get(body.grade, 0) >= qm[body.grade]:
        raise FieldError("grade", f"{body.grade}-р ангид суудал дүүрсэн")
    reg = ClubRegistration(
        club_id=club.id, round_id=rnd.id, email=email, status=REG_CONFIRMED, grade=body.grade,
        student_last_name=body.student_last_name, student_first_name=body.student_first_name,
        guardian_last_name=body.guardian_last_name, guardian_first_name=body.guardian_first_name, phone=body.phone,
    )
    db.add(reg)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise FieldError("email", "Энэ хаягаар энэ ээлжид аль хэдийн бүртгүүлсэн байна") from None
    await db.refresh(reg)   # created_at нь server_default — async session-д lazy ачаалагдахгүй тул шинэчилнэ
    return RegistrationOut(
        id=reg.id, club=ClubRef(id=club.id, name=club.name, is_paid=club.is_paid, fee=club.fee, fee_note=club.fee_note),
        email=reg.email, student_last_name=reg.student_last_name, student_first_name=reg.student_first_name,
        guardian_last_name=reg.guardian_last_name, guardian_first_name=reg.guardian_first_name, phone=reg.phone,
        grade=reg.grade, created_at=reg.created_at,
    )
