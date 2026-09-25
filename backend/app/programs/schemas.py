"""Хөтөлбөр — pydantic схемүүд."""

from pydantic import BaseModel, Field


class ProgramCard(BaseModel):
    id: int
    slug: str
    name: str
    badge: str
    summary: str
    cover_image: str | None
    grade_from: int
    grade_to: int


class WorkOut(BaseModel):
    id: int
    image: str
    title: str
    student: str
    caption: str


class ScholarshipOut(BaseModel):
    id: int
    student_name: str
    photo: str | None
    university: str
    year: int
    amount_usd: int


class RadarSeries(BaseModel):
    name: str = Field(max_length=40)
    values: list[float]


class RadarIn(BaseModel):
    """Радар график: хичээлүүд (тэнхлэг) × цуврал (жил г.м.). subjects, series хоёулаа хоосон бол графикийг арилгана."""
    title: str = Field(default="", max_length=120)
    subjects: list[str] = Field(default_factory=list)
    series: list[RadarSeries] = Field(default_factory=list)


class ProgramDetail(ProgramCard):
    body_html: str
    radar: RadarIn | None
    works: list[WorkOut]
    scholarships: list[ScholarshipOut]
    scholarship_total_usd: int
    scholarship_count: int


class ProgramAdmin(ProgramCard):
    body_html: str
    is_published: bool
    order: int
    works_count: int
    scholarships_count: int


class ProgramAdminDetail(ProgramAdmin):
    radar: RadarIn | None
    works: list[WorkOut]
    scholarships: list[ScholarshipOut]


class ProgramIn(BaseModel):
    name: str = Field(max_length=120)
    badge: str = Field(max_length=40)
    summary: str = Field(default="", max_length=280)
    grade_from: int = 11
    grade_to: int = 12
    body_html: str = ""
    is_published: bool = True


class ProgramPatch(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    badge: str | None = Field(default=None, max_length=40)
    summary: str | None = Field(default=None, max_length=280)
    grade_from: int | None = None
    grade_to: int | None = None
    body_html: str | None = None
    is_published: bool | None = None


class WorkPatch(BaseModel):
    title: str | None = Field(default=None, max_length=160)
    student: str | None = Field(default=None, max_length=120)
    caption: str | None = Field(default=None, max_length=280)


class ScholarshipIn(BaseModel):
    student_name: str = Field(max_length=120)
    university: str = Field(default="", max_length=160)
    year: int
    amount_usd: int = 0


class ScholarshipPatch(BaseModel):
    student_name: str | None = Field(default=None, max_length=120)
    university: str | None = Field(default=None, max_length=160)
    year: int | None = None
    amount_usd: int | None = None


class OrderIn(BaseModel):
    ids: list[int]
