"""
Олимпиадын өгөгдлийн загварууд (Stage, Result, AlbumPhoto).
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, Integer, Numeric, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base

CATEGORY_LABELS: dict[str, str] = {
    "6": "VI анги", "7": "VII анги", "8": "VIII анги", "9": "IX анги",
    "10": "X анги", "11": "XI анги", "12": "XII анги",
    "teacher_primary": "Бага ангийн багш", "teacher_secondary": "Дунд ангийн багш",
}
CATEGORIES = [{"value": v, "label": l} for v, l in CATEGORY_LABELS.items()]
RANK_LABELS = ("", "I", "II", "III")
MEDALS = ("", "АЛТ", "МӨНГӨ", "ХҮРЭЛ")


class Stage(Base):
    __tablename__ = "olympiad_stages"
    __table_args__ = (UniqueConstraint("year", "order", name="uq_stage_year_order"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    order: Mapped[int] = mapped_column(SmallInteger, default=1)
    title: Mapped[str] = mapped_column(String(120))
    date_text: Mapped[str] = mapped_column(String(60))
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    text: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list] = mapped_column(JSONB, default=list)
    location: Mapped[str] = mapped_column(String(120), default="")


class Result(Base):
    __tablename__ = "olympiad_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    category: Mapped[str] = mapped_column(String(20), index=True)
    last_name: Mapped[str] = mapped_column(String(80), default="")
    first_name: Mapped[str] = mapped_column(String(80))
    school: Mapped[str] = mapped_column(String(160), default="")
    code: Mapped[str] = mapped_column(String(30), default="")
    scores: Mapped[list] = mapped_column(JSONB, default=list)
    score: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    rank_label: Mapped[str] = mapped_column(String(4), default="")
    medal: Mapped[str] = mapped_column(String(10), default="")
    rank: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    note: Mapped[str] = mapped_column(String(200), default="")

    @property
    def student(self) -> str:
        """Б.Мухулай"""
        if self.last_name and self.last_name != "*":
            return f"{self.last_name[0]}.{self.first_name}"
        return self.first_name

    @property
    def full_name(self) -> str:
        return f"{self.last_name} {self.first_name}".strip()


class AlbumPhoto(Base):
    __tablename__ = "olympiad_album_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    image: Mapped[str] = mapped_column(String(255))  # MEDIA_DIR доторх зам: "album/xxx.jpg"
    title: Mapped[str] = mapped_column(String(120), default="")  # Гарчиг (шинэ зурагт заавал)
    caption: Mapped[str] = mapped_column(Text)
    order: Mapped[int] = mapped_column(SmallInteger, default=1)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)


PAGE_DEFAULTS: dict = {
    "eyebrow": "Монгол Улсын Ардын багш",
    "title": "Ү.Маамын нэрэмжит математикийн олимпиад",
    "bio": ("Ү.Маам багш нь олон жилийн турш математикийн багшаар ажиллаж, олон үеийн сурагчдыг математикийн "
            "олимпиадад бэлтгэн амжилтад хүргэсэн. Түүний хөдөлмөр, зүтгэлийг үнэлж Монгол Улсын Ардын багш цол "
            "хүртээсэн. Энэхүү олимпиад нь багшийн нэрийг мөнхжүүлж, залуу үеийнхэнд математикийн хайрыг өвлүүлэх зорилготой."),
    "portrait_caption": "Монгол Улсын Ардын багш Ү.Маам",
    "about_title": "Математикт дурлах залуу үеийг дэмжинэ",
    "about_lead": ("Ү.Маамын нэрэмжит математикийн олимпиад нь 6–12-р ангийн сурагчдын дунд жил бүр зохион байгуулагдаж, "
                   "математикийн сэтгэлгээ, бодлого бодох чадварыг хөгжүүлэхэд чиглэнэ."),
    "stats": [{"value": "2026", "label": "Олимпиадын жил"}, {"value": "6–12", "label": "Анги"}, {"value": "3", "label": "Шат"}],
    "contact_address": "Улаанбаатар хот",
    "contact_phone": "+976 0000-0000",
    "contact_email": "info@shine-ue.edu.mn",
}


class OlympiadPage(Base):
    """Олимпиадын хуудасны админаас засагддаг текст, хөрөг. Үргэлж нэг мөр (id=1)."""
    __tablename__ = "olympiad_page"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    eyebrow: Mapped[str] = mapped_column(String(80), default="")
    title: Mapped[str] = mapped_column(String(160))
    bio: Mapped[str] = mapped_column(Text, default="")
    portrait_image: Mapped[str | None] = mapped_column(String(255), nullable=True)  # "olympiad/xxx.jpg"
    portrait_caption: Mapped[str] = mapped_column(String(160), default="")
    about_title: Mapped[str] = mapped_column(String(160), default="")
    about_lead: Mapped[str] = mapped_column(Text, default="")
    stats: Mapped[list] = mapped_column(JSONB, default=list)  # [{value, label}]
    contact_address: Mapped[str] = mapped_column(String(200), default="")
    contact_phone: Mapped[str] = mapped_column(String(60), default="")
    contact_email: Mapped[str] = mapped_column(String(120), default="")
