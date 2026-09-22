"""Баталгаажуулах кодыг имэйлээр илгээх. SMTP тохиргоогүй бол кодыг логт хэвлэнэ (хөгжүүлэлт)."""

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from ..config import settings

logger = logging.getLogger(__name__)

SUBJECT = "Шинэ Үе — дугуйлангийн бүртгэлийн код"


class MailError(Exception):
    pass


def _build(email: str, code: str) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = SUBJECT
    msg["From"] = settings.smtp_from
    msg["To"] = email
    msg.set_content(
        f"Таны баталгаажуулах код: {code}\n\n"
        f"Код {settings.club_code_ttl_minutes} минутын дотор хүчинтэй.\n"
        "Та бүртгүүлээгүй бол энэ захидлыг үл тоомсорлоно уу.\n\n"
        "Шинэ Үе сургууль"
    )
    return msg


def _send_sync(msg: EmailMessage) -> None:
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as s:
        if settings.smtp_tls:
            s.starttls()
        if settings.smtp_user:
            s.login(settings.smtp_user, settings.smtp_password)
        s.send_message(msg)


async def send_code(email: str, code: str) -> None:
    """Илгээж чадахгүй бол MailError. SMTP тохиргоогүй бол зөвхөн логт хэвлэнэ."""
    if not settings.mail_enabled:
        logger.warning("Дугуйлангийн код (SMTP тохиргоогүй): %s → %s", email, code)
        return
    try:
        await asyncio.to_thread(_send_sync, _build(email, code))
    except (OSError, smtplib.SMTPException) as e:
        logger.error("Имэйл илгээж чадсангүй (%s): %s", email, e)
        raise MailError(str(e)) from e
