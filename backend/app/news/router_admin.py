"""
Мэдээний админ API (news эрх эсвэл superuser). Бүх зам /api/news/admin/ дор.
  posts/ (GET хуудаслалт ?status=&category=&page=, POST), posts/{id}/ (GET, PATCH, DELETE)
  posts/{id}/cover/ (POST multipart, DELETE), posts/{id}/images/ (POST), images/{id}/ (PATCH, DELETE)
  upload-image/ (POST multipart → {url}), posts/{id}/publish/, posts/{id}/unpublish/  (Task 6)
  categories/ CRUD, comments/, visitors/ (Task 5)
"""

from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import require_role
from ..auth.models import User
from ..common.errors import FieldError
from ..common.media import delete_file, save_upload
from ..config import settings
from ..db import get_db
from ..social.facebook import FacebookClient, FacebookError, get_facebook
from ..social.models import Visitor
from .models import Category, Comment, Post, PostImage
from .router_public import counts_for, media_url, post_detail
from .sanitize import clean_html
from .schemas import (
    AuthorRef, CategoryIn, CategoryOut, CategoryPatch, CommentAdmin, CommentAdminPage, CommentHideIn, ImageOut,
    ImagePatch, PostAdmin, PostAdminPage, PostIn, PostPatch, PostRef, PublishIn, PublishOut, FbResult,
    VisitorAdmin, VisitorAdminPage, VisitorBlockIn, VisitorOut,
)
from .slug import slugify, unique_slug

router = APIRouter(prefix="/api/news/admin", tags=["news-admin"], dependencies=[Depends(require_role("news"))])
DB = Annotated[AsyncSession, Depends(get_db)]
Editor = Annotated[User, Depends(require_role("news"))]


async def get_post_or_404(db: AsyncSession, id: int) -> Post:
    p = await db.get(Post, id)
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return p


async def post_admin(request: Request, db: AsyncSession, p: Post) -> PostAdmin:
    counts = await counts_for(db, [p.id])
    author = await db.get(User, p.author_id) if p.author_id else None
    base = post_detail(request, p, *counts[p.id], liked=False)
    return PostAdmin(**base.model_dump(), is_published=p.is_published, fb_error=p.fb_error,
                     created_at=p.created_at, updated_at=p.updated_at,
                     author=AuthorRef(id=author.id, full_name=author.full_name or author.username) if author else None)


async def _apply_slug(db: AsyncSession, p: Post, wanted: str | None, title: str) -> None:
    base = slugify(wanted) if wanted else slugify(title)
    if wanted:
        taken = (await db.execute(select(Post.id).where(Post.slug == base, Post.id != (p.id or 0)))).first()
        if taken:
            raise FieldError("slug", "Ийм slug-тай мэдээ байна.")
        p.slug = base
    else:
        p.slug = await unique_slug(db, base, exclude_id=p.id)


# ---- мэдээ ----
@router.get("/posts/", response_model=PostAdminPage)
async def admin_posts(request: Request, db: DB, page: int = 1, page_size: int = 20,
                      status_: Annotated[Literal["all", "draft", "published"], Query(alias="status")] = "all",
                      category: str | None = None):
    if page < 1:
        raise FieldError("page", "Хуудас 1-ээс эхэлнэ.")
    page_size = max(1, min(page_size, 50))
    where = []
    if status_ == "draft":
        where.append(Post.is_published.is_(False))
    elif status_ == "published":
        where.append(Post.is_published.is_(True))
    if category:
        where.append(Post.category.has(Category.slug == category))
    total = (await db.execute(select(func.count(Post.id)).where(*where))).scalar_one()
    posts = (await db.execute(select(Post).where(*where).order_by(Post.created_at.desc(), Post.id.desc())
                              .offset((page - 1) * page_size).limit(page_size))).scalars().all()
    return PostAdminPage(items=[await post_admin(request, db, p) for p in posts], total=total, page=page, page_size=page_size)


@router.post("/posts/", response_model=PostAdmin, status_code=201)
async def admin_post_create(body: PostIn, request: Request, db: DB, me: Editor):
    if body.category_id is not None and await db.get(Category, body.category_id) is None:
        raise FieldError("category_id", "Ангилал олдсонгүй.")
    p = Post(title=body.title, excerpt=body.excerpt, body_html=clean_html(body.body_html),
             category_id=body.category_id, published_at=body.published_at, author_id=me.id, is_published=False)
    await _apply_slug(db, p, body.slug, body.title)
    db.add(p)
    await db.flush()
    await db.commit()
    await db.refresh(p)
    return await post_admin(request, db, p)


@router.get("/posts/{id}/", response_model=PostAdmin)
async def admin_post_get(id: int, request: Request, db: DB):
    return await post_admin(request, db, await get_post_or_404(db, id))


