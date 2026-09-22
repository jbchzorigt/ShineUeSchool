# Мэдээний булан (News) — дизайн

Огноо: 2026-09-19. Төлөв: батлагдсан (хувилбар А). Backend: FastAPI + PostgreSQL (2026-09-18 шилжүүлэлтийн дараах stack).

## 1. Зорилго ба хамрах хүрээ

Сургуулийн мэдээг админ (`news` эрх эсвэл superuser) rich text-ээр бичиж, зурагтай, ангилалтай, огноо-цагтай нийтэлнэ. Зочид Facebook-ээр нэвтэрч сэтгэгдэл бичиж, лайк дарна; мэдээг Facebook дээр share хийнэ. Нийтлэхэд сургуулийн Facebook Page дээр автоматаар пост тавина.

Facebook-ийн бүх функц **сонголттой**: `FB_*` тохиргоо хоосон бол мэдээ нийтлэх, унших бүрэн ажиллана; коммент/лайк/автомат пост идэвхгүй, хуудсан дээр "Facebook холболт тохируулагдаагүй" гэж харагдана.

Хамрахгүй: мэдээний захиалга/имэйл, олон хэл, Facebook дээрх постын комментыг сайт руу татах.

Урьдчилсан нөхцөл (хэрэглэгч/сургууль хийнэ): Facebook App (App ID, App Secret), Facebook Login бүтээгдэхүүн идэвхжүүлсэн, сургуулийн Page ID ба урт хугацааны Page Access Token (`pages_manage_posts`, `pages_read_engagement`; App Review шаардлагатай байж болно).

Ажлын журам: commit/push хийхгүй, local тест бүрэн дууссаны дараа.

## 2. Өгөгдлийн загвар (`backend/app/news/models.py`, `backend/app/social/models.py`)

| Хүснэгт | Талбарууд | Дүрэм |
|---|---|---|
| news_categories | id, name (80), slug (80) unique, order (smallint, default 0) | |
| news_posts | id, title (200), slug (220) unique, excerpt (280, default ""), body_html (text, default ""), cover_image (255, nullable; MEDIA_DIR доторх зам "news/uuid.jpg"), category_id → news_categories (nullable, SET NULL), published_at (timestamptz, index, nullable; ноорог бол null), is_published (bool, default false), author_id → users (nullable, SET NULL), created_at, updated_at (timestamptz), fb_post_id (100, nullable), fb_error (text, nullable) | slug гарчгаас авто (кирилл→латин галиг, давхардвал `-2`, `-3`); нийтэд `is_published AND published_at <= now()` л харагдана |
| news_images | id, post_id → news_posts (CASCADE), image (255), caption (200, default ""), order (smallint, default 0) | |
| visitors | id, fb_id (64) unique, name (150), avatar_url (500, default ""), created_at, is_blocked (bool default false) | Facebook-ээр нэвтэрсэн зочин |
| news_comments | id, post_id (CASCADE), visitor_id → visitors (CASCADE), body (text, 1–2000 тэмдэгт), created_at, is_hidden (bool default false) | |
| news_likes | post_id, visitor_id (composite PK, CASCADE) | нэг зочин нэг мэдээнд нэг лайк |

Огноо: `published_at` цагтай; админ Asia/Ulaanbaatar-аар оруулна, UTC-ээр хадгална; жагсаалт `published_at DESC`.

## 3. API

Мэдээний `posts/` жагсаалт **хуудаслалттай**: `{items, total, page, page_size}` (page_size анхдагч 12, дээд 50). Бусад жагсаалт массив. Зам төгсгөлийн `/`-тэй.

