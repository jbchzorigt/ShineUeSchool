"""
Мэдээний нээлттэй API.
  GET /api/news/categories/                → [{id,name,slug,order,post_count}]
  GET /api/news/posts/?page=&page_size=&category=  → {items,total,page,page_size}
  GET /api/news/posts/{slug}/              → PostDetail
  GET /api/news/posts/{slug}/comments/     → [CommentOut]
"""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..common.errors import FieldError
from ..config import settings
from ..db import get_db
from ..social.deps import current_visitor, optional_visitor
from ..social.facebook import get_facebook
from ..social.models import Visitor
from .models import Category, Comment, Like, Post
from .schemas import CategoryOut, CommentIn, CommentOut, ImageOut, LikeOut, PostCard, PostDetail, PostPage, VisitorOut

router = APIRouter(prefix="/api/news", tags=["news"])
DB = Annotated[AsyncSession, Depends(get_db)]

PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX = 12, 50


def media_url(request: Request, rel: str | None) -> str | None:
    if not rel:
        return None
    if settings.media_base_url:
        return f"{settings.media_base_url.rstrip('/')}/media/{rel}"
    return f"{request.base_url}media/{rel}"


def public_filter():
    now = datetime.now(UTC)
    return and_(Post.is_published.is_(True), Post.published_at.is_not(None), Post.published_at <= now)


def paginate(page: int, page_size: int) -> tuple[int, int, int]:
    if page < 1:
        raise FieldError("page", "Хуудас 1-ээс эхэлнэ.")
    page_size = max(1, min(page_size, PAGE_SIZE_MAX))
    return page, page_size, (page - 1) * page_size


async def counts_for(db: AsyncSession, post_ids: list[int]) -> dict[int, tuple[int, int]]:
    """{post_id: (likes, visible comments)}"""
    if not post_ids:
        return {}
    likes = dict((await db.execute(
        select(Like.post_id, func.count()).where(Like.post_id.in_(post_ids)).group_by(Like.post_id))).all())
    comments = dict((await db.execute(
        select(Comment.post_id, func.count()).where(Comment.post_id.in_(post_ids), Comment.is_hidden.is_(False))
        .group_by(Comment.post_id))).all())
    return {pid: (likes.get(pid, 0), comments.get(pid, 0)) for pid in post_ids}


def post_card(request: Request, p: Post, likes: int, comments: int) -> PostCard:
    return PostCard(
        id=p.id, title=p.title, slug=p.slug, excerpt=p.excerpt, cover_image=media_url(request, p.cover_image),
        category={"id": p.category.id, "name": p.category.name, "slug": p.category.slug} if p.category else None,
        published_at=p.published_at, likes_count=likes, comments_count=comments,
    )


def post_detail(request: Request, p: Post, likes: int, comments: int, liked: bool) -> PostDetail:
    return PostDetail(
        **post_card(request, p, likes, comments).model_dump(),
        body_html=p.body_html, liked_by_me=liked, fb_post_id=p.fb_post_id,
        images=[ImageOut(id=i.id, image=media_url(request, i.image), caption=i.caption, order=i.order) for i in p.images],
    )


async def get_public_post(db: AsyncSession, slug: str) -> Post:
    p = (await db.execute(select(Post).where(Post.slug == slug, public_filter()))).scalar_one_or_none()
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return p


@router.get("/categories/", response_model=list[CategoryOut])
async def categories(db: DB):
    counts = dict((await db.execute(
        select(Post.category_id, func.count()).where(public_filter()).group_by(Post.category_id))).all())
    cats = (await db.execute(select(Category).order_by(Category.order, Category.name))).scalars().all()
    return [CategoryOut(id=c.id, name=c.name, slug=c.slug, order=c.order, post_count=counts.get(c.id, 0)) for c in cats]