@router.patch("/posts/{id}/", response_model=PostAdmin)
async def admin_post_patch(id: int, body: PostPatch, request: Request, db: DB):
    p = await get_post_or_404(db, id)
    data = body.model_dump(exclude_unset=True)
    if "body_html" in data and data["body_html"] is not None:
        data["body_html"] = clean_html(data["body_html"])
    if data.get("category_id") is not None and await db.get(Category, data["category_id"]) is None:
        raise FieldError("category_id", "Ангилал олдсонгүй.")
    slug = data.pop("slug", None)
    for k, v in data.items():
        if v is not None or k in ("category_id", "published_at"):
            setattr(p, k, v)
    if slug is not None:
        await _apply_slug(db, p, slug, p.title)
    await db.commit()
    await db.refresh(p)
    return await post_admin(request, db, p)


@router.delete("/posts/{id}/", status_code=204)
async def admin_post_delete(id: int, db: DB):
    p = await get_post_or_404(db, id)
    files = [p.cover_image, *[i.image for i in p.images]]
    await db.delete(p)
    await db.commit()
    for f in files:
        if f:
            delete_file(f)


# ---- зураг ----
@router.post("/posts/{id}/cover/", response_model=PostAdmin)
async def admin_cover_set(id: int, request: Request, db: DB, image: Annotated[UploadFile, File()]):
    p = await get_post_or_404(db, id)
    old = p.cover_image
    p.cover_image = await save_upload(image, "news")
    await db.commit()
    if old:
        delete_file(old)
    await db.refresh(p)
    return await post_admin(request, db, p)


@router.delete("/posts/{id}/cover/", response_model=PostAdmin)
async def admin_cover_delete(id: int, request: Request, db: DB):
    p = await get_post_or_404(db, id)
    old, p.cover_image = p.cover_image, None
    await db.commit()
    if old:
        delete_file(old)
    await db.refresh(p)
    return await post_admin(request, db, p)


@router.post("/posts/{id}/images/", response_model=ImageOut, status_code=201)
async def admin_image_add(id: int, request: Request, db: DB, image: Annotated[UploadFile, File()],
                          caption: Annotated[str, Form()] = "", order: Annotated[int, Form()] = 0):
    p = await get_post_or_404(db, id)
    img = PostImage(post_id=p.id, image=await save_upload(image, "news/gallery"), caption=caption[:200], order=order)
    db.add(img)
    await db.commit()
    return ImageOut(id=img.id, image=media_url(request, img.image), caption=img.caption, order=img.order)


@router.patch("/images/{id}/", response_model=ImageOut)
async def admin_image_patch(id: int, body: ImagePatch, request: Request, db: DB):
    img = await db.get(PostImage, id)
    if img is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(img, k, v)
    await db.commit()
    return ImageOut(id=img.id, image=media_url(request, img.image), caption=img.caption, order=img.order)


@router.delete("/images/{id}/", status_code=204)
async def admin_image_delete(id: int, db: DB):
    img = await db.get(PostImage, id)
    if img is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    rel = img.image
    await db.delete(img)
    await db.commit()
    delete_file(rel)


@router.post("/upload-image/", status_code=201)
async def admin_upload_image(request: Request, image: Annotated[UploadFile, File()]):
    """Rich text дундах зураг: файлыг хадгалаад URL буцаана."""
    return {"url": media_url(request, await save_upload(image, "news/body"))}


# ---- нийтлэх (Task 6-д Facebook нэмэгдэнэ) ----
@router.post("/posts/{id}/publish/", response_model=PublishOut)
async def admin_publish(id: int, body: PublishIn, request: Request, db: DB):
    p = await get_post_or_404(db, id)
    p.is_published = True
    if p.published_at is None:
        p.published_at = datetime.now(UTC)
    fb = FbResult(ok=False, post_id=None, error=None)
    if body.post_to_facebook:
        if p.published_at > datetime.now(UTC):
            fb = FbResult(ok=False, error="Товлосон мэдээг нийтлэгдэх цагт нь Facebook-т пост хийнэ.")
        elif p.fb_post_id:
            fb = FbResult(ok=True, post_id=p.fb_post_id)
        elif not settings.fb_enabled:
            fb = FbResult(ok=False, error="Facebook холболт тохируулагдаагүй.")
        else:
            client: FacebookClient = request.app.dependency_overrides.get(get_facebook, get_facebook)()
            try:
                p.fb_post_id = await client.post_to_page(f"{p.title}\n\n{p.excerpt}".strip(), f"{settings.public_site_url}/news/{p.slug}")
                p.fb_error = None
                fb = FbResult(ok=True, post_id=p.fb_post_id)
            except FacebookError as e:
                p.fb_error = str(e)
                fb = FbResult(ok=False, error=str(e))
    await db.commit()
    await db.refresh(p)
    return PublishOut(post=await post_admin(request, db, p), fb=fb)


@router.post("/posts/{id}/unpublish/", response_model=PostAdmin)
async def admin_unpublish(id: int, request: Request, db: DB):
    p = await get_post_or_404(db, id)
    p.is_published = False
    await db.commit()
    await db.refresh(p)
    return await post_admin(request, db, p)


