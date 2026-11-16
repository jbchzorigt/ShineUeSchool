"""Сайтын хандалт: нийтийн хуудас нээгдэх бүрт нэг мөр. Зочин нь хөтчийн санамсаргүй нэргүй ID (IP, хувийн мэдээлэл хадгалахгүй)."""

from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base


class PageView(Base):
    __tablename__ = "page_views"
    __table_args__ = (Index("ix_page_views_day_visitor", "day", "visitor"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    day: Mapped[date] = mapped_column(Date, index=True)          # Улаанбаатарын цагаар
    path: Mapped[str] = mapped_column(String(200))               # query string-гүй, ж.нь "/en/news"
    visitor: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
