# Facebook feed (`/feed`)

Сургуулийн Facebook Page-ийн нийтлэлүүдийг сайтын мэдээний хэсэг болгон харуулна.
Зочин реакц үлдээх, сэтгэгдэл бичих, хуваалцах гэж оролдоход Facebook-ээр нэвтрэхийг шаардана.

## Файлууд

| Файл | Үүрэг |
|---|---|
| `components/fbfeed/graph.ts` | Graph API v26.0-оос Page-ийн нийтлэл татах (server only, Page токен энд) |
| `components/fbfeed/fb-sdk.ts` | Facebook JS SDK ачаалах, нэвтрэлт шалгах, Share dialog |
| `components/fbfeed/FacebookFeed.tsx` | Картууд, "Цааш", реакц/сэтгэгдэл/хуваалцах үйлдлүүд |
| `app/(site)/feed/page.tsx` | `/feed` хуудас |
| `app/api/fbfeed/route.ts` | `GET /api/fbfeed?after=` — дараагийн хуудас |

## Орчны хувьсагч (`frontend/.env.local`, Vercel дээр мөн адил)

```
FB_PAGE_ID=<Page-ийн тоон ID>
FB_PAGE_ACCESS_TOKEN=<Page access token>
NEXT_PUBLIC_FB_APP_ID=<Meta App ID>
```

`NEXT_PUBLIC_FB_APP_ID` хоосон бол backend-ийн `/api/social/facebook/status/`-оос App ID-г авна
(backend дээр Facebook тохируулсан үед). Page токен **зөвхөн** server дээр уншигдана.

## Meta талын тохиргоо

1. [developers.facebook.com](https://developers.facebook.com) → App (Business төрөл эсвэл одоо байгаа App) → **Facebook Login for Business** / **Facebook Login** бүтээгдэхүүн нэмнэ.
2. App settings → Basic → **App Domains**-д сайтын домэйн; Facebook Login → Settings → **Valid OAuth Redirect URIs**-д
   `https://<домэйн>/` (Vercel preview URL ч болно). `localhost` Development горимд HTTP-ээр ажиллана.
3. Page токен: Graph API Explorer → User token (эрх: `pages_show_list`, `pages_read_engagement`,
   `pages_read_user_content`) → `GET /me/accounts` → тухайн Page-ийн `access_token`, `id`.
   Урт хугацааны токен хэрэгтэй бол README (root) дахь 3 алхмын солилцоог ашиглана.
4. App **Development** горимд байхад зөвхөн App-ийн Roles-д нэмсэн хүмүүс нэвтэрч чадна — тестэд тохиромжтой.
   Хүн бүрт нээхэд App-ийг Live болгоно (`public_profile`-д App Review шаардлагагүй).

## Хэрхэн ажилладаг (хязгаарлалт)

- Graph API хэрэглэгчийн өмнөөс реакц/сэтгэгдэл бичихийг 2018 оноос зөвшөөрдөггүй, Like/Comment social plugin
  2026-02-10-нд зогссон. Тиймээс "Реакц", "Сэтгэгдэл" товч: нэвтрэлт шалгасны дараа картыг Facebook-ийн
  **Embedded Post** болгон дэлгэнэ — реакц/сэтгэгдлийн товчууд Facebook-ийнх, зочны Facebook session-ээр ажиллана.
- "Хуваалцах": `FB.ui({method:"share"})` — зочны профайл руу.
- Гуравдагч cookie хаасан хөтөч (Safari, Chrome-ийн зарим тохиргоо) embedded post дотор нэвтрэлтийг танихгүй байж болно;
  тэр үед "Facebook дээр нээх" холбоос ашиглана.
- Нийтлэлүүд 5 минут cache-лэгдэнэ (`FEED_REVALIDATE_SECONDS`).

## Шалгах

```
cd frontend
npm run dev        # http://localhost:3000/feed
npm run lint
npm run build
```
