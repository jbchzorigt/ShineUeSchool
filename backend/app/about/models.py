"""
"Бидний тухай" хуудасны өгөгдөл: нэг мөрт тохиргоо (AboutPage), удирдлагын гишүүд (Leader, түвшин 1–3),
тэнхим (Department) ба тэнхимийн багш нар (DeptTeacher). Хүснэгтүүд `about_` угтвартай — `teachers` хуваарьд бий.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base

PAGE_DEFAULTS = {"intro_title": "Шинэ Үе сургууль", "intro_html": "", "stats": []}


class AboutPage(Base):
    """Танилцуулга, үзүүлэлт. Үргэлж нэг мөр (id=1), service.get_page үүсгэнэ."""
    __tablename__ = "about_page"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    intro_title: Mapped[str] = mapped_column(String(160), default=PAGE_DEFAULTS["intro_title"])
    intro_html: Mapped[str] = mapped_column(Text, default="")
    stats: Mapped[list] = mapped_column(JSONB, default=list)  # [{value, label}] 0–4
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Leader(Base):
    __tablename__ = "about_leaders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    position: Mapped[str] = mapped_column(String(160))
    level: Mapped[int] = mapped_column(SmallInteger, default=1)   # 1–3
    order: Mapped[int] = mapped_column(SmallInteger, default=0)
    photo: Mapped[str | None] = mapped_column(String(255), nullable=True)   # "about/uuid.jpg"


class Department(Base):
    __tablename__ = "about_departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    order: Mapped[int] = mapped_column(SmallInteger, default=0)
    teachers: Mapped[list["DeptTeacher"]] = relationship(
        lazy="selectin", cascade="all, delete-orphan",
        order_by="desc(DeptTeacher.is_head), DeptTeacher.order, DeptTeacher.id",
    )


class DeptTeacher(Base):
    __tablename__ = "about_teachers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("about_departments.id", ondelete="CASCADE"), index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(120), default="")
    is_head: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(SmallInteger, default=0)
