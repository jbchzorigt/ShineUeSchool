"""Элсэлтийн pydantic схемүүд."""

import re
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator

from ..common.i18n import Lang
from .messages import msg

Gender = Literal["male", "female"]
ResultCode = Literal["passed", "failed", "waitlist", "absent"]


def _strip(v):
    return v.strip() if isinstance(v, str) else v


def _clean_grades(v):
    if not isinstance(v, list) or not v:
        raise ValueError("Дор хаяж нэг анги сонгоно уу.")
    out = []
    for g in v:
        if isinstance(g, bool) or not isinstance(g, int) or not (1 <= g <= 12):
            raise ValueError("Анги 1–12 хооронд байх ёстой.")
        out.append(g)
    return sorted(set(out))


# ---------- олон нийт ----------

class SectionPublic(BaseModel):
    """Нэг хэсэг (бүртгэл эсвэл дүн) сайтад одоо харагдаж байгаа эсэх: асаалттай БА хугацаа дуусаагүй."""
    open: bool
    deadline: datetime | None


class RoundPublic(BaseModel):
    id: int
    name: str
    grades: list[int]
    test_info: str
    registration: SectionPublic
    results: SectionPublic


class EmailIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    lang: Lang = "mn"       # хариу мессеж, имэйлийн хэл


class VerifyIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    code: str = Field(min_length=6, max_length=6)
    lang: Lang = "mn"


class ApplicationIn(BaseModel):
    token: str
    lang: Lang = "mn"       # validator-ууд info.data-аас уншдаг тул бусад талбараас ӨМНӨ; имэйлүүд энэ хэлээр
    grade: int = Field(ge=1, le=12)
    child_last_name: str = Field(min_length=1, max_length=80)
    child_first_name: str = Field(min_length=1, max_length=80)
    birth_date: date
    gender: Gender
    current_school: str = Field(default="", max_length=160)
    guardian_last_name: str = Field(min_length=1, max_length=80)
    guardian_first_name: str = Field(min_length=1, max_length=80)
    phone: str = Field(max_length=30)       # урт, тэмдэгтийг _phone шалгана (хэлтэй мессеж)
    consent: bool

    @field_validator("child_last_name", "child_first_name", "current_school", "guardian_last_name",
                     "guardian_first_name", "phone", mode="before")
    @classmethod
    def _s(cls, v):
        return _strip(v)

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str, info: ValidationInfo) -> str:
        if not re.fullmatch(r"[0-9+\-\s()]{6,30}", v) or sum(c.isdigit() for c in v) < 6:
            raise ValueError(msg("phone", info.data.get("lang", "mn")))
        return v

    @field_validator("birth_date")
    @classmethod
    def _birth(cls, v: date, info: ValidationInfo) -> date:
        today = date.today()
        if not (today.replace(year=today.year - 20) <= v <= today.replace(year=today.year - 3)):
            raise ValueError(msg("birth_date", info.data.get("lang", "mn")))
        return v


class ApplicationOut(BaseModel):
    code: str
    round_name: str
    grade: int
    child_last_name: str
    child_first_name: str
    email: str
    test_info: str


class ResultRow(BaseModel):
    code: str
    grade: int
    score: float | None
    result: ResultCode | None


class ResultsOut(BaseModel):
    round: RoundPublic | None
    published_at: datetime | None
    rows: list[ResultRow]


# ---------- менежер ----------

class RoundIn(BaseModel):
    """Шинэ ээлж хоёр хэсэг нь унтраалттай үүснэ — хугацаа тавьж асаахыг RoundPatch-аар."""
    name: str = Field(min_length=1, max_length=120)
    name_en: str = Field(default="", max_length=120)
    code_prefix: str = Field(min_length=2, max_length=8)
    grades: list[int]
    test_info: str = Field(default="", max_length=5000)
    test_info_en: str = Field(default="", max_length=5000)

    @field_validator("name", "name_en", "test_info", "test_info_en", mode="before")
    @classmethod
    def _s(cls, v):
        return _strip(v)

    @field_validator("code_prefix", mode="before")
    @classmethod
    def _prefix(cls, v):
        v = _strip(v)
        if isinstance(v, str):
            v = v.upper()
            if not re.fullmatch(r"[A-Z0-9]{2,8}", v):
                raise ValueError("Зөвхөн латин үсэг, тоо (2–8 тэмдэгт).")
        return v

    @field_validator("grades", mode="before")
    @classmethod
    def _grades(cls, v):
        return _clean_grades(v)


class RoundPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    name_en: str | None = Field(default=None, max_length=120)
    grades: list[int] | None = None
    test_info: str | None = Field(default=None, max_length=5000)
    test_info_en: str | None = Field(default=None, max_length=5000)
    is_active: bool | None = None
    registration_open: bool | None = None
    registration_deadline: datetime | None = None
    results_published: bool | None = None
    results_deadline: datetime | None = None

    @field_validator("name", "name_en", "test_info", "test_info_en", mode="before")
    @classmethod
    def _s(cls, v):
        return _strip(v)

    @field_validator("grades", mode="before")
    @classmethod
    def _grades(cls, v):
        return None if v is None else _clean_grades(v)


class SectionAdmin(BaseModel):
    """enabled — админы товч; expired — хугацаа өнгөрсөн (өнгөрмөгц enabled автоматаар False болдог)."""
    enabled: bool
    deadline: datetime | None
    expired: bool


class RoundAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    name_en: str
    code_prefix: str
    grades: list[int]
    test_info: str
    test_info_en: str
    is_active: bool
    registration: SectionAdmin
    results: SectionAdmin
    results_published_at: datetime | None
    applicants_count: int
    results_count: int
    created_at: datetime


class ApplicantAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    email: str
    child_last_name: str
    child_first_name: str
    birth_date: date
    gender: str
    current_school: str
    grade: int
    guardian_last_name: str
    guardian_first_name: str
    phone: str
    status: str
    lang: str
    score: float | None
    result: ResultCode | None
    created_at: datetime


class ApplicantPatch(BaseModel):
    score: float | None = Field(default=None, ge=0, le=1000)
    result: ResultCode | None = None
    status: Literal["registered", "withdrawn"] | None = None
    clear_result: bool = False   # true бол оноо, төлөвийг хоосолно


class ImportReport(BaseModel):
    """Алдаа нэг ч байвал юу ч хадгалахгүй (applied=False)."""
    applied: bool
    updated: int
    unchanged: int
    skipped_blank: int
    errors: list[str]