### Нээлттэй
- `GET /api/news/categories/` → `[{id, name, slug, order, post_count}]` (post_count = нийтлэгдсэн мэдээ)
- `GET /api/news/posts/?page=&page_size=&category=<slug>` → items: `PostCard {id, title, slug, excerpt, cover_image (абсолют URL|null), category {id,name,slug}|null, published_at, likes_count, comments_count}`
- `GET /api/news/posts/{slug}/` → `PostDetail = PostCard + {body_html, images:[{id,image,caption,order}], liked_by_me, fb_post_id}` (`liked_by_me` зочны JWT байвал, үгүй бол false)
- `GET /api/news/posts/{slug}/comments/` → `[{id, body, created_at, visitor {id, name, avatar_url}, is_mine}]` (нуугдсан нь орохгүй, шинэ нь эхэнд)
- `GET /api/social/facebook/status/` → `{enabled, app_id, page_url}`

### Зочин (visitor JWT, payload `type=visitor`, `sub`=visitor id)
- `POST /api/social/facebook/login/` `{access_token}` → Graph `debug_token` (app access token-оор, `is_valid` ба `app_id` таарах) + `/me?fields=id,name,picture.width(200)` → visitor upsert (нэр, зураг шинэчилнэ) → `{token, visitor {id,name,avatar_url}}`. Токен `visitor_ttl_days` (30). `is_blocked` бол 403. FB тохируулаагүй бол 503 `{detail}`.
- `GET /api/social/me/` → visitor мэдээлэл (JWT шалгах)
- `POST /api/news/posts/{slug}/comments/` `{body}` → 201 comment; хоосон/2000-аас урт → 400 `{body: [...]}`; блоклогдсон зочин 403
- `DELETE /api/news/comments/{id}/` → 204 (зөвхөн өөрийнх; бусдынх 403)
- `POST /api/news/posts/{slug}/like/` → `{liked: true, likes_count}` (давхар дарвал ижил хариу); `DELETE .../like/` → `{liked: false, likes_count}`
- FB тохируулаагүй үед зочны бүх endpoint 503.

### Админ (`require_role("news")`)
- `GET /api/news/admin/posts/?page=&status=draft|published|all&category=` → items: PostCard + `{is_published, author {id, full_name}|null, fb_error, created_at, updated_at}`
- `GET /api/news/admin/posts/{id}/` → бүрэн (PostDetail + админ талбарууд)
- `POST /api/news/admin/posts/` `{title, slug?, excerpt, body_html, category_id, published_at?}` → 201 (үргэлж ноорог); `PATCH /api/news/admin/posts/{id}/` (ижил талбарууд, бүгд сонголттой); `DELETE` → 204 (ковер, галерей файлууд устна)
- `POST /api/news/admin/posts/{id}/cover/` multipart `image` → PostDetail; `DELETE .../cover/` → ковер устгана
- `POST /api/news/admin/posts/{id}/images/` multipart `image`, `caption`, `order` → image; `PATCH /api/news/admin/images/{id}/` `{caption, order}`; `DELETE`
- `POST /api/news/admin/upload-image/` multipart `image` → `{url}` (rich text дундах зураг, `news/body/` дэд хавтас)
- `POST /api/news/admin/posts/{id}/publish/` `{post_to_facebook: bool}` → `is_published=true`, `published_at` хоосон бол одоо; хариу `{post: PostDetail, fb: {ok, post_id, error}}`. `post_to_facebook` ба FB идэвхтэй бол Graph `POST /{page_id}/feed` `{message: title + "\n\n" + excerpt, link: public_site_url + "/news/" + slug}`; амжилт → `fb_post_id` хадгална; алдаа → `fb_error` хадгална, HTTP 200 хэвээр. FB идэвхгүй → `fb: {ok: false, error: "Facebook холболт тохируулагдаагүй."}`. Аль хэдийн `fb_post_id`-тэй бол дахин пост хийхгүй.
- `POST /api/news/admin/posts/{id}/unpublish/` → `is_published=false`
- `GET /api/news/admin/comments/?post=&hidden=&page=` , `PATCH /api/news/admin/comments/{id}/` `{is_hidden}`, `DELETE`
- `GET /api/news/admin/visitors/?page=`, `PATCH /api/news/admin/visitors/{id}/` `{is_blocked}`
- `GET/POST /api/news/admin/categories/`, `PATCH/DELETE .../{id}/` (устгахад мэдээнүүдийн category NULL)

