"""Элсэлтийн нийтийн API-ийн мессежүүд (монгол / англи). Хэлийг `?lang=` эсвэл хүсэлтийн `lang` талбараас авна."""

from ..common.i18n import Lang

MESSAGES: dict[str, tuple[str, str]] = {
    "closed": ("Элсэлтийн шалгалтын бүртгэл одоогоор хаалттай байна",
               "Admission test registration is currently closed"),
    "too_many_requests": ("Хэт олон хүсэлт. Дараа дахин оролдоно уу", "Too many requests. Please try again later"),
    "email_invalid": ("Имэйл хаяг буруу байна", "Invalid email address"),
    "too_many_codes": ("Хэт олон удаа код авлаа. 1 цагийн дараа дахин оролдоно уу",
                       "Too many codes requested. Please try again in an hour"),
    "mail_failed": ("Имэйл илгээж чадсангүй. Дараа дахин оролдоно уу", "Could not send the email. Please try again later"),
    "code_invalid": ("Код хүчингүй. Дахин код авна уу", "This code is no longer valid. Please request a new one"),
    "code_wrong": ("Код буруу байна", "Incorrect code"),
    "token_expired": ("Баталгаажуулалтын хугацаа дууссан. Кодоо дахин авна уу",
                      "Your verification has expired. Please request a new code"),
    "consent": ("Мэдээлэл боловсруулахыг зөвшөөрнө үү", "Please agree to the processing of this information"),
    "grade_not_in_round": ("Энэ элсэлтэд {grade}-р анги ороогүй", "Grade {grade} is not part of this admission"),
    "duplicate_with_code": ("Энэ хүүхэд аль хэдийн бүртгүүлсэн байна (код: {code}). Кодыг имэйлээр дахин авч болно",
                            "This child is already registered (code: {code}). You can have the code emailed to you again"),
    "duplicate": ("Энэ хүүхэд аль хэдийн бүртгүүлсэн байна", "This child is already registered"),
    "phone": ("Утасны дугаар буруу байна.", "Invalid phone number."),
    "birth_date": ("Төрсөн огноо буруу байна.", "Invalid date of birth."),
}


def msg(key: str, lang: Lang = "mn", **kw) -> str:
    mn, en = MESSAGES[key]
    return (en if lang == "en" else mn).format(**kw)
