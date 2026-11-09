"""Хөтөлбөр — pydantic схемүүд."""

from pydantic import BaseModel, Field


class ProgramCard(BaseModel):
    """Нийтийн хариунд `name`, `summary` нь `?lang`-аар (англи хоосон бол монгол); `_en` талбарууд админд."""
    id: int
    slug: str
    name: str
    name_en: str = ""
    badge: str
    summary: str
    summary_en: str = ""
    cover_image: str | None
    grade_from: int
    grade_to: int


class WorkOut(BaseModel):
    id: int
    image: str
    title: str
    title_en: str = ""
    student: str
    caption: str
    caption_en: str = ""


class ScholarshipOut(BaseModel):
    id: int
    student_name: str
    photo: str | None
    university: str
    year: int
    amount_usd: int


class RadarSeries(BaseModel):
    """Нэг цуврал (ихэвчлэн он): хичээл бүрийн оноо (тухайн онд өгөгдөлгүй бол null) + сонголтоор нийт дундаж."""
    name: str = Field(max_length=40)
    values: list[float | None]
    total: float | None = None


class RadarIn(BaseModel):
    """Онооны график: хичээлүүд × цуврал (жил г.м.). subjects, series хоёулаа хоосон бол графикийг арилгана."""
    title: str = Field(default="", max_length=120)
    subjects: list[str] = Field(default_factory=list)
    series: list[RadarSeries] = Field(default_factory=list)


class OutcomeRow(BaseModel):
    """Нэг оны төгсөлт: төгссөн тоо, гадаадын их, дээд сургуульд элссэн тоо."""
    year: int
    graduates: int
    abroad: int


class OutcomesIn(BaseModel):
    rows: list[OutcomeRow] = Field(default_factory=list)


class SubjectRow(BaseModel):
    """Нэг хичээл (админ): бүлэг (ж.нь IB Group 4, IGCSE), нэр, тэмдэг (HL · SL, 9–10-р анги), товч тайлбар — монгол + англи."""
    group: str = Field(default="", max_length=60)
    group_en: str = Field(default="", max_length=60)
    name: str = Field(max_length=80)
    name_en: str = Field(default="", max_length=80)
    tag: str = Field(default="", max_length=30)
    description: str = Field(default="", max_length=400)
    description_en: str = Field(default="", max_length=400)


class SubjectsIn(BaseModel):
    rows: list[SubjectRow] = Field(default_factory=list)


class SubjectOut(BaseModel):
    """Нийтийн хариунд: group, name, description нь `?lang`-аар. `key` — монгол нэр, `name_en` — англи нэр (онооны графиктай тааруулахад)."""
    key: str
    group: str
    name: str
    name_en: str = ""
    tag: str
    description: str


class ProgramDetail(ProgramCard):
    body_html: str
    body_html_en: str = ""
    radar: RadarIn | None
    outcomes: list[OutcomeRow]
    subjects: list[SubjectOut]
    works: list[WorkOut]
    scholarships: list[ScholarshipOut]
    scholarship_total_usd: int
    scholarship_count: int


class ProgramAdmin(ProgramCard):
    body_html: str
    body_html_en: str = ""
    is_published: bool
    order: int
    works_count: int
    scholarships_count: int


class ProgramAdminDetail(ProgramAdmin):
    radar: RadarIn | None
    outcomes: list[OutcomeRow]
    subjects: list[SubjectRow]
    works: list[WorkOut]
    scholarships: list[ScholarshipOut]


class ProgramIn(BaseModel):
    name: str = Field(max_length=120)
    name_en: str = Field(default="", max_length=120)
    badge: str = Field(max_length=40)
    summary: str = Field(default="", max_length=280)
    summary_en: str = Field(default="", max_length=280)
    grade_from: int = 11
    grade_to: int = 12
    body_html: str = ""
    body_html_en: str = ""
    is_published: bool = True


class ProgramPatch(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    name_en: str | None = Field(default=None, max_length=120)
    badge: str | None = Field(default=None, max_length=40)
    summary: str | None = Field(default=None, max_length=280)
    summary_en: str | None = Field(default=None, max_length=280)
    grade_from: int | None = None
    grade_to: int | None = None
    body_html: str | None = None
    body_html_en: str | None = None
    is_published: bool | None = None


class WorkPatch(BaseModel):
    title: str | None = Field(default=None, max_length=160)
    title_en: str | None = Field(default=None, max_length=160)
    student: str | None = Field(default=None, max_length=120)
    caption: str | None = Field(default=None, max_length=280)
    caption_en: str | None = Field(default=None, max_length=280)


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
