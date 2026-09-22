"""Мэдээний булан: ангилал, мэдээ, зураг, коммент, лайк."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base


class Category(Base):
    __tablename__ = "news_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    order: Mapped[int] = mapped_column(SmallInteger, default=0)


class Post(Base):
    __tablename__ = "news_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    excerpt: Mapped[str] = mapped_column(String(280), default="")
    body_html: Mapped[str] = mapped_column(Text, default="")
    cover_image: Mapped[str | None] = mapped_column(String(255), nullable=True)  # "news/uuid.jpg"
    category_id: Mapped[int | None] = mapped_column(ForeignKey("news_categories.id", ondelete="SET NULL"), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    fb_post_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fb_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    category: Mapped[Category | None] = relationship(lazy="selectin")
    images: Mapped[list["PostImage"]] = relationship(lazy="selectin", order_by="PostImage.order", cascade="all, delete-orphan")

    def is_public_now(self, now: datetime) -> bool:
        return bool(self.is_published and self.published_at is not None and self.published_at <= now)


class PostImage(Base):
    __tablename__ = "news_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("news_posts.id", ondelete="CASCADE"), index=True)
    image: Mapped[str] = mapped_column(String(255))
    caption: Mapped[str] = mapped_column(String(200), default="")
    order: Mapped[int] = mapped_column(SmallInteger, default=0)


class Comment(Base):
    __tablename__ = "news_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("news_posts.id", ondelete="CASCADE"), index=True)
    visitor_id: Mapped[int] = mapped_column(ForeignKey("visitors.id", ondelete="CASCADE"), index=True)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)


class Like(Base):
    __tablename__ = "news_likes"

    post_id: Mapped[int] = mapped_column(ForeignKey("news_posts.id", ondelete="CASCADE"), primary_key=True)
    visitor_id: Mapped[int] = mapped_column(ForeignKey("visitors.id", ondelete="CASCADE"), primary_key=True)
