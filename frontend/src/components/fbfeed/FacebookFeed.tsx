"use client";

/* =====================================================================
   Facebook Page-ийн feed — сайтын мэдээний хэсэг (app/(site)/feed/page.tsx).

   - Нийтлэлүүдийг server (graph.ts) татаж initial-аар өгнө; "Цааш" товч
     /api/fbfeed?after=<cursor>-оос дараагийн хуудсыг авна.
   - Реакц / Сэтгэгдэл / Хуваалцах — аль нь ч эхлээд Facebook нэвтрэлт шаардана
     (fb-sdk.ts: ensureFacebookLogin → FB.login).
     · Хуваалцах → FB.ui share dialog (зочны профайл руу).
     · Реакц, Сэтгэгдэл → Graph API-аар хэрэглэгчийн өмнөөс реакц/сэтгэгдэл бичих
       боломжгүй (publish_actions 2018-д хаагдсан; Like/Comment plugin 2026-02-10-нд
       зогссон) тул картыг Facebook-ийн Embedded Post болгон дэлгэнэ — Facebook өөрийн
       реакц/сэтгэгдлийн товчуудыг нэвтэрсэн зочинд үзүүлнэ.
   - App ID: NEXT_PUBLIC_FB_APP_ID; байхгүй бол backend-ийн
     /api/social/facebook/status/-оос (VisitorProvider-тай ижил эх).
   ===================================================================== */

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedPage, FeedPost, FeedResult } from "./graph";
import { ensureFacebookLogin, FbLoginCancelled, openShareDialog, type FbSdk } from "./fb-sdk";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const ENV_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID;

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

/* Огноо: Улаанбаатарын цагаар YYYY.MM.DD — server/client хоёр дээр ижил гарна (hydration). */
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit" });
function formatDate(iso: string): string {
  const parts = dateFmt.formatToParts(new Date(iso));
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")}`;
}

function formatCount(n: number | null): string {
  if (n === null) return "";
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

type Action = "react" | "comment" | "share";

const btn = "inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-navy hover:text-navy disabled:opacity-50";

function PostCard({ post, onAction, busy }: { post: FeedPost; onAction: (a: Action, post: FeedPost) => Promise<boolean>; busy: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);
  const long = post.message.length > 420;

  const act = async (a: Action) => {
    const ok = await onAction(a, post);
    if (ok && a !== "share") setEmbedded(true);
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(18,36,92,0.06)]">
      {post.images.length > 0 && !embedded && (
        <div className={`grid gap-0.5 ${post.images.length > 1 ? "grid-cols-2" : ""}`}>
          {post.images.slice(0, 4).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- Facebook CDN; next.config-д remotePatterns нэмэхгүй (бусад файлд хүрэхгүй)
            <img key={src} src={src} alt="" loading={i === 0 ? "eager" : "lazy"} className={`w-full object-cover ${post.images.length > 1 ? "aspect-square" : "max-h-[520px]"}`} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <time dateTime={post.created_time}>{formatDate(post.created_time)}</time>
          <a href={post.permalink_url} target="_blank" rel="noopener noreferrer" className="hover:text-navy">
            Facebook дээр нээх ↗
          </a>
        </div>

        {post.message && !embedded && (
          <p className={`whitespace-pre-wrap text-[15px] leading-relaxed text-ink ${long && !expanded ? "line-clamp-6" : ""}`}>{post.message}</p>
        )}
        {long && !embedded && (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="self-start text-sm font-semibold text-navy hover:underline">
            {expanded ? "Хураах" : "Цааш унших"}
          </button>
        )}

        {embedded && (
          <div ref={embedRef} className="fbfeed-embed">
            <p className="mb-2 text-xs text-muted">Реакц, сэтгэгдлээ доорх Facebook нийтлэл дээр үлдээнэ үү.</p>
            <div className="fb-post" data-href={post.permalink_url} data-show-text="true" data-lazy="false" />
          </div>
        )}
        {embedded && <EmbedParser containerRef={embedRef} />}

        <div className="flex items-center gap-3 text-xs text-muted">
          {post.reactions !== null && <span>{formatCount(post.reactions)} реакц</span>}
          {post.comments !== null && <span>{formatCount(post.comments)} сэтгэгдэл</span>}
          {post.shares !== null && <span>{formatCount(post.shares)} хуваалцсан</span>}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <button type="button" disabled={busy} onClick={() => act("react")} className={btn} aria-label="Реакц үлдээх">
            👍 Реакц
          </button>
          <button type="button" disabled={busy} onClick={() => act("comment")} className={btn} aria-label="Сэтгэгдэл бичих">
            💬 Сэтгэгдэл
          </button>
          <button type="button" disabled={busy} onClick={() => act("share")} className={btn} aria-label="Facebook дээр хуваалцах">
            ↗ Хуваалцах
          </button>
        </div>
      </div>
    </article>
  );
}

/* Embedded Post-ыг DOM-д нэмсний дараа FB.XFBML.parse(container) дуудна (SDK аль хэдийн бэлэн: нэвтрэлт өмнө нь хийгдсэн). */
function EmbedParser({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  useEffect(() => {
    const el = containerRef.current;
    const FB = (window as unknown as { FB?: FbSdk }).FB;
    if (el && FB) FB.XFBML.parse(el);
  }, [containerRef]);
  return null;
}

export function FacebookFeed({ initial }: { initial: FeedPage }) {
  const [posts, setPosts] = useState<FeedPost[]>(initial.posts);
  const [next, setNext] = useState<string | null>(initial.next);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const onAction = useCallback(async (a: Action, post: FeedPost): Promise<boolean> => {
    setBusy(true);
    setNotice(null);
    try {
      const FB = await ensureFacebookLogin(await resolveAppId());
      if (a === "share") {
        const shared = await openShareDialog(FB, post.permalink_url);
        setNotice(shared ? "Хуваалцлаа. Баярлалаа!" : null);
      }
      return true;
    } catch (e) {
      setNotice(e instanceof FbLoginCancelled ? "Реакц, сэтгэгдэл, хуваалцахын тулд Facebook-ээр нэвтэрнэ үү." : e instanceof Error ? e.message : "Алдаа гарлаа.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const loadMore = async () => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    setNotice(null);
    try {
      const r = (await fetch(`/api/fbfeed?after=${encodeURIComponent(next)}`).then((x) => x.json())) as FeedResult;
      if (!r.ok) throw new Error(r.message);
      setPosts((p) => {
        const seen = new Set(p.map((x) => x.id));
        return [...p, ...r.page.posts.filter((x) => !seen.has(x.id))];
      });
      setNext(r.page.next);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Дараагийн нийтлэлүүдийг ачаалж чадсангүй.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <p role="status" className="rounded-lg border border-gold/60 bg-gold/10 px-4 py-2.5 text-sm text-ink">
          {notice}
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} onAction={onAction} busy={busy} />
        ))}
      </div>
      {next && (
        <button type="button" onClick={loadMore} disabled={loadingMore} className="self-center rounded-full border border-navy px-6 py-2.5 text-sm font-semibold text-navy hover:bg-navy hover:text-white disabled:opacity-50">
          {loadingMore ? "Ачаалж байна…" : "Цааш"}
        </button>
      )}
    </div>
  );
}
