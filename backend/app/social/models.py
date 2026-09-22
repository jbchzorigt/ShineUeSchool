"""Facebook-ээр нэвтэрсэн зочин (коммент, лайк бичих эрхтэй)."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base


class Visitor(Base):
    __tablename__ = "visitors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fb_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150))
    avatar_url: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
