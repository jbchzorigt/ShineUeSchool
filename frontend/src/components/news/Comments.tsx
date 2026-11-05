"use client";

/* Сэтгэгдэл: бичих форм (нэр + 100-аас доошгүй тэмдэгт, нэвтрэлтгүй) ба жагсаалт (шинэ нь дээр).
   Тэмдэгтийг backend-тэй ижилээр (trim хийгээд code point-оор) тоолно. Жагсаалтыг client талд визитор токентой (байвал) татна:
   Facebook-ээр бичсэн хуучин сэтгэгдлээ устгах is_mine зөв тооцогдоно, блоклогдсон зочны токенд GET 403 өгдөг тул мессеж харуулна. */

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { readableOn, TAG_PALETTE } from "@/lib/color";
import type { CommentItem } from "@/lib/types";
import { useVisitor, visitorFetch } from "@/lib/visitor";
import { formatDateTime } from "./format";
import { useDict, useLang } from "@/components/site/LangProvider";

const MIN_LEN = 100;
const MAX_LEN = 2000;
const NAME_MAX = 80;

const charCount = (s: string) => [...s.trim()].length;

/* 400 → {"талбар": ["мессеж"]} (`FieldError`/validation), 403 → {"detail": "мессеж"} (backend/app/common/errors.py). */
interface CommentErrorResponse {
  name?: string[];
  body?: string[];
  website?: string[];
  non_field_errors?: string[];
  detail?: string;
}

/** Нэрийн эхний үсэгтэй дугуй: өнгө нь нэрээс тогтмол (мэдээний ангиллын палитр). */
function InitialAvatar({ name }: { name: string }) {
  const hash = [...name].reduce((sum, ch) => sum + (ch.codePointAt(0) ?? 0), 0);
  const color = TAG_PALETTE[hash % TAG_PALETTE.length].hex;
  return (
    <span aria-hidden="true" style={{ backgroundColor: color, color: readableOn(color) }} className="grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-bold uppercase">
      {[...name.trim()][0] ?? "?"}
    </span>
  );
}

