"""Дугуйлангийн pydantic схемүүд."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ClubState = Literal["upcoming", "open", "full", "closed"]


class ImageOut(BaseModel):
    id: int
    url: str
    order: int


class QuotaOut(BaseModel):
    grade: int
    capacity: int
    taken: int
    slots_left: int
    full: bool


class QuotaIn(BaseModel):
    grade: int = Field(ge=1, le=12)
    capacity: int = Field(ge=1, le=500)


class RoundRef(BaseModel):
    id: int
    name: str


class ClubOut(BaseModel):
    id: int
    name: str
    description: str
    grades: list[int]
    capacity: int
    taken: int
    slots_left: int
    state: ClubState
    quotas: list[QuotaOut]
    is_paid: bool
    fee: int
    fee_note: str
    registration_start: datetime
    registration_end: datetime
    images: list[ImageOut]


class ClubAdminOut(ClubOut):
    is_published: bool
    order: int
    round_id: int


class ClubsResponse(BaseModel):
    round: RoundRef | None
    clubs: list[ClubOut]


def _clean_quotas(v):
    if not isinstance(v, list) or not v:
        raise ValueError("Дор хаяж нэг ангид квот оруулна уу.")
    grades = []
    for q in v:
        if not isinstance(q, dict):
            raise ValueError("Квотын мөр буруу байна.")
        gv, cv = q.get("grade"), q.get("capacity")
        for val in (gv, cv):
            # bool нь Python-д int-ийн дэд төрөл тул тусад нь хасна; зөвхөн int эсвэл тооны string зөвшөөрнө
            if isinstance(val, bool) or not (isinstance(val, int) or (isinstance(val, str) and val.isdigit())):
                raise ValueError("Квотын мөр буруу байна.")
        try:
            grade, capacity = int(gv), int(cv)
        except (TypeError, ValueError):
            raise ValueError("Квотын мөр буруу байна.") from None
        if not (1 <= grade <= 12):
            raise ValueError("Анги 1–12 хооронд байх ёстой.")
        if not (1 <= capacity <= 500):
            raise ValueError("Квот 1–500 хооронд байх ёстой.")
        grades.append(grade)
    if len(set(grades)) != len(grades):
        raise ValueError("Анги давхардаж байна.")
    return sorted(v, key=lambda q: int(q["grade"]))


class ClubIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=5000)
    quotas: list[QuotaIn]
    is_paid: bool = False
    fee: int = Field(default=0, ge=0, le=100_000_000)
    fee_note: str = Field(default="", max_length=120)
    registration_start: datetime
    registration_end: datetime
    is_published: bool = False

    @field_validator("name", "fee_note", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("quotas", mode="before")
    @classmethod
    def _quotas(cls, v):
        return _clean_quotas(v)

    @model_validator(mode="after")
    def _rules(self):
        # start>=end болон is_paid/fee шалгалтуудыг энд биш router_admin.club_create-д
        # FieldError-ээр хийнэ (club_patch-тай ижил алдааны түлхүүр гаргахын тулд).
        if not self.is_paid:
            self.fee, self.fee_note = 0, ""
        return self


class ClubPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=5000)
    quotas: list[QuotaIn] | None = None
    is_paid: bool | None = None
    fee: int | None = Field(default=None, ge=0, le=100_000_000)
    fee_note: str | None = Field(default=None, max_length=120)
    registration_start: datetime | None = None
    registration_end: datetime | None = None
    is_published: bool | None = None

    @field_validator("name", "fee_note", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("quotas", mode="before")
    @classmethod
    def _quotas(cls, v):
        return None if v is None else _clean_quotas(v)


class RoundOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    is_active: bool
    clubs_count: int
    registrations_count: int
    created_at: datetime


class RoundIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)

    @field_validator("name", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v


class RoundPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    is_active: bool | None = None

    @field_validator("name", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v


class OrderIn(BaseModel):
    ids: list[int]


class EmailIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)


class VerifyIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    code: str = Field(min_length=6, max_length=6)


class RegistrationIn(BaseModel):
    token: str
    club_id: int
    grade: int = Field(ge=1, le=12)
    student_last_name: str = Field(min_length=1, max_length=80)
    student_first_name: str = Field(min_length=1, max_length=80)
    guardian_last_name: str = Field(min_length=1, max_length=80)
    guardian_first_name: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=6, max_length=30)

    @field_validator("student_last_name", "student_first_name", "guardian_last_name", "guardian_first_name", "phone",
                     mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v


class ClubRef(BaseModel):
    id: int
    name: str
    is_paid: bool
    fee: int
    fee_note: str


class RegistrationOut(BaseModel):
    id: int
    club: ClubRef
    email: str
    student_last_name: str
    student_first_name: str
    guardian_last_name: str
    guardian_first_name: str
    phone: str
    grade: int
    created_at: datetime


class RegistrationAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    student_last_name: str
    student_first_name: str
    guardian_last_name: str
    guardian_first_name: str
    phone: str
    grade: int
    status: str
    is_paid_marked: bool
    created_at: datetime
    removed_at: datetime | None


class RegistrationPatch(BaseModel):
    is_paid_marked: bool
