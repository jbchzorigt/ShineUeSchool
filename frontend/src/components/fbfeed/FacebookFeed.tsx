"use client";

/* =====================================================================
   Facebook Page-ийн feed — сайтын мэдээний хэсэг (app/(site)/feed/page.tsx).

   - Загвар нь /news-ийн PostGrid-ийг дагана: сүүлийнх том, хажууд 2 жижиг, доор бусад grid-ээр.
     Facebook нийтлэлд гарчиг байхгүй тул эхний мөрийг гарчиг, үлдсэнийг тайлбар болгоно.
   - Карт дээр дарахад нийтлэл бүтнээрээ диалогт нээгдэнэ (бүх зураг, бүтэн текст,
     реакц / сэтгэгдэл / хуваалцах).
   - Нийтлэлүүдийг server (graph.ts) татаж initial-аар өгнө; "Цааш үзэх" товч
     /api/fbfeed?after=<cursor>-оос дараагийн хуудсыг авна.
   - Нээлттэй хуудас REFRESH_MS тутам (мөн таб руу буцаж ирэхэд) /api/fbfeed-ээс эхний
     хуудсыг дахин татаж шинэ нийтлэл, реакц/сэтгэгдлийн тоог шинэчилнэ.
   - Реакц / Сэтгэгдэл / Хуваалцах — аль нь ч эхлээд Facebook нэвтрэлт шаардана
     (fb-sdk.ts: диалог нээгдэхэд prepareFacebook, товч дээр loginFromClick → FB.login, зөвхөн https).
     · Хуваалцах → FB.ui share dialog (зочны профайл руу).
     · Реакц, Сэтгэгдэл → Graph API-аар хэрэглэгчийн өмнөөс реакц/сэтгэгдэл бичих
       боломжгүй (publish_actions 2018-д хаагдсан; Like/Comment plugin 2026-02-10-нд
       зогссон) тул диалогт Facebook-ийн Embedded Post дэлгэнэ — Facebook өөрийн
       реакц/сэтгэгдлийн товчуудыг нэвтэрсэн зочинд үзүүлнэ.
   - App ID: NEXT_PUBLIC_FB_APP_ID; байхгүй бол backend-ийн
     /api/social/facebook/status/-оос (VisitorProvider-тай ижил эх).
   ===================================================================== */

import { useEffect, useRef, useState } from "react";
import { formatDate, formatDateTime } from "@/components/news/format";
import type { FeedPage, FeedPost, FeedResult } from "./graph";
import { FbLoginCancelled, loginFromClick, openShareDialog, prepareFacebook, type FbSdk } from "./fb-sdk";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const ENV_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID;
/** graph.ts-ийн FEED_REVALIDATE_SECONDS-тэй ижил: server cache-ээс олон удаа асуух нь утгагүй. */
const REFRESH_MS = 60_000;

let appIdPromise: Promise<string | undefined> | null = null;
function resolveAppId(): Promise<string | undefined> {
  if (ENV_APP_ID) return Promise.resolve(ENV_APP_ID);
  if (!appIdPromise) {
    appIdPromise = fetch(`${API_URL}/api/social/facebook/status/`)
      .then((r) => (r.ok ? (r.json() as Promise<{ enabled: boolean; app_id: string }>) : null))
      .then((s) => (s?.enabled && s.app_id ? s.app_id : undefined))
      .catch(() => undefined);
  }
  return appIdPromise;
}

/* Шинэ эхний хуудсыг одоогийн жагсаалттай нэгтгэнэ: эхний хуудасны нийтлэлүүд (шинэ тоотой) эхэнд,
   "Цааш"-аар ачаалсан хуучин нийтлэлүүд араас нь. Эхний хуудасны хугацаанд багтах боловч
   шинэ хариунд байхгүй нийтлэл Facebook дээр устгагдсан гэж үзээд хасна. */
function mergeLatest(current: FeedPost[], latest: FeedPost[]): FeedPost[] {
  if (latest.length === 0) return [];
  const oldest = latest[latest.length - 1].created_time;
  const ids = new Set(latest.map((p) => p.id));
  return [...latest, ...current.filter((p) => !ids.has(p.id) && p.created_time < oldest)];
}

function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

/** Эхний мөр → гарчиг, үлдсэн → тайлбар. Текстгүй (зөвхөн зураг) нийтлэлд ерөнхий гарчиг. */
function splitMessage(message: string): { title: string; body: string } {
  const text = message.trim();
  if (!text) return { title: "Facebook дээрх нийтлэл", body: "" };
  const nl = text.indexOf("\n");
  return nl === -1 ? { title: text, body: "" } : { title: text.slice(0, nl).trim(), body: text.slice(nl + 1).trim() };
}

/* ---------- Дүрс тэмдэг (LikeCount-ийн 24px, 2px зураасны хэв маяг) ---------- */