export function Comments({ slug, initialCount }: { slug: string; initialCount: number }) {
  const { token } = useVisitor();
  const lang = useLang();
  const t = useDict().news;
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");   // honeypot: хүн харахгүй, бот бөглөдөг
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [postedId, setPostedId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    visitorFetch(`/api/news/posts/${slug}/comments/`)
      .then(async (res) => {
        if (!alive) return;
        if (res.status === 403) {
          setBlocked(true);
          setComments([]);
          return;
        }
        setBlocked(false);
        setComments(res.ok ? ((await res.json()) as CommentItem[]) : []);
      })
      .catch(() => {
        if (alive) setComments([]);
      });
    return () => {
      alive = false;
    };
  }, [slug, token]);

  const chars = charCount(body);
  const enough = chars >= MIN_LEN;
  const canSubmit = enough && name.trim().length > 0 && !submitting;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    setPostedId(null);
    visitorFetch(`/api/news/posts/${slug}/comments/`, { method: "POST", body: JSON.stringify({ name: name.trim(), body: body.trim(), website }) })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as CommentErrorResponse | null;
          if (res.status === 429) setError(t.commentTooMany);
          else setError(data?.detail || [data?.name, data?.body, data?.website, data?.non_field_errors].flat().filter(Boolean).join(" ") || t.sendFailed);
          return;
        }
        const comment = (await res.json()) as CommentItem;
        setComments((prev) => [comment, ...(prev ?? [])]);
        setPostedId(comment.id);
        setBody("");
      })
      .catch(() => setError(t.sendFailed))
      .finally(() => setSubmitting(false));
  };

  const remove = (id: number) => {
    visitorFetch(`/api/news/comments/${id}/`, { method: "DELETE" })
      .then((res) => {
        if (res.ok || res.status === 204) setComments((prev) => (prev ?? []).filter((c) => c.id !== id));
      })
      .catch(() => {});
  };

  const count = comments?.length ?? initialCount;

  return (
    <div className="flex flex-col gap-8">
      {blocked ? (
        <p className="text-sm font-medium text-red-600">{t.blocked}</p>
      ) : (
        <section aria-labelledby="comment-form-title" className="rounded-2xl bg-paper-2 px-4 py-8 md:px-10 md:py-10">
          <form onSubmit={submit} className="mx-auto flex max-w-[520px] flex-col gap-4">
            <h2 id="comment-form-title" className="flex items-center justify-center gap-3 font-display text-xl font-extrabold text-ink">
              <svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true">
                <path d="M12 8h15a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5v3l-5-3h-10a5 5 0 0 1-5-5v-8a5 5 0 0 1 5-5z" fill="#ffc20e" />
                <path d="M7 1h14a6 6 0 0 1 6 6v7a6 6 0 0 1-6 6H11l-6 4v-4.3A6 6 0 0 1 1 14V7a6 6 0 0 1 6-6z" fill="#1e3a8f" />
                <g fill="#fff"><circle cx="8.5" cy="10.5" r="1.6" /><circle cx="14" cy="10.5" r="1.6" /><circle cx="19.5" cy="10.5" r="1.6" /></g>
              </svg>
              {t.commentFormTitle}
            </h2>

            <div className="overflow-hidden rounded-xl border border-line bg-white transition-colors focus-within:border-navy">
              <label className="sr-only" htmlFor="comment-name">{t.commentName}</label>
              <input
                id="comment-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.commentName}
                maxLength={NAME_MAX}
                autoComplete="name"
                className="w-full border-b border-line bg-transparent px-5 py-3.5 text-[15px] font-medium text-ink placeholder:text-muted focus:outline-none"
              />
              <label className="sr-only" htmlFor="comment-body">{t.commentBody}</label>
              <textarea
                id="comment-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t.commentBody}
                rows={4}
                maxLength={MAX_LEN}
                aria-describedby="comment-guide"
                className="comment-lines block w-full resize-y bg-transparent px-5 text-[15px] text-ink placeholder:text-muted focus:outline-none"
              />
              <div aria-hidden="true" className="h-1 bg-paper-3">
                <div style={{ width: `${Math.min(100, (chars / MIN_LEN) * 100)}%` }} className={`h-full transition-[width,background-color] duration-200 ${enough ? "bg-navy" : "bg-gold"}`} />
              </div>
            </div>

            {/* Honeypot: дэлгэцэд ч, гарын удирдлагад ч харагдахгүй */}
            <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg border border-navy bg-navy px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-navy-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:border-line disabled:bg-white/70 disabled:text-muted"
            >
              {submitting ? t.commentSubmitting : t.commentFormTitle}
            </button>

            {error && <p role="alert" className="text-center text-sm font-medium text-red-600">{error}</p>}
            {postedId !== null && !error && <p role="status" className="text-center text-sm font-semibold text-[#138468]">{t.commentPosted}</p>}

            <p id="comment-guide" className="text-center text-[13px] leading-relaxed text-muted">
              <span className={`font-semibold tabular-nums ${enough ? "text-[#138468]" : "text-navy"}`}>{t.commentChars(chars)}{enough && " ✓"}</span>{" "}
              {t.commentGuide}
            </p>
          </form>
        </section>
      )}

      <section aria-labelledby="comment-list-title" className="flex flex-col gap-2">
        <h2 id="comment-list-title" className="font-display text-xl font-extrabold text-navy">{t.commentsTitle(count)}</h2>
        {comments === null ? (
          <p className="py-3 text-sm text-muted">{t.loading}</p>
        ) : comments.length === 0 ? (
          <p className="py-3 text-sm text-muted">{t.noComments}</p>
        ) : (
          <ul className="flex flex-col">
            {comments.map((c) => (
              <li key={c.id} className={`-mx-3 flex gap-3.5 rounded-lg border-t border-line px-3 py-5 first:border-t-0 ${c.id === postedId ? "comment-new" : ""}`}>
                {c.avatar_url ? (
                  <Image src={c.avatar_url} alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <InitialAvatar name={c.author_name} />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5">
                    <span className="break-words text-[15px] font-bold text-ink">{c.author_name}</span>
                    <time dateTime={c.created_at} className="text-xs text-muted tabular-nums">{formatDateTime(c.created_at, lang)}</time>
                  </div>
                  <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-ink">{c.body}</p>
                  {c.is_mine && (
                    <button type="button" onClick={() => remove(c.id)} className="w-fit text-xs font-medium text-red-600 hover:underline">
                      {t.deleteComment}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
