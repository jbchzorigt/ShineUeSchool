"""Бидний тухай — pydantic схемүүд."""

from pydantic import BaseModel, Field, field_validator


class StatItem(BaseModel):
    value: str = Field(min_length=1, max_length=20)
    label: str = Field(min_length=1, max_length=60)


class PageOut(BaseModel):
    intro_title: str
    intro_html: str
    stats: list[StatItem]


class PagePatch(BaseModel):
    intro_title: str | None = Field(default=None, min_length=1, max_length=160)
    intro_html: str | None = None
    stats: list[StatItem] | None = None

    @field_validator("stats", mode="before")
    @classmethod
    def _stats(cls, v):
        if v is None:
            return v
        if not isinstance(v, list) or len(v) > 4:
            raise ValueError("Үзүүлэлт 4-өөс олон байж болохгүй.")
        for s in v:
            if not isinstance(s, dict) or not str(s.get("value", "")).strip() or not str(s.get("label", "")).strip():
                raise ValueError("Үзүүлэлт бүр утга ба нэртэй байна.")
            if len(str(s["value"]).strip()) > 20 or len(str(s["label"]).strip()) > 60:
                raise ValueError("Үзүүлэлтийн утга 20, нэр 60 тэмдэгтээс урт байж болохгүй.")
        return v


class LeaderOut(BaseModel):
    id: int
    full_name: str
    position: str
    level: int
    photo: str | None


class LeaderPatch(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    position: str | None = Field(default=None, max_length=160)
    level: int | None = None


class LeaderOrderItem(BaseModel):
    id: int
    level: int = Field(ge=1, le=10)
    order: int = Field(ge=0, le=32767)


class LeadersOrderIn(BaseModel):
    items: list[LeaderOrderItem]


class OrderIn(BaseModel):
    ids: list[int]


class TeacherOut(BaseModel):
    id: int
    full_name: str
    role: str
    is_head: bool


class TeacherIn(BaseModel):
    full_name: str = Field(max_length=120)
    role: str = Field(default="", max_length=120)
    is_head: bool = False


class TeacherPatch(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    role: str | None = Field(default=None, max_length=120)
    is_head: bool | None = None


class DepartmentOut(BaseModel):
    id: int
    name: str
    teachers: list[TeacherOut]


class DepartmentIn(BaseModel):
    name: str = Field(max_length=120)


class DepartmentPatch(BaseModel):
    name: str | None = Field(default=None, max_length=120)


class AboutOut(BaseModel):
    page: PageOut
    leaders: list[LeaderOut]
    departments: list[DepartmentOut]