### HTML цэвэрлэлт
`body_html` хадгалахын өмнө `nh3.clean`: tags `p, br, strong, b, em, i, u, s, h2, h3, ul, ol, li, a, img, blockquote`; attributes `a: href, title`; `img: src, alt`; `href`/`src` зөвхөн `http`, `https`, `mailto`; `a`-д `rel="noopener noreferrer"`. Facebook постын текстэд HTML орохгүй (title + excerpt).

### Тохиргоо (`app/config.py`)
`fb_app_id`, `fb_app_secret`, `fb_page_id`, `fb_page_access_token` (бүгд default ""), `public_site_url` (default "http://localhost:3000"), `visitor_ttl_days` (30). `settings.fb_enabled` = дөрвөн утга бүгд өгөгдсөн.

Facebook дуудлага `app/social/facebook.py`: `class FacebookClient` (`httpx.AsyncClient`, base `https://graph.facebook.com/v21.0`), методууд `debug_token(token) -> dict`, `me(token) -> dict`, `post_to_page(message, link) -> str (post id)`; алдаанд `FacebookError(message)`. Router-ууд `get_facebook()` dependency-ээр авна, тестэд override.

## 4. Админ UI (`/admin/news/*`, `news` эрх эсвэл superuser)

- `/admin/news` — жагсаалт: огноо-цаг, гарчиг, ангилал, төлөв badge (Ноорог / Нийтлэгдсэн / Товлосон = published_at ирээдүйд), FB (✓ post id / ⚠ алдаа / —), үйлдэл (Засах, Нийтлэх эсвэл Буцаах, Устгах). Шүүлт: төлөв, ангилал. Хуудаслалт.
- `/admin/news/new`, `/admin/news/[id]` — засварлагч: гарчиг, slug (авто, засаж болно), ангилал select, огноо-цаг (`datetime-local`, хоосон бол нийтлэх мөчид), товч агуулга (280 тоолуур), ковер зураг (upload/солих/устгах), Tiptap rich text (тод, налуу, H2/H3, жагсаалт, холбоос, зураг оруулах → `upload-image`), галерей (олон зураг, caption, дараалал, устгах), доод мөр: "Ноорог хадгалах", "Нийтлэх" (checkbox "Facebook Page дээр пост тавих"; FB идэвхгүй бол disabled + тайлбар). Нийтэлсний дараа FB үр дүн (post id эсвэл алдаа) харагдана. Шинэ мэдээнд эхлээд "Ноорог хадгалах" → id үүссэний дараа зураг оруулах боломжтой (хадгалаагүй бол зургийн хэсэг "Эхлээд ноорог хадгална уу").
- `/admin/news/categories` — жагсаалт, нэмэх, засах, устгах.
- `/admin/news/comments` — сүүлийн комментууд (мэдээ, зочин, огноо), мэдээгээр шүүх, нуух/буцаах/устгах, зочин блоклох/сэргээх.
- Цэсэнд "Мэдээ" (`news` эрх эсвэл superuser); одоогийн админ бүрдлүүдийн загвар.

