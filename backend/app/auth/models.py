"""Хэрэглэгч, эрхийн бүлэг (role)."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base

# Админы хэсэг бүрд 2 түвшин: "view" (харах) ба "edit" (засах; харах эрхийг агуулна). Эрхийн код: "<хэсэг>.<түвшин>".
SECTIONS = {
    "olympiad": "Олимпиад", "timetable": "Хичээлийн хуваарь", "clubs": "Дугуйлан", "about": "Бидний тухай",
    "programs": "Хөтөлбөр", "graduates": "Төгсөгч", "news": "Мэдээ",
}
LEVELS = {"view": "харах", "edit": "засах"}
ROLE_CODES = {f"{s}.{lv}": f"{name} — {lname}" for s, name in SECTIONS.items() for lv, lname in LEVELS.items()}

user_roles = Table(
    "user_roles", Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(80))


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(150), default="")
    email: Mapped[str] = mapped_column(String(254), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    roles: Mapped[list[Role]] = relationship(secondary=user_roles, lazy="selectin")

    @property
    def role_codes(self) -> list[str]:
        return sorted(r.code for r in self.roles)

    @property
    def is_staff(self) -> bool:
        """Админ руу нэвтрэх эсэх: superuser эсвэл ямар нэг хэсгийн эрхтэй."""
        return self.is_superuser or len(self.roles) > 0

    def can(self, section: str, level: str = "view") -> bool:
        """Хэсгийн эрх: superuser бүгдийг; "edit" нь "view"-г агуулна."""
        codes = self.role_codes
        return self.is_superuser or f"{section}.edit" in codes or (level == "view" and f"{section}.view" in codes)
