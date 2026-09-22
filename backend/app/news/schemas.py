"""Мэдээний Pydantic схемүүд (frontend/src/lib/types.ts-тэй тохирно)."""

from datetime import datetime

from pydantic import BaseModel, Field


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    order: int
    post_count: int = 0


class CategoryRef(BaseModel):
    id: int
    name: str
    slug: str


class ImageOut(BaseModel):
    id: int
    image: str
    caption: str
    order: int


class PostCard(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: str
    cover_image: str | None
    category: CategoryRef | None
    published_at: datetime | None
    likes_count: int
    comments_count: int


class PostDetail(PostCard):
    body_html: str
    images: list[ImageOut]
    liked_by_me: bool
    fb_post_id: str | None


class PostPage(BaseModel):
    items: list[PostCard]
    total: int
    page: int
    page_size: int


class VisitorOut(BaseModel):
    id: int
    name: str
    avatar_url: str


class CommentOut(BaseModel):
    id: int
    body: str
    created_at: datetime
    visitor: VisitorOut
    is_mine: bool


class CommentIn(BaseModel):
    body: str = Field(max_length=2000)


class LikeOut(BaseModel):
    liked: bool
    likes_count: int


class PostRef(BaseModel):
    id: int
    title: str
    slug: str


class CommentAdmin(CommentOut):
    is_hidden: bool
    post: PostRef


class CommentAdminPage(BaseModel):
    items: list[CommentAdmin]
    total: int
    page: int
    page_size: int


class CommentHideIn(BaseModel):
    is_hidden: bool


class VisitorAdmin(BaseModel):
    id: int
    fb_id: str
    name: str
    avatar_url: str
    created_at: datetime
    is_blocked: bool
    comments_count: int


class VisitorAdminPage(BaseModel):
    items: list[VisitorAdmin]
    total: int
    page: int
    page_size: int


class VisitorBlockIn(BaseModel):
    is_blocked: bool


class PostIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str | None = Field(default=None, max_length=220)
    excerpt: str = Field(default="", max_length=280)
    body_html: str = ""
    category_id: int | None = None
    published_at: datetime | None = None


class PostPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, max_length=220)
    excerpt: str | None = Field(default=None, max_length=280)
    body_html: str | None = None
    category_id: int | None = None
    published_at: datetime | None = None


class AuthorRef(BaseModel):
    id: int
    full_name: str


class PostAdmin(PostDetail):
    is_published: bool
    author: AuthorRef | None
    fb_error: str | None
    created_at: datetime
    updated_at: datetime


class PostAdminPage(BaseModel):
    items: list[PostAdmin]
    total: int
    page: int
    page_size: int


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    slug: str | None = Field(default=None, max_length=80)
    order: int = 0


class CategoryPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    slug: str | None = Field(default=None, max_length=80)
    order: int | None = None


class ImagePatch(BaseModel):
    caption: str | None = Field(default=None, max_length=200)
    order: int | None = None


class PublishIn(BaseModel):
    post_to_facebook: bool = False


class FbResult(BaseModel):
    ok: bool
    post_id: str | None = None
    error: str | None = None


class PublishOut(BaseModel):
    post: PostAdmin
    fb: FbResult
