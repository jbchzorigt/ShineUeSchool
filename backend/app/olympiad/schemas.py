"""Pydantic схемүүд. JSON бүтэц frontend/src/lib/types.ts-тэй тохирно."""

from datetime import date as _date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Category = Literal["6", "7", "8", "9", "10", "11", "12", "teacher_primary", "teacher_secondary"]
RankLabel = Literal["", "I", "II", "III"]
Medal = Literal["", "АЛТ", "МӨНГӨ", "ХҮРЭЛ"]


class StageIn(BaseModel):
    year: int = Field(ge=2000, le=2100)
    order: int = Field(default=1, ge=1)
    title: str = Field(max_length=120)
    date_text: str = Field(max_length=60)
    date: _date | None = None
    text: str = ""
    tags: list[str] = []
    location: str = Field(default="", max_length=120)


class StagePatch(BaseModel):
    year: int | None = Field(default=None, ge=2000, le=2100)
    order: int | None = Field(default=None, ge=1)
    title: str | None = Field(default=None, max_length=120)
    date_text: str | None = Field(default=None, max_length=60)
    date: _date | None = None
    text: str | None = None
    tags: list[str] | None = None
    location: str | None = Field(default=None, max_length=120)


class StageOut(StageIn):
    id: int
    model_config = {"from_attributes": True}


class ResultIn(BaseModel):
    year: int = Field(ge=2000, le=2100)
    category: Category
    last_name: str = Field(default="", max_length=80)
    first_name: str = Field(max_length=80)
    school: str = Field(default="", max_length=160)
    code: str = Field(default="", max_length=30)
    scores: list[float | None] = []
    score: float | None = None
    rank_label: RankLabel = ""
    medal: Medal = ""
    note: str = Field(default="", max_length=200)


class ResultPatch(BaseModel):
    year: int | None = Field(default=None, ge=2000, le=2100)
    category: Category | None = None
    last_name: str | None = Field(default=None, max_length=80)
    first_name: str | None = Field(default=None, max_length=80)
    school: str | None = Field(default=None, max_length=160)
    code: str | None = Field(default=None, max_length=30)
    scores: list[float | None] | None = None
    score: float | None = None
    rank_label: RankLabel | None = None
    medal: Medal | None = None
    note: str | None = Field(default=None, max_length=200)


class ResultOut(BaseModel):
    id: int
    year: int
    category: str
    category_label: str
    rank: int | None
    rank_label: str
    medal: str
    last_name: str
    first_name: str
    student: str
    full_name: str
    school: str
    code: str
    scores: list[float | None]
    score: float | None
    note: str


class AlbumOut(BaseModel):
    id: int
    order: int
    image: str
    title: str
    caption: str
    is_published: bool


class AlbumPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    caption: str | None = None
    order: int | None = None
    is_published: bool | None = None


class StatItem(BaseModel):
    value: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=80)


class PageOut(BaseModel):
    eyebrow: str
    title: str
    bio: str
    portrait_image: str | None
    portrait_caption: str
    about_title: str
    about_lead: str
    stats: list[StatItem]
    contact_address: str
    contact_phone: str
    contact_email: str


class PagePatch(BaseModel):
    eyebrow: str | None = Field(default=None, max_length=80)
    title: str | None = Field(default=None, min_length=1, max_length=160)
    bio: str | None = None
    portrait_caption: str | None = Field(default=None, max_length=160)
    about_title: str | None = Field(default=None, max_length=160)
    about_lead: str | None = None
    stats: list[StatItem] | None = None
    contact_address: str | None = Field(default=None, max_length=200)
    contact_phone: str | None = Field(default=None, max_length=60)
    contact_email: str | None = Field(default=None, max_length=120)

    @field_validator("stats", mode="before")
    @classmethod
    def _stats(cls, v):
        if v is None:
            return v
        if not isinstance(v, list) or not 1 <= len(v) <= 4:
            raise ValueError("1–4 үзүүлэлт байна.")
        for s in v:
            if not isinstance(s, dict) or not str(s.get("value", "")).strip() or not str(s.get("label", "")).strip():
                raise ValueError("Үзүүлэлт бүр утга ба нэртэй байна.")
            if len(str(s["value"])) > 40 or len(str(s["label"])) > 80:
                raise ValueError("Утга 40, нэр 80 тэмдэгтээс урт байж болохгүй.")
        return v