# ---- ангилал ----
@router.get("/categories/", response_model=list[CategoryOut])
async def admin_categories(db: DB):
    counts = dict((await db.execute(select(Post.category_id, func.count()).group_by(Post.category_id))).all())
    cats = (await db.execute(select(Category).order_by(Category.order, Category.name))).scalars().all()
    return [CategoryOut(id=c.id, name=c.name, slug=c.slug, order=c.order, post_count=counts.get(c.id, 0)) for c in cats]


@router.post("/categories/", response_model=CategoryOut, status_code=201)
async def admin_category_create(body: CategoryIn, db: DB):
    c = Category(name=body.name, slug=slugify(body.slug or body.name), order=body.order)
    db.add(c)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise FieldError("slug", "Ийм slug-тай ангилал байна.") from None
    await db.commit()
    return CategoryOut(id=c.id, name=c.name, slug=c.slug, order=c.order)


@router.patch("/categories/{id}/", response_model=CategoryOut)
async def admin_category_patch(id: int, body: CategoryPatch, db: DB):
    c = await db.get(Category, id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    data = body.model_dump(exclude_unset=True)
    if data.get("slug"):
        data["slug"] = slugify(data["slug"])
    for k, v in data.items():
        if v is not None:
            setattr(c, k, v)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise FieldError("slug", "Ийм slug-тай ангилал байна.") from None
    await db.commit()
    return CategoryOut(id=c.id, name=c.name, slug=c.slug, order=c.order)


@router.delete("/categories/{id}/", status_code=204)
async def admin_category_delete(id: int, db: DB):
    c = await db.get(Category, id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    await db.delete(c)
    await db.commit()


# ---- коммент/зочин ----
def _page(page: int, page_size: int) -> tuple[int, int, int]:
    if page < 1:
        raise FieldError("page", "Хуудас 1-ээс эхэлнэ.")
    page_size = max(1, min(page_size, 50))
    return page, page_size, (page - 1) * page_size


def _comment_admin(c: Comment, v: Visitor, p: Post) -> CommentAdmin:
    return CommentAdmin(id=c.id, body=c.body, created_at=c.created_at, is_mine=False, is_hidden=c.is_hidden,
                        visitor=VisitorOut(id=v.id, name=v.name, avatar_url=v.avatar_url),
                        post=PostRef(id=p.id, title=p.title, slug=p.slug))


@router.get("/comments/", response_model=CommentAdminPage)
async def admin_comments(db: DB, post: int | None = None, hidden: bool | None = None, page: int = 1, page_size: int = 20):
    page, page_size, offset = _page(page, page_size)
    where = []
    if post is not None:
        where.append(Comment.post_id == post)
    if hidden is not None:
        where.append(Comment.is_hidden.is_(hidden))
    total = (await db.execute(select(func.count(Comment.id)).where(*where))).scalar_one()
    rows = (await db.execute(
        select(Comment, Visitor, Post).join(Visitor, Visitor.id == Comment.visitor_id).join(Post, Post.id == Comment.post_id)
        .where(*where).order_by(Comment.created_at.desc(), Comment.id.desc()).offset(offset).limit(page_size))).all()
    items = [_comment_admin(c, v, p) for c, v, p in rows]
    return CommentAdminPage(items=items, total=total, page=page, page_size=page_size)


@router.patch("/comments/{id}/", response_model=CommentAdmin)
async def admin_comment_hide(id: int, body: CommentHideIn, db: DB):
    c = await db.get(Comment, id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    c.is_hidden = body.is_hidden
    await db.commit()
    v, p = await db.get(Visitor, c.visitor_id), await db.get(Post, c.post_id)
    return _comment_admin(c, v, p)


@router.delete("/comments/{id}/", status_code=204)
async def admin_comment_delete(id: int, db: DB):
    c = await db.get(Comment, id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    await db.delete(c)
    await db.commit()


@router.get("/visitors/", response_model=VisitorAdminPage)
async def admin_visitors(db: DB, page: int = 1, page_size: int = 20):
    page, page_size, offset = _page(page, page_size)
    total = (await db.execute(select(func.count(Visitor.id)))).scalar_one()
    counts = dict((await db.execute(select(Comment.visitor_id, func.count()).group_by(Comment.visitor_id))).all())
    vs = (await db.execute(select(Visitor).order_by(Visitor.created_at.desc()).offset(offset).limit(page_size))).scalars().all()
    return VisitorAdminPage(items=[VisitorAdmin(id=v.id, fb_id=v.fb_id, name=v.name, avatar_url=v.avatar_url, created_at=v.created_at,
                                                is_blocked=v.is_blocked, comments_count=counts.get(v.id, 0)) for v in vs],
                            total=total, page=page, page_size=page_size)


@router.patch("/visitors/{id}/", response_model=VisitorAdmin)
async def admin_visitor_block(id: int, body: VisitorBlockIn, db: DB):
    v = await db.get(Visitor, id)
    if v is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    v.is_blocked = body.is_blocked
    await db.commit()
    n = (await db.execute(select(func.count(Comment.id)).where(Comment.visitor_id == v.id))).scalar_one()
    return VisitorAdmin(id=v.id, fb_id=v.fb_id, name=v.name, avatar_url=v.avatar_url, created_at=v.created_at, is_blocked=v.is_blocked, comments_count=n)