@router.get("/posts/", response_model=PostPage)
async def posts_list(request: Request, db: DB, page: int = 1, page_size: int = PAGE_SIZE_DEFAULT, category: str | None = None):
    page, page_size, offset = paginate(page, page_size)
    where = [public_filter()]
    if category:
        where.append(Post.category.has(Category.slug == category))
    total = (await db.execute(select(func.count(Post.id)).where(*where))).scalar_one()
    posts = (await db.execute(
        select(Post).where(*where).order_by(Post.published_at.desc(), Post.id.desc()).offset(offset).limit(page_size)
    )).scalars().all()
    counts = await counts_for(db, [p.id for p in posts])
    return PostPage(items=[post_card(request, p, *counts[p.id]) for p in posts], total=total, page=page, page_size=page_size)


@router.get("/posts/{slug}/", response_model=PostDetail)
async def post_get(slug: str, request: Request, db: DB, v: Annotated[Visitor | None, Depends(optional_visitor)]):
    p = await get_public_post(db, slug)
    counts = await counts_for(db, [p.id])
    liked = v is not None and (await db.get(Like, (p.id, v.id))) is not None
    return post_detail(request, p, *counts[p.id], liked=liked)


@router.get("/posts/{slug}/comments/", response_model=list[CommentOut])
async def comments_list(slug: str, db: DB, v: Annotated[Visitor | None, Depends(optional_visitor)]):
    p = await get_public_post(db, slug)
    rows = (await db.execute(
        select(Comment, Visitor).join(Visitor, Visitor.id == Comment.visitor_id)
        .where(Comment.post_id == p.id, Comment.is_hidden.is_(False)).order_by(Comment.created_at.desc(), Comment.id.desc())
    )).all()
    return [CommentOut(id=c.id, body=c.body, created_at=c.created_at, is_mine=(v is not None and c.visitor_id == v.id),
                       visitor=VisitorOut(id=v2.id, name=v2.name, avatar_url=v2.avatar_url)) for c, v2 in rows]


Guest = Annotated[Visitor, Depends(current_visitor)]
FbOn = Annotated[object, Depends(get_facebook)]


@router.post("/posts/{slug}/comments/", response_model=CommentOut, status_code=201)
async def comment_create(slug: str, body: CommentIn, db: DB, _: FbOn, v: Guest):
    p = await get_public_post(db, slug)
    text = body.body.strip()
    if not text:
        raise FieldError("body", "Сэтгэгдэл хоосон байж болохгүй.")
    c = Comment(post_id=p.id, visitor_id=v.id, body=text)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return CommentOut(id=c.id, body=c.body, created_at=c.created_at, is_mine=True,
                      visitor=VisitorOut(id=v.id, name=v.name, avatar_url=v.avatar_url))


@router.delete("/comments/{id}/", status_code=204)
async def comment_delete(id: int, db: DB, _: FbOn, v: Guest):
    c = await db.get(Comment, id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    if c.visitor_id != v.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Зөвхөн өөрийн сэтгэгдлийг устгана.")
    await db.delete(c)
    await db.commit()


async def _likes_count(db: AsyncSession, post_id: int) -> int:
    return (await db.execute(select(func.count()).select_from(Like).where(Like.post_id == post_id))).scalar_one()


@router.post("/posts/{slug}/like/", response_model=LikeOut)
async def like_add(slug: str, db: DB, _: FbOn, v: Guest):
    p = await get_public_post(db, slug)
    if await db.get(Like, (p.id, v.id)) is None:
        db.add(Like(post_id=p.id, visitor_id=v.id))
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
    return LikeOut(liked=True, likes_count=await _likes_count(db, p.id))


@router.delete("/posts/{slug}/like/", response_model=LikeOut)
async def like_remove(slug: str, db: DB, _: FbOn, v: Guest):
    p = await get_public_post(db, slug)
    like = await db.get(Like, (p.id, v.id))
    if like is not None:
        await db.delete(like)
        await db.commit()
    return LikeOut(liked=False, likes_count=await _likes_count(db, p.id))
