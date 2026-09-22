"use client";

/* Лайк товч: дарахад нэвтрээгүй бол Facebook нэвтрэлт нээнэ; нэвтэрсэн бол
   POST/DELETE like дуудаж хариу (тоо, liked) ирэх хүртэл хүлээнэ (optimistic биш).
   Серверийн эхний утга (initialCount/initialLiked) зөвхөн нэвтрээгүй зочны
   (эсвэл SSR-ийн үеийн) нийтлэг тоог заана — токентой бол mount дээр биечлэн
   /posts/{slug}/-ээс liked_by_me/likes_count-г шинэчилнэ. */

import { useEffect, useState } from "react";
import { useVisitor, visitorFetch } from "@/lib/visitor";

interface LikeResponse {
  liked: boolean;
  likes_count: number;
}

interface PostLikeState {
  liked_by_me: boolean;
  likes_count: number;
}

export function LikeButton({ slug, initialCount, initialLiked }: { slug: string; initialCount: number; initialLiked: boolean }) {
  const { token, loading, fbEnabled, login } = useVisitor();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  // Токентой бол энэ browser-ийн зочны бодит liked/likes_count-г серверээс
  // шинэчилнэ (SSR-ийн revalidate:60 кэш өөр хэрэглэгчийнх байж болзошгүй).
  useEffect(() => {
    if (!token) return;
    let alive = true;
    visitorFetch(`/api/news/posts/${slug}/`)
      .then((res) => (res.ok ? (res.json() as Promise<PostLikeState>) : null))
      .then((data) => {
        if (!alive || !data) return;
        setLiked(data.liked_by_me);
        setCount(data.likes_count);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug, token]);

  const toggle = () => {
    if (loading || !fbEnabled || busy) return;
    if (!token) {
      login();
      return;
    }
    setBusy(true);
    visitorFetch(`/api/news/posts/${slug}/like/`, { method: liked ? "DELETE" : "POST" })
      .then((res) => (res.ok ? (res.json() as Promise<LikeResponse>) : null))
      .then((data) => {
        if (!data) return;
        setLiked(data.liked);
        setCount(data.likes_count);
      })
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || !fbEnabled || busy}
      aria-pressed={liked}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-base font-semibold transition disabled:opacity-50 ${
        liked ? "border-navy bg-navy text-white" : "border-line text-ink hover:border-navy hover:text-navy"
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <span className="tabular-nums">{count}</span>
      <span className="sr-only">Таалагдсан</span>
    </button>
  );
}
