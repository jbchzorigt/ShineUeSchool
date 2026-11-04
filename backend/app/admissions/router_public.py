"""
Элсэлт — олон нийт.
  Хэл: GET-д `?lang=mn|en`, POST-д `lang` талбар (анхдагч mn) — алдааны мессеж, ээлжийн нэр/мэдээлэл, имэйлүүд тэр хэлээр.
  GET  /api/admissions/                 → идэвхтэй ээлж + бүртгэл/дүн хэсэг тус бүр нээлттэй эсэх (байхгүй бол round=null)
  Бүртгэл, дүн нь тусдаа хэсэг: админ асаасан БА эцсийн хугацаа өнгөрөөгүй үед л ажиллана (service.*_live).
  POST /api/admissions/email/send/      → баталгаажуулах код илгээх
  POST /api/admissions/email/verify/    → код шалгаж token авах
  POST /api/admissions/applications/    → бүртгүүлэх (token) → элсэгчийн код
  POST /api/admissions/codes/remind/    → кодоо мартсан: имэйлд бүртгэлтэй кодуудыг дахин илгээнэ (үргэлж ok)
  GET  /api/admissions/results/         → нийтлэгдсэн дүн: зөвхөн код, анги, оноо, дүн (нэр, хувийн мэдээлэлгүй)
"""

import hmac
import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..clubs.models import EmailCode
from ..clubs.service import hash_code, new_code
from ..common.i18n import Lang, localized
from ..common.errors import FieldError
from ..config import settings
from ..db import get_db
from . import mailer
from .messages import msg
from .models import APP_REGISTERED, Applicant
from .schemas import ApplicationIn, ApplicationOut, EmailIn, ResultRow, ResultsOut, VerifyIn
from .service import (
    active_round,
    create_app_token,
    decode_app_token,
    new_applicant_code,
    normalize_email,
    registration_live,
    results_live,
    round_public,
    valid_email,
)

router = APIRouter(prefix="/api/admissions", tags=["admissions"])
DB = Annotated[AsyncSession, Depends(get_db)]
log = logging.getLogger(__name__)

MAX_SENDS_PER_HOUR = 3
MAX_ATTEMPTS = 5
MAX_PER_IP_HOUR = 30

# per-IP хязгаар (процесс тус бүрд; нэмэлт хамгаалалт). Код илгээх, кодоо сануулах хүсэлтэд.
_ip_hits: dict[str, tuple[datetime, int]] = {}


def _throttle_ip(request: Request, lang: Lang) -> None:
    ip = request.client.host if request.client else "?"
    now = datetime.now(UTC)
    if len(_ip_hits) > 1000:
        for k, (first, _) in list(_ip_hits.items()):
            if now - first >= timedelta(hours=1):
                del _ip_hits[k]
    first, count = _ip_hits.get(ip, (now, 0))
    if now - first < timedelta(hours=1):
        if count >= MAX_PER_IP_HOUR:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, msg("too_many_requests", lang))
        _ip_hits[ip] = (first, count + 1)
    else:
        _ip_hits[ip] = (now, 1)


async def _open_round(db: AsyncSession, field: str, lang: Lang):
    rnd = await active_round(db)
    if rnd is None or not registration_live(rnd, datetime.now(UTC)):
        raise FieldError(field, msg("closed", lang))
    return rnd


@router.get("/")
async def admission_info(db: DB, lang: Lang = "mn"):
    rnd = await active_round(db)
    return {"round": round_public(rnd, datetime.now(UTC), lang) if rnd else None}


@router.post("/email/send/")
async def email_send(body: EmailIn, request: Request, db: DB):
    lang = body.lang
    _throttle_ip(request, lang)
    email = normalize_email(body.email)
    if not valid_email(email):
        raise FieldError("email", msg("email_invalid", lang))
    await _open_round(db, "email", lang)

    now = datetime.now(UTC)
    row = (await db.execute(select(EmailCode).where(EmailCode.email == email))).scalar_one_or_none()
    if row is not None and now - row.first_sent_at < timedelta(hours=1):
        if row.sent_count >= MAX_SENDS_PER_HOUR:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, msg("too_many_codes", lang))
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
        await mailer.send_code(email, code, lang)
    except mailer.MailError:
        await db.rollback()
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, msg("mail_failed", lang)) from None
    await db.commit()
    return {"ok": True, "expires_in": settings.club_code_ttl_minutes * 60}


