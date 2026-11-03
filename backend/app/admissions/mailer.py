"""Элсэлтийн имэйл: баталгаажуулах код, бүртгэлийн баталгаа (элсэгчийн код), кодоо мартсан үед сануулга.
SMTP тохиргоо, илгээх механизм нь дугуйлангийнхтай ижил (clubs/mailer.py); тохиргоогүй бол логт хэвлэнэ."""

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from ..clubs.mailer import MailError, _send_sync
from ..config import settings
from .models import AdmissionRound, Applicant

logger = logging.getLogger(__name__)

__all__ = ["MailError", "send_code", "send_confirmation", "send_reminder"]


def _msg(to: str, subject: str, body: str) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.set_content(body + "\n\nШинэ Үе сургууль")
    return msg


async def _send(msg: EmailMessage) -> None:
    if not settings.mail_enabled:
        logger.warning("Элсэлтийн имэйл (SMTP тохиргоогүй) → %s: %s\n%s", msg["To"], msg["Subject"], msg.get_content())
        return
    try:
        await asyncio.to_thread(_send_sync, msg)
    except (OSError, smtplib.SMTPException) as e:
        logger.error("Имэйл илгээж чадсангүй (%s): %s", msg["To"], e)
        raise MailError(str(e)) from e


async def send_code(email: str, code: str) -> None:
    await _send(_msg(email, "Шинэ Үе — элсэлтийн бүртгэлийн код",
                     f"Таны баталгаажуулах код: {code}\n\n"
                     f"Код {settings.club_code_ttl_minutes} минутын дотор хүчинтэй.\n"
                     "Та бүртгүүлээгүй бол энэ захидлыг үл тоомсорлоно уу."))


def _applicant_line(a: Applicant) -> str:
    return f"  {a.code} — {a.child_last_name} {a.child_first_name}, {a.grade}-р анги"


async def send_confirmation(a: Applicant, rnd: AdmissionRound) -> None:
    body = (f"{a.child_last_name} {a.child_first_name} «{rnd.name}»-д {a.grade}-р ангид бүртгэгдлээ.\n\n"
            f"ЭЛСЭГЧИЙН КОД: {a.code}\n\n"
            "Энэ кодыг хадгална уу. Шалгалтын дүн зарлагдахад сайтын «Элсэлтийн дүн» хуудаснаас "
            "энэ кодоор хайж дүнгээ харна. Жагсаалтад нэр, хувийн мэдээлэл гарахгүй.")
    if rnd.test_info:
        body += f"\n\nШалгалтын мэдээлэл:\n{rnd.test_info}"
    await _send(_msg(a.email, f"Шинэ Үе — элсэлтийн бүртгэл ({a.code})", body))


async def send_reminder(email: str, applicants: list[Applicant], rnd: AdmissionRound) -> None:
    lines = "\n".join(_applicant_line(a) for a in applicants)
    await _send(_msg(email, "Шинэ Үе — элсэгчийн код",
                     f"«{rnd.name}»-д энэ имэйлээр бүртгүүлсэн элсэгчид:\n\n{lines}"))
