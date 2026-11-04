"""Элсэлт: жил бүрийн элсэлтийн ээлж (зарлал), элсэгчийн бүртгэл, шалгалтын дүн.

Олон нийтэд зөвхөн элсэгчийн код (SU26-7KQ4M), анги, оноо, төлөв харагдана — нэр, холбоо барих мэдээлэл
зөвхөн менежерт. Код санамсаргүй тул нийтийн жагсаалтаас хүнийг тодорхойлох боломжгүй.
"""

from datetime import date, datetime

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base

APP_REGISTERED = "registered"
APP_WITHDRAWN = "withdrawn"

# Шалгалтын дүнгийн төлөв (None = дүн ороогүй)
RESULT_PASSED = "passed"
RESULT_FAILED = "failed"
RESULT_WAITLIST = "waitlist"
RESULT_ABSENT = "absent"
RESULT_LABELS = {RESULT_PASSED: "Тэнцсэн", RESULT_FAILED: "Тэнцээгүй", RESULT_WAITLIST: "Нөөц", RESULT_ABSENT: "Ирээгүй"}


class AdmissionRound(Base):
    """Жилийн элсэлтийн зарлал. Нэг л ээлж идэвхтэй (олон нийтийн хуудсууд түүнийг харуулна).

    Бүртгэл, дүн хоёр тусдаа хэсэг: тус бүр админы асаах/унтраах товч + эцсийн хугацаатай. Хугацаа өнгөрмөгц
    service.expire_sections() товчийг автоматаар унтрааж (админы самбарт ч унтарсан харагдана), админ шинэ хугацаа
    тавьж дахин асаах хүртэл сайтаас нуугдана. Хоёр хэсэг зэрэг асах боломжгүй — нэг нь асаалттай үед нөгөө нь
    идэвхгүй (баазын CHECK + router_admin-ийн шалгалт).
    """

    __tablename__ = "admission_rounds"
    __table_args__ = (
        CheckConstraint("NOT (registration_open AND results_published)", name="ck_admission_one_section_on"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))                 # "2027–2028 оны хичээлийн жилийн элсэлт"
    name_en: Mapped[str] = mapped_column(String(120), default="", server_default="")  # хоосон бол /en дээр монголоор
    code_prefix: Mapped[str] = mapped_column(String(8))            # "SU27" — элсэгчийн кодын эхлэл
    grades: Mapped[list[int]] = mapped_column(ARRAY(Integer))      # элсэлт авах ангиуд, эрэмбэлсэн
    test_info: Mapped[str] = mapped_column(Text, default="")       # шалгалтын огноо, байршил, авчрах зүйл
    test_info_en: Mapped[str] = mapped_column(Text, default="", server_default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    # Шалгалтын бүртгэл
    registration_open: Mapped[bool] = mapped_column(Boolean, default=False)
    registration_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Шалгалтын дүн
    results_published: Mapped[bool] = mapped_column(Boolean, default=False)
    results_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    results_published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # сүүлд асаасан
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Applicant(Base):
    __tablename__ = "admission_applicants"
    __table_args__ = (
        # Нэг хүүхэд нэг ээлжид нэг л удаа (ах дүүсийг нэг имэйлээр бүртгэж болно)
        Index("uq_admission_child", "round_id", "email", "child_last_name", "child_first_name", "birth_date",
              unique=True, postgresql_where=text("status = 'registered'")),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    round_id: Mapped[int] = mapped_column(ForeignKey("admission_rounds.id", ondelete="RESTRICT"), index=True)
    code: Mapped[str] = mapped_column(String(16), unique=True)
    email: Mapped[str] = mapped_column(String(254), index=True)
    child_last_name: Mapped[str] = mapped_column(String(80))
    child_first_name: Mapped[str] = mapped_column(String(80))
    birth_date: Mapped[date] = mapped_column(Date)
    gender: Mapped[str] = mapped_column(String(8))                 # "male" | "female"
    current_school: Mapped[str] = mapped_column(String(160), default="")
    grade: Mapped[int] = mapped_column(Integer)                     # элсэх анги
    guardian_last_name: Mapped[str] = mapped_column(String(80))
    guardian_first_name: Mapped[str] = mapped_column(String(80))
    phone: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(12), default=APP_REGISTERED)
    lang: Mapped[str] = mapped_column(String(2), default="mn", server_default="mn")  # бүртгүүлсэн хэл — имэйлүүд энэ хэлээр
    score: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    result: Mapped[str | None] = mapped_column(String(12), nullable=True)
    consent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    round: Mapped[AdmissionRound] = relationship(lazy="selectin")