@router.post("/email/verify/")
async def email_verify(body: VerifyIn, db: DB):
    email = normalize_email(body.email)
    now = datetime.now(UTC)
    row = (await db.execute(select(EmailCode).where(EmailCode.email == email))).scalar_one_or_none()
    if row is None or row.expires_at <= now or row.attempts >= MAX_ATTEMPTS:
        raise FieldError("code", msg("code_invalid", body.lang))
    if not hmac.compare_digest(row.code_hash, hash_code(email, body.code.strip())):
        row.attempts += 1
        await db.commit()
        raise FieldError("code", msg("code_wrong", body.lang))
    await db.delete(row)
    await db.commit()
    return {"token": create_app_token(email)}


@router.post("/applications/", response_model=ApplicationOut, status_code=201)
async def apply(body: ApplicationIn, db: DB):
    lang = body.lang
    email = decode_app_token(body.token, lang)
    rnd = await _open_round(db, "grade", lang)
    if not body.consent:
        raise FieldError("consent", msg("consent", lang))
    if body.grade not in rnd.grades:
        raise FieldError("grade", msg("grade_not_in_round", lang, grade=body.grade))
    dup = (await db.execute(select(Applicant.code).where(
        Applicant.round_id == rnd.id, Applicant.email == email, Applicant.status == APP_REGISTERED,
        Applicant.child_last_name == body.child_last_name, Applicant.child_first_name == body.child_first_name,
        Applicant.birth_date == body.birth_date,
    ))).scalar_one_or_none()
    if dup is not None:
        raise FieldError("child_first_name", msg("duplicate_with_code", lang, code=dup))
    now = datetime.now(UTC)
    a = Applicant(
        round_id=rnd.id, code=await new_applicant_code(db, rnd.code_prefix), email=email, status=APP_REGISTERED,
        consent_at=now, **body.model_dump(exclude={"token", "consent"}),
    )
    db.add(a)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise FieldError("child_first_name", msg("duplicate", lang)) from None
    try:
        await mailer.send_confirmation(a, rnd)
    except mailer.MailError:
        log.warning("Элсэлтийн баталгаа илгээгдсэнгүй (%s) — код дэлгэц дээр харагдсан", a.code)
    return ApplicationOut(code=a.code, round_name=localized(rnd.name, rnd.name_en, lang), grade=a.grade,
                          child_last_name=a.child_last_name, child_first_name=a.child_first_name, email=a.email,
                          test_info=localized(rnd.test_info, rnd.test_info_en, lang))


@router.post("/codes/remind/")
async def codes_remind(body: EmailIn, request: Request, db: DB):
    """Бүртгэлтэй эсэхийг хариунаас мэдэх боломжгүй (enumeration) — үргэлж ok."""
    _throttle_ip(request, body.lang)
    email = normalize_email(body.email)
    rnd = await active_round(db)
    now = datetime.now(UTC)
    # Кодоо бүртгэл эсвэл дүнгийн хэсэг нээлттэй үед л хэрэглэнэ — хоёул хаалттай бол юу ч илгээхгүй
    if rnd is not None and (registration_live(rnd, now) or results_live(rnd, now)) and valid_email(email):
        apps = (await db.execute(select(Applicant).where(
            Applicant.round_id == rnd.id, Applicant.email == email, Applicant.status == APP_REGISTERED,
        ).order_by(Applicant.created_at))).scalars().all()
        if apps:
            try:
                await mailer.send_reminder(email, list(apps), rnd, body.lang)
            except mailer.MailError:
                log.warning("Кодын сануулга илгээгдсэнгүй")
    return {"ok": True}


@router.get("/results/", response_model=ResultsOut)
async def results(db: DB, lang: Lang = "mn"):
    rnd = await active_round(db)
    if rnd is None or not results_live(rnd, datetime.now(UTC)):
        return ResultsOut(round=round_public(rnd, datetime.now(UTC), lang) if rnd else None, published_at=None, rows=[])
    apps = (await db.execute(select(Applicant.code, Applicant.grade, Applicant.score, Applicant.result).where(
        Applicant.round_id == rnd.id, Applicant.status == APP_REGISTERED,
        (Applicant.result.is_not(None)) | (Applicant.score.is_not(None)),
    ).order_by(Applicant.grade, Applicant.code))).all()
    return ResultsOut(
        round=round_public(rnd, datetime.now(UTC), lang), published_at=rnd.results_published_at,
        rows=[ResultRow(code=c, grade=g, score=float(s) if s is not None else None, result=r) for c, g, s, r in apps],
    )