Tiptap: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`. Зураг оруулахад файл сонгуулж `upload-image` руу явуулаад буцсан URL-ийг оруулна.

## 5. Олон нийтийн хуудас

- `/news` — нүүр хуудасны мэдээний загвар (том + 2 жижиг + grid), ангиллын шүүлт (chip мөр), хуудаслалт (`?page=`, `?category=`). Server component, `fetch` (`next: {revalidate: 60}`).
- `/news/[slug]` — ковер (бүтэн өргөн), ангилал, огноо-цаг (`2026.09.19, 14:30`), гарчиг (Piazzolla), бие (өөрийн `.news-body` CSS: h2/h3, p, ul/ol, blockquote, img, a), галерей (grid; дарвал энгийн `<dialog>`-д томруулна), доод мөр: Лайк товч + тоо, Share (Facebook `sharer.php?u=`, "Холбоос хуулах"), Коммент хэсэг. `generateMetadata`: title, description=excerpt, `openGraph {title, description, images:[cover], url, type:"article"}`. Олдохгүй бол 404.
- Зочны нэвтрэлт (client): Facebook JS SDK (`FB.init` app id status endpoint-оос, `FB.login` → accessToken → `POST /api/social/facebook/login/`), visitor JWT localStorage `shineue.visitor`; нэвтэрсэн бол нэр/зураг + "Гарах". FB идэвхгүй бол лайк/коммент товчны оронд "Facebook холболт тохируулагдаагүй" текст.
- Коммент: жагсаалт (шинэ нь дээр), бичих textarea (2000 хүртэл, тоолуур), өөрийн комментоо устгах.
- Нүүр хуудас (`/`): `NewsSection` API-аас сүүлийн 7 мэдээ (server fetch, revalidate 60); `home-data.ts`-ийн `NEWS`, `NEWS_PAGE_COUNT`, `NewsItem` устгаж `types.ts`-ийн `PostCard` ашиглана; хуудаслалт `/news?page=`; мэдээ байхгүй бол хэсэг "Мэдээ удахгүй" гэж харагдана; API ажиллахгүй бол хэсэг алгасагдана (build тасрахгүй).
- Дизайн: нүүрийн системийн дагуу (дэвтрийн нүд, Piazzolla, `line`/`muted` өнгө), анимацигүй.

## 6. Тест

Backend pytest: ангилал CRUD, устгахад мэдээний category NULL; мэдээ үүсгэх (slug авто галиг, давхардал `-2`), PATCH, устгахад файлууд устах; нийтэд ноорог/ирээдүйн мэдээ харагдахгүй, `published_at DESC`; хуудаслалт (`total`, `page_size` cap 50, `category` шүүлт); `body_html` цэвэрлэлт (`<script>`, `onclick` алга, `javascript:` href алга, `rel` нэмэгдэнэ); ковер/галерей/upload-image; зочин login (FacebookClient mock: амжилт → visitor upsert ба токен, буруу токен 401, блоклогдсон 403, FB идэвхгүй 503); `GET /api/social/me/`; коммент бичих/устгах эрх (бусдынх 403, нуугдсан нь жагсаалтад орохгүй, `is_mine`); лайк idempotent, тоо зөв, `liked_by_me`; publish + FB mock (амжилт → fb_post_id, алдаа → fb_error, HTTP 200; давхар publish дахин пост хийхгүй); FB идэвхгүй үед publish → fb.ok false; админ коммент нуух, зочин блоклох → блоклогдсон зочин коммент бичиж чадахгүй; `news` эрхгүй staff → 403.
Frontend: tsc, eslint; browser дээр админ засварлагч (Tiptap), нийтлэх, `/news`, `/news/[slug]`, нүүр.

## 7. Дараалал
1. Модель + миграци `0004` + тохиргоо + slug туслах
2. Нээлттэй унших API (categories, posts list/detail, comments list) + хуудаслалт
3. Админ posts CRUD + HTML цэвэрлэлт + зураг (cover, gallery, upload-image) + categories admin
4. Social: FacebookClient (mockable), visitor login, visitor JWT, `/api/social/me/`, status
5. Коммент, лайк API (зочин + админ хяналт, visitors)
6. Publish/unpublish + Facebook auto-post
7. Frontend: types/api, админ цэс, `/admin/news` жагсаалт, `/admin/news/categories`
8. Frontend: админ засварлагч (Tiptap) + ковер + галерей + publish, `/admin/news/comments`
9. Frontend: `/news`, `/news/[slug]`, зочны нэвтрэлт, коммент/лайк/share, нүүрийн NewsSection API-д
10. README (Facebook тохиргооны заавар), `.env.example` — local тест