const ICONS = {
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  comment: "M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.6A7.5 7.5 0 1 1 20 11.5z",
  share: "M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6M12 3v12M7.5 7.5 12 3l4.5 4.5",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  close: "M6 6l12 12M18 6 6 18",
  down: "M6 9l6 6 6-6",
} as const;

function Icon({ name, size = 16 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- Картын хэсгүүд ---------- */

/* Зураггүй нийтлэл: /news-ийн NewsImage орлуулагчтай адил bg-paper-3 хавтан (grid-ийн мөр тэгшхэн үлдэнэ),
   дотор нь тайлбарын эхлэл; тайлбаргүй бол зөвхөн ишлэлийн тэмдэг. */
function TextCover({ post, className, size }: { post: FeedPost; className: string; size: "lg" | "md" | "sm" }) {
  const { body } = splitMessage(post.message);
  const text = { lg: "text-[20px] lg:text-[24px] line-clamp-6", md: "text-[15px] lg:text-[17px] line-clamp-3 lg:line-clamp-4", sm: "text-[12px] lg:text-[14px] line-clamp-3" }[size];
  return (
    <span aria-hidden="true" className={`relative flex flex-col justify-between gap-2 overflow-hidden bg-paper-3 p-4 text-navy lg:p-5 ${className}`}>
      <span className={`font-display font-extrabold leading-none text-gold ${size === "sm" ? "text-[28px]" : "text-[44px]"}`}>“</span>
      {body && <span className={`font-display font-bold leading-snug ${text}`}>{body}</span>}
    </span>
  );
}

function Cover({ post, className, size }: { post: FeedPost; className: string; size: "lg" | "md" | "sm" }) {
  const [src, ...more] = post.images;
  if (!src) return <TextCover post={post} className={className} size={size} />;
  return (
    <span className={`relative block overflow-hidden bg-paper-3 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Facebook CDN; next.config-д remotePatterns нэмэхгүй (бусад файлд хүрэхгүй) */}
      <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
      {more.length > 0 && (
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-navy-deep/80 px-2.5 py-1 text-xs font-semibold text-white tabular-nums">+{more.length}</span>
      )}
    </span>
  );
}

function Meta({ post }: { post: FeedPost }) {
  return (
    <span className="flex items-center gap-3 text-[13px] text-muted lg:text-sm">
      <time dateTime={post.created_time} className="tabular-nums">
        {formatDate(post.created_time)}
      </time>
      <span>Facebook</span>
    </span>
  );
}

function Stats({ post }: { post: FeedPost }) {
  const items = [
    { key: "heart", n: post.reactions, label: "Реакц" },
    { key: "comment", n: post.comments, label: "Сэтгэгдэл" },
    { key: "share", n: post.shares ? post.shares : null, label: "Хуваалцсан" },
  ] as const;
  const shown = items.filter((i) => i.n !== null);
  if (shown.length === 0) return null;
  return (
    <span className="flex items-center gap-4 text-[13px] text-muted tabular-nums lg:text-sm">
      {shown.map((i) => (
        <span key={i.key} className="inline-flex items-center gap-1.5">
          <span className="text-navy">
            <Icon name={i.key} />
          </span>
          <span className="sr-only">{i.label}: </span>
          {formatCount(i.n ?? 0)}
        </span>
      ))}
    </span>
  );
}

const cardBase =
  "group flex w-full cursor-pointer rounded-xl text-left text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy";
const titleHover = "group-hover:text-navy group-hover:underline group-hover:underline-offset-[5px]";

type CardProps = { post: FeedPost; onOpen: () => void };

function LeadCard({ post, onOpen }: CardProps) {
  const { title, body } = splitMessage(post.message);
  return (
    <button type="button" onClick={onOpen} className={`${cardBase} col-span-12 flex-col gap-3 lg:col-span-7 lg:gap-4`}>
      <Cover post={post} size="lg" className="h-[220px] w-full rounded-xl lg:h-[400px]" />
      <Meta post={post} />
      <span className={`line-clamp-3 font-display text-[26px] font-extrabold leading-tight lg:text-[34px] ${titleHover}`}>{title}</span>
      {body && <span className="line-clamp-3 max-w-[38em] text-[17px] leading-relaxed text-muted">{body}</span>}
      <Stats post={post} />
    </button>
  );
}

function SideCard({ post, onOpen }: CardProps) {
  const { title } = splitMessage(post.message);
  return (
    <button type="button" onClick={onOpen} className={`${cardBase} gap-3.5 lg:gap-4`}>
      <Cover post={post} size="sm" className="h-[100px] w-[130px] shrink-0 rounded-lg lg:h-[150px] lg:w-[200px] lg:rounded-[10px]" />
      <span className="flex min-w-0 flex-col gap-1.5 lg:gap-2">
        <Meta post={post} />
        <span className={`line-clamp-3 font-display text-[19px] font-extrabold leading-tight lg:text-[23px] ${titleHover}`}>{title}</span>
        <Stats post={post} />
      </span>
    </button>
  );
}

function SmallCard({ post, onOpen }: CardProps) {
  const { title } = splitMessage(post.message);
  return (
    <button type="button" onClick={onOpen} className={`${cardBase} flex-col gap-2 lg:gap-2.5`}>
      <Cover post={post} size="md" className="h-[120px] w-full rounded-lg lg:h-[190px] lg:rounded-[10px]" />
      <Meta post={post} />
      <span className={`line-clamp-3 font-display text-[17px] font-extrabold leading-tight lg:text-[21px] ${titleHover}`}>{title}</span>
      <Stats post={post} />
    </button>
  );
}

/* ---------- Нийтлэлийн диалог ---------- */

type Action = "react" | "comment" | "share";

const actionBtn =
  "inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-navy hover:text-navy disabled:opacity-50";

/* Embedded Post-ыг DOM-д нэмсний дараа FB.XFBML.parse(container) дуудна (SDK аль хэдийн бэлэн: нэвтрэлт өмнө нь хийгдсэн). */
function EmbeddedPost({ href }: { href: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const FB = (window as unknown as { FB?: FbSdk }).FB;
    if (el && FB) FB.XFBML.parse(el);
  }, [href]);
  return (
    <div ref={ref} className="flex flex-col gap-2 border-t border-line pt-5">
      <p className="text-sm text-muted">Реакц, сэтгэгдлээ доорх Facebook нийтлэл дээр үлдээнэ үү.</p>
      <div className="overflow-hidden rounded-lg">
        <div className="fb-post" data-href={href} data-width="500" data-show-text="false" data-lazy="false" />
      </div>
    </div>
  );
}

/* Эцэг `key={post?.id}` өгнө: өөр нийтлэл нээхэд state шинээр эхэлнэ. post-ийг эцгийн жагсаалтаас авдаг тул
   минут тутмын шинэчлэлтээр тоо нь диалог нээлттэй байхад ч шинэчлэгдэнэ. */
function PostDialog({ post, onClose }: { post: FeedPost | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(0);
  const [embedded, setEmbedded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  /* Facebook SDK + нэвтрэлтийн төлөв: бэлэн болтол товчнууд "ачаалж байна" төлөвтэй (fb-sdk.ts-ийн тайлбар). */
  const [fb, setFb] = useState<"loading" | "ready" | { error: string }>("loading");
  const postId = post?.id;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (post && !d.open) d.showModal();
    if (!post && d.open) d.close();
  }, [post]);

  useEffect(() => {
    if (!postId) return;
    let alive = true;
    resolveAppId()
      .then(prepareFacebook)
      .then(
        () => alive && setFb("ready"),
        (e: unknown) => alive && setFb({ error: e instanceof Error ? e.message : "Facebook-т холбогдож чадсангүй." }),
      );
    return () => {
      alive = false;
    };
  }, [postId]);

  /* await-гүй эхэлнэ: loginFromClick нь click-ийн дотор FB.login-ийг шууд дуудах ёстой. */
  const act = (a: Action) => {
    if (!post || busy) return;
    if (fb !== "ready") {
      if (fb !== "loading") setNotice({ kind: "error", text: fb.error });
      return;
    }
    setBusy(true);
    setNotice(null);
    loginFromClick()
      .then(async (FB) => {
        if (a !== "share") return setEmbedded(true);
        if (await openShareDialog(FB, post.permalink_url)) setNotice({ kind: "ok", text: "Хуваалцлаа. Баярлалаа!" });
      })
      .catch((e: unknown) =>
        setNotice({
          kind: "error",
          text: e instanceof FbLoginCancelled ? "Реакц, сэтгэгдэл, хуваалцахын тулд Facebook-ээр нэвтэрнэ үү." : e instanceof Error ? e.message : "Алдаа гарлаа.",
        }),
      )
      .finally(() => setBusy(false));
  };
  const actionsDisabled = busy || fb === "loading";

  const image = post?.images[Math.min(active, (post?.images.length ?? 1) - 1)];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label="Мэдээ"
      className="m-auto max-h-[92vh] w-[min(96vw,640px)] overflow-y-auto overscroll-contain rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/60"
    >
      {post && (
        <article className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-3 text-sm text-muted">
              <time dateTime={post.created_time} className="tabular-nums">
                {formatDateTime(post.created_time)}
              </time>
              <span className="rounded-full bg-paper-3 px-3 py-1 font-medium text-navy">Facebook</span>
            </span>
            <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-paper-2 hover:text-ink" aria-label="Хаах">
              <Icon name="close" size={20} />
            </button>
          </div>

          {image && !embedded && (
            <div className="flex flex-col gap-2">
              <span className="relative block overflow-hidden rounded-xl bg-paper-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- Facebook CDN */}
                <img src={image} alt="" className="max-h-[60vh] w-full object-contain" />
              </span>
              {post.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {post.images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setActive(i)}
                      aria-label={`${i + 1}-р зураг`}
                      aria-pressed={i === active}
                      className={`relative h-16 overflow-hidden rounded-lg border-2 transition sm:h-20 ${i === active ? "border-navy" : "border-transparent opacity-70 hover:opacity-100"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- Facebook CDN */}
                      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {post.message && !embedded && <p className="whitespace-pre-wrap text-[17px] leading-relaxed text-ink">{post.message}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Stats post={post} />
            <a href={post.permalink_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:underline hover:underline-offset-4">
              Facebook дээр нээх
              <Icon name="external" size={15} />
            </a>
          </div>

          {notice && (
            <p role="status" className={`rounded-lg px-3 py-2 text-sm ${notice.kind === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-900"}`}>
              {notice.text}
            </p>
          )}

          {!embedded && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-5">
              <button type="button" disabled={actionsDisabled} aria-busy={fb === "loading"} onClick={() => act("react")} className={actionBtn}>
                <Icon name="heart" size={18} />
                Реакц
              </button>
              <button type="button" disabled={actionsDisabled} aria-busy={fb === "loading"} onClick={() => act("comment")} className={actionBtn}>
                <Icon name="comment" size={18} />
                Сэтгэгдэл
              </button>
              <button type="button" disabled={actionsDisabled} aria-busy={fb === "loading"} onClick={() => act("share")} className={actionBtn}>
                <Icon name="share" size={18} />
                Хуваалцах
              </button>
            </div>
          )}

          {embedded && <EmbeddedPost href={post.permalink_url} />}
        </article>
      )}
    </dialog>
  );
}

/* ---------- Feed ---------- */

export function FacebookFeed({ initial }: { initial: FeedPage }) {
  const [posts, setPosts] = useState<FeedPost[]>(initial.posts);
  const [next, setNext] = useState<string | null>(initial.next);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  /* "Цааш" дарсан бол next cursor нь ачаалсан сүүлийн хуудсынх — шинэчлэлт түүнийг дарж бичихгүй. */
  const loadedMore = useRef(false);

  useEffect(() => {
    let stopped = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = (await fetch("/api/fbfeed").then((x) => x.json())) as FeedResult;
        if (stopped || !r.ok) return;
        setPosts((p) => mergeLatest(p, r.page.posts));
        if (!loadedMore.current) setNext(r.page.next);
      } catch {
        // Сүлжээний түр алдаа — дараагийн удаа дахин оролдоно.
      }
    };
    const id = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const loadMore = async () => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const r = (await fetch(`/api/fbfeed?after=${encodeURIComponent(next)}`).then((x) => x.json())) as FeedResult;
      if (!r.ok) throw new Error(r.message);
      loadedMore.current = true;
      setPosts((p) => {
        const seen = new Set(p.map((x) => x.id));
        return [...p, ...r.page.posts.filter((x) => !seen.has(x.id))];
      });
      setNext(r.page.next);
    } catch {
      setMoreError("Дараагийн мэдээг ачаалж чадсангүй. Дахин оролдоно уу.");
    } finally {
      setLoadingMore(false);
    }
  };

  if (posts.length === 0) return <p className="text-muted">Мэдээ удахгүй.</p>;

  const [lead, second, third, ...rest] = posts;
  const open = (p: FeedPost) => () => setOpenId(p.id);
  const openPost = posts.find((p) => p.id === openId) ?? null;

  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        <LeadCard post={lead} onOpen={open(lead)} />
        {second && (
          <div className="col-span-12 flex flex-col gap-6 lg:col-span-5">
            <SideCard post={second} onOpen={open(second)} />
            {third && <SideCard post={third} onOpen={open(third)} />}
          </div>
        )}
      </div>

      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-line pt-5 lg:grid-cols-4 lg:gap-x-6 lg:pt-8">
          {rest.map((p) => (
            <SmallCard key={p.id} post={p} onOpen={open(p)} />
          ))}
        </div>
      )}

      {(next || moreError) && (
        <div className="flex flex-col items-center gap-2">
          {moreError && (
            <p role="status" className="text-sm text-red-700">
              {moreError}
            </p>
          )}
          {next && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-base font-semibold text-navy hover:underline hover:underline-offset-4 disabled:opacity-50"
            >
              {loadingMore ? "Ачаалж байна…" : "Цааш үзэх"}
              {!loadingMore && <Icon name="down" size={18} />}
            </button>
          )}
        </div>
      )}

      <PostDialog key={openPost?.id ?? "closed"} post={openPost} onClose={() => setOpenId(null)} />
    </>
  );
}
