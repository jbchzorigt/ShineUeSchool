"""Элсэлтийн имэйл: баталгаажуулах код, бүртгэлийн баталгаа (элсэгчийн код), кодоо мартсан үед сануулга.
SMTP тохиргоо, илгээх механизм нь дугуйлангийнхтай ижил (clubs/mailer.py); тохиргоогүй бол логт хэвлэнэ.
Хэл: бүртгүүлсэн хэлээр (Applicant.lang) эсвэл хүсэлтийн `lang`-аар — монгол / англи."""

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from ..clubs.mailer import MailError, _send_sync
from ..common.i18n import Lang, localized
from ..config import settings
from .models import AdmissionRound, Applicant

logger = logging.getLogger(__name__)

__all__ = ["MailError", "send_code", "send_confirmation", "send_reminder"]

SIGNATURE = {"mn": "Шинэ Үе сургууль", "en": "Shine Ue School"}


def _msg(to: str, subject: str, body: str, lang: Lang) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.set_content(f"{body}\n\n{SIGNATURE[lang]}")
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


async def send_code(email: str, code: str, lang: Lang = "mn") -> None:
    ttl = settings.club_code_ttl_minutes
    if lang == "en":
        subject = "Shine Ue — admission registration code"
        body = (f"Your verification code: {code}\n\n"
                f"The code is valid for {ttl} minutes.\n"
                "If you did not request it, please ignore this email.")
    else:
        subject = "Шинэ Үе — элсэлтийн бүртгэлийн код"
        body = (f"Таны баталгаажуулах код: {code}\n\n"
                f"Код {ttl} минутын дотор хүчинтэй.\n"
                "Та бүртгүүлээгүй бол энэ захидлыг үл тоомсорлоно уу.")
    await _send(_msg(email, subject, body, lang))


def _lang(v: str) -> Lang:
    return "en" if v == "en" else "mn"


def _applicant_line(a: Applicant, lang: Lang) -> str:
    grade = f"grade {a.grade}" if lang == "en" else f"{a.grade}-р анги"
    return f"  {a.code} — {a.child_last_name} {a.child_first_name}, {grade}"


async def send_confirmation(a: Applicant, rnd: AdmissionRound) -> None:
    lang = _lang(a.lang)
    name = localized(rnd.name, rnd.name_en, lang)
    test_info = localized(rnd.test_info, rnd.test_info_en, lang)
    if lang == "en":
        subject = f"Shine Ue — admission registration ({a.code})"
        body = (f"{a.child_last_name} {a.child_first_name} has been registered for grade {a.grade} in “{name}”.\n\n"
                f"APPLICANT CODE: {a.code}\n\n"
                "Please keep this code. When the test results are announced, search for it on the "
                "“Admission results” page of our website. The list shows no names or personal information.")
        if test_info:
            body += f"\n\nAbout the test:\n{test_info}"
    else:
        subject = f"Шинэ Үе — элсэлтийн бүртгэл ({a.code})"
        body = (f"{a.child_last_name} {a.child_first_name} «{name}»-д {a.grade}-р ангид бүртгэгдлээ.\n\n"
                f"ЭЛСЭГЧИЙН КОД: {a.code}\n\n"
                "Энэ кодыг хадгална уу. Шалгалтын дүн зарлагдахад сайтын «Элсэлтийн дүн» хуудаснаас "
                "энэ кодоор хайж дүнгээ харна. Жагсаалтад нэр, хувийн мэдээлэл гарахгүй.")
        if test_info:
            body += f"\n\nШалгалтын мэдээлэл:\n{test_info}"
    await _send(_msg(a.email, subject, body, lang))


async def send_reminder(email: str, applicants: list[Applicant], rnd: AdmissionRound, lang: Lang = "mn") -> None:
    lines = "\n".join(_applicant_line(a, lang) for a in applicants)
    name = localized(rnd.name, rnd.name_en, lang)
    if lang == "en":
        subject, body = "Shine Ue — applicant code", f"Applicants registered with this email for “{name}”:\n\n{lines}"
    else:
        subject, body = "Шинэ Үе — элсэгчийн код", f"«{name}»-д энэ имэйлээр бүртгүүлсэн элсэгчид:\n\n{lines}"
    await _send(_msg(email, subject, body, lang))
