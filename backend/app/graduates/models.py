"""
Төгсөгчид: (1) нүүрний «Төгсөлт» тоонууд — нэг мөр (id=1, service.get_stats үүсгэнэ), хүснэгт graduate_stats;
(2) элссэн улс, сургуулиуд (газрын зураг). Улс = каталогийн ISO код (countries.py — нэр, тив, координат тэндээс),
сургуулиуд = JSONB жагсаалт (дараалалтай). Хүснэгт: graduate_countries.
"""

from datetime import datetime

from sqlalchemy import DateTime, Integer, SmallInteger, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base


STATS_DEFAULTS = {"total_graduates": 0, "university_percent": 0, "university_count": 0, "abroad_count": 0}


class GraduateStats(Base):
    """Нийт төгсөгч, их дээд сургуульд элссэн хувь ба тоо, гадаадын их сургуульд элссэн тоо. Үргэлж нэг мөр (id=1)."""
    __tablename__ = "graduate_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    total_graduates: Mapped[int] = mapped_column(Integer, default=0)
    university_percent: Mapped[int] = mapped_column(SmallInteger, default=0)   # 0–100
    university_count: Mapped[int] = mapped_column(Integer, default=0)
    abroad_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class GraduateCountry(Base):
    __tablename__ = "graduate_countries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(2), unique=True, index=True)      # ISO 3166-1 alpha-2, каталогид байх ёстой
    universities: Mapped[list] = mapped_column(JSONB, default=list)          # ["MIT", "Stanford University"]
    order: Mapped[int] = mapped_column(SmallInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
