"use client";

/* Сэтгэгдэл: жагсаалт (шинэ нь дээр), бичих форм (2000 тэмдэгт, тоолуур), өөрийн
   сэтгэгдлээ устгах. Жагсаалтыг client талд визитор токентой (байвал) татна,
   ингэснээр is_mine зөв тооцогдоно. Блоклогдсон зочны токенээр татахад GET
   /comments/ 403 өгдөг (optional_visitor нь is_blocked-ийг үргэлж шалгадаг) —
   энэ тохиолдолд хоосон жагсаалтын оронд тодорхой мессеж харуулна. */

import Image from "next/image";
import { useEffect, useState } from "react";
import type { CommentItem } from "@/lib/types";
import { useVisitor, visitorFetch } from "@/lib/visitor";
import { formatDateTime } from "./format";

const MAX_LEN = 2000;

/* 400 → {"талбар": ["мессеж"]} (`FieldError`/validation), 401/403/503 → {"detail": "мессеж"}
   (backend/app/common/errors.py) — detail нь массив биш ганц мөр текст. */
interface CommentErrorResponse {
  body?: string[];
  detail?: string;
}

export function Comments({ slug, initialCount }: { slug: string; initialCount: number }) {
  const { token, loading, fbEnabled, login } = useVisitor();
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const submit = () => {
    if (loading || !fbEnabled) return;
    if (!token) {
      login();
      return;
    }
    const text = body.trim();
    if (!text) {
      setError("Сэтгэгдэл хоосон байж болохгүй.");
      return;
    }
    setSubmitting(true);
    setError("");
    visitorFetch(`/api/news/posts/${slug}/comments/`, { method: "POST", body: JSON.stringify({ body: text }) })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as CommentErrorResponse | null;
          setError(typeof data?.detail === "string" ? data.detail : (data?.body?.join(" ") ?? "Илгээж чадсангүй."));
          return;
        }
        const comment = (await res.json()) as CommentItem;
        setComments((prev) => [comment, ...(prev ?? [])]);
        setBody("");
      })
      .catch(() => setError("Илгээж чадсангүй."))
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
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-xl font-extrabold text-navy">Сэтгэгдэл ({count})</h2>

      {!loading && fbEnabled && !blocked && (
        <div className="flex flex-col gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
            placeholder="Сэтгэгдэл бичих..."
            rows={3}
            maxLength={MAX_LEN}
            className="w-full rounded-lg border border-line px-3 py-2 text-[15px] text-ink focus:border-navy focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted tabular-nums">
              {body.length} / {MAX_LEN}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50"
            >
              {token ? "Илгээх" : "Facebook-ээр нэвтэрч илгээх"}
            </button>
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
      )}

      {blocked ? (
        <p className="text-sm font-medium text-red-600">Таны хандалт хаагдсан байна.</p>
      ) : comments === null ? (
        <p className="text-sm text-muted">Ачаалж байна…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted">Сэтгэгдэл алга.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              {c.visitor.avatar_url ? (
                <Image src={c.visitor.avatar_url} alt="" width={36} height={36} unoptimized className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper-3 text-sm text-muted">{c.visitor.name.slice(0, 1)}</span>
              )}
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{c.visitor.name}</span>
                  <time dateTime={c.created_at} className="text-xs text-muted tabular-nums">
                    {formatDateTime(c.created_at)}
                  </time>
                </div>
                <p className="whitespace-pre-line text-[15px] text-ink">{c.body}</p>
                {c.is_mine && (
                  <button type="button" onClick={() => remove(c.id)} className="w-fit text-xs font-medium text-red-600 hover:underline">
                    Устгах
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
