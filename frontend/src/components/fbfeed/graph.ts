/* =====================================================================
   Facebook Page-ийн нийтлэлүүдийг Graph API-аас татах — ЗӨВХӨН server тал
   (app/(site)/feed/page.tsx, app/api/fbfeed/route.ts). Client component-оос
   import хийж болохгүй: Page токен энд уншигдана.

   Орчны хувьсагч (frontend/.env.local, Vercel): FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN.
   Токен Authorization header-ээр явна (URL болон лог-д гарахгүй).

   Reaction/сэтгэгдэл/хуваалцсан тоо pages_read_engagement (+ pages_read_user_content)
   эрх шаардана. Эрх байхгүй бол Graph бүх хүсэлтийг алдаатай буцаадаг тул
   тоогүй талбаруудаар дахин татна — нийтлэл харагдах нь эрхээс хамаарахгүй.
   ===================================================================== */

export const GRAPH_VERSION = "v26.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const FEED_PAGE_SIZE = 10;
/** Next fetch cache: Graph-ийг минутад нэг л удаа дуудна (rate limit: өдөрт ~1440 дуудлага).
    Нээлттэй хуудас мөн REFRESH_MS тутам /api/fbfeed-ээс шинэчлэгдэнэ (FacebookFeed.tsx). */
export const FEED_REVALIDATE_SECONDS = 60;

export interface FeedPost {
  id: string;
  /** Нийтлэлийн текст (зураг-only нийтлэлд хоосон байж болно) */
  message: string;
  /** ISO 8601, Graph-ийн created_time */
  created_time: string;
  permalink_url: string;
  /** Зургууд (full_picture + attachment-ууд), давхардалгүй, дээд тал нь 4 */
  images: string[];
  /** null = эрх байхгүй тул мэдэгдэхгүй */
  reactions: number | null;
  comments: number | null;
  shares: number | null;
}

export interface FeedPage {
  posts: FeedPost[];
  /** Дараагийн хуудасны cursor (Graph paging.cursors.after); байхгүй бол null */
  next: string | null;
}

export type FeedResult =
  | { ok: true; page: FeedPage }
  | { ok: false; reason: "unconfigured" | "error"; message: string };

export function feedConfigured(): boolean {
  return Boolean(process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN);
}

const BASE_FIELDS =
  "id,message,story,created_time,permalink_url,full_picture," +
  "attachments{media_type,media{image{src}},subattachments{media{image{src}}}}";
const ENGAGEMENT_FIELDS = "reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares";

interface RawImage { image?: { src?: string } }
interface RawAttachment { media_type?: string; media?: RawImage; subattachments?: { data?: RawAttachment[] } }
interface RawPost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  permalink_url?: string;
  full_picture?: string;
  attachments?: { data?: RawAttachment[] };
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  shares?: { count?: number };
}
interface RawFeed {
  data?: RawPost[];
  paging?: { cursors?: { after?: string }; next?: string };
  error?: { message?: string; code?: number; type?: string };
}

/* Нэг зураг full_picture болон attachment-д өөр гарын үсэгтэй (oh=, stp= query) URL-аар ирдэг тул
   давхардлыг бүтэн URL-аар биш, CDN дээрх файлын замаар шалгана. */
function imageKey(src: string): string {
  try {
    return new URL(src).pathname;
  } catch {
    return src;
  }
}

function collectImages(p: RawPost): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (src?: string) => {
    if (!src || out.length >= 4) return;
    const key = imageKey(src);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(src);
  };
  push(p.full_picture);
  for (const a of p.attachments?.data ?? []) {
    push(a.media?.image?.src);
    for (const s of a.subattachments?.data ?? []) push(s.media?.image?.src);
  }
  return out;
}

/* withEngagement: тоог хүссэн бол Graph 0 хуваалцалтад `shares` талбарыг огт буцаадаггүй тул 0 гэж үзнэ. */
function toPost(p: RawPost, withEngagement: boolean): FeedPost {
  return {
    id: p.id,
    message: p.message ?? p.story ?? "",
    created_time: p.created_time,
    permalink_url: p.permalink_url ?? `https://www.facebook.com/${p.id}`,
    images: collectImages(p),
    reactions: p.reactions?.summary?.total_count ?? null,
    comments: p.comments?.summary?.total_count ?? null,
    shares: p.shares?.count ?? (withEngagement ? 0 : null),
  };
}

class GraphError extends Error {
  constructor(message: string, public code: number | undefined) {
    super(message);
  }
}

async function graphPosts(pageId: string, token: string, fields: string, after?: string): Promise<RawFeed> {
  const params = new URLSearchParams({ fields, limit: String(FEED_PAGE_SIZE) });
  if (after) params.set("after", after);
  let res: Response;
  try {
    res = await fetch(`${GRAPH}/${encodeURIComponent(pageId)}/posts?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: FEED_REVALIDATE_SECONDS },
    });
  } catch (e) {
    throw new GraphError(`Graph API холболт: ${e instanceof Error ? e.message : String(e)}`, undefined);
  }
  const data = (await res.json().catch(() => ({}))) as RawFeed;
  if (!res.ok || data.error) {
    throw new GraphError(data.error?.message ?? `Graph API алдаа (${res.status})`, data.error?.code);
  }
  return data;
}

/** Page-ийн нийтлэлүүдийг (Page өөрөө бичсэн, /posts edge) нэг хуудсаар татна. */
export async function fetchFeed({ after }: { after?: string } = {}): Promise<FeedResult> {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    return { ok: false, reason: "unconfigured", message: "FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN тохируулаагүй байна." };
  }
  let raw: RawFeed;
  let withEngagement = true;
  try {
    try {
      raw = await graphPosts(pageId, token, `${BASE_FIELDS},${ENGAGEMENT_FIELDS}`, after);
    } catch (e) {
      // Эрхийн алдаа (ихэвчлэн code 100/10/200) бол тоогүйгээр дахин оролдоно.
      if (!(e instanceof GraphError) || e.code === undefined) throw e;
      withEngagement = false;
      raw = await graphPosts(pageId, token, BASE_FIELDS, after);
    }
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Graph API алдаа" };
  }
  const posts = (raw.data ?? []).map((p) => toPost(p, withEngagement));
  const next = raw.paging?.next && raw.paging.cursors?.after ? raw.paging.cursors.after : null;
  return { ok: true, page: { posts, next } };
}
