"""
Хөтөлбөрүүд (IBDP, Cambridge …): Program + бүтээлийн булан (ProgramWork) + тэтгэлэгт сурагчид (Scholarship).
Хүснэгт: programs, program_works, program_scholarships.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    badge: Mapped[str] = mapped_column(String(40))            # картын tag: "IBDP", "Cambridge"
    summary: Mapped[str] = mapped_column(String(280), default="")
    cover_image: Mapped[str | None] = mapped_column(String(255), nullable=True)   # "programs/uuid.jpg"
    grade_from: Mapped[int] = mapped_column(SmallInteger, default=11)
    grade_to: Mapped[int] = mapped_column(SmallInteger, default=12)
    body_html: Mapped[str] = mapped_column(Text, default="")
    # Радар график (ЭЕШ-ийн оноо г.м.): {"title", "subjects": [..], "series": [{"name", "values": [..]}]} — хоосон {} бол харуулахгүй
    radar: Mapped[dict] = mapped_column(JSONB, default=dict)
    order: Mapped[int] = mapped_column(SmallInteger, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    works: Mapped[list["ProgramWork"]] = relationship(lazy="selectin", cascade="all, delete-orphan", order_by="ProgramWork.order, ProgramWork.id")
    scholarships: Mapped[list["Scholarship"]] = relationship(
        lazy="selectin", cascade="all, delete-orphan", order_by="desc(Scholarship.year), Scholarship.order, Scholarship.id")


class ProgramWork(Base):
    """Бүтээлийн булан: зураг заавал."""
    __tablename__ = "program_works"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id", ondelete="CASCADE"), index=True)
    image: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(160))
    student: Mapped[str] = mapped_column(String(120), default="")   # "Б.Ану, 11а"
    caption: Mapped[str] = mapped_column(String(280), default="")
    order: Mapped[int] = mapped_column(SmallInteger, default=0)


class Scholarship(Base):
    __tablename__ = "program_scholarships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id", ondelete="CASCADE"), index=True)
    student_name: Mapped[str] = mapped_column(String(120))
    photo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    university: Mapped[str] = mapped_column(String(160), default="")
    year: Mapped[int] = mapped_column(SmallInteger)
    amount_usd: Mapped[int] = mapped_column(Integer, default=0)
    order: Mapped[int] = mapped_column(SmallInteger, default=0)
