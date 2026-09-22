"""Дугуйлан: ээлж, дугуйлан, зураг, бүртгэл, имэйлийн баталгаажуулах код."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base

REG_CONFIRMED = "confirmed"
REG_REMOVED = "removed"


class ClubRound(Base):
    """Бүртгэлийн ээлж (улирал). Нэг л ээлж идэвхтэй."""

    __tablename__ = "club_rounds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    clubs: Mapped[list["Club"]] = relationship(back_populates="round", order_by="Club.order, Club.id")


class Club(Base):
    __tablename__ = "clubs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    round_id: Mapped[int] = mapped_column(ForeignKey("club_rounds.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    grades: Mapped[list[int]] = mapped_column(ARRAY(Integer))   # 1..12, эрэмбэлсэн
    quotas: Mapped[dict] = mapped_column(JSONB, default=dict)   # {"3": 8, "7": 3} — анги тутмын квот; grades нь түлхүүрүүд
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    fee: Mapped[int] = mapped_column(Integer, default=0)          # ₮
    fee_note: Mapped[str] = mapped_column(String(120), default="")
    registration_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    registration_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    round: Mapped[ClubRound] = relationship(back_populates="clubs", lazy="selectin")
    images: Mapped[list["ClubImage"]] = relationship(back_populates="club", cascade="all, delete-orphan",
                                                     order_by="ClubImage.order, ClubImage.id", lazy="selectin")


class ClubImage(Base):
    __tablename__ = "club_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id", ondelete="CASCADE"), index=True)
    file: Mapped[str] = mapped_column(String(255))
    order: Mapped[int] = mapped_column(Integer, default=0)

    club: Mapped[Club] = relationship(back_populates="images")


class ClubRegistration(Base):
    __tablename__ = "club_registrations"
    __table_args__ = (
        Index("uq_club_reg_round_email", "round_id", "email", unique=True,
              postgresql_where=text("status = 'confirmed'")),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id", ondelete="RESTRICT"), index=True)
    round_id: Mapped[int] = mapped_column(ForeignKey("club_rounds.id", ondelete="RESTRICT"), index=True)
    email: Mapped[str] = mapped_column(String(254))
    student_last_name: Mapped[str] = mapped_column(String(80))
    student_first_name: Mapped[str] = mapped_column(String(80))
    guardian_last_name: Mapped[str] = mapped_column(String(80))
    guardian_first_name: Mapped[str] = mapped_column(String(80))
    phone: Mapped[str] = mapped_column(String(30))
    grade: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(12), default=REG_CONFIRMED)
    is_paid_marked: Mapped[bool] = mapped_column(Boolean, default=False)
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    club: Mapped[Club] = relationship(lazy="selectin")


class EmailCode(Base):
    """Нэг хаягт нэг мөр: хамгийн сүүлийн код л хүчинтэй."""

    __tablename__ = "email_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    code_hash: Mapped[str] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    sent_count: Mapped[int] = mapped_column(Integer, default=1)
    first_sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
