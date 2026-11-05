"use client";

/* Дэлгэрэнгүй хуудасны үзэлт: хуудас cache-тай (60 сек) тул тоог хөтчөөс авна. Нэг хөтчийн session-д мэдээ бүр нэг л удаа
   тоологдоно (POST), дараагийн нээлтэд одоогийн тоог л уншина (GET). Компонент дахин mount хийгдэхэд ижил хүсэлтийг хуваалцана. */

import { useEffect, useState } from "react";
import { ViewCount } from "@/components/home/NewsBits";
import { useLang } from "@/components/site/LangProvider";
import type { Lang } from "@/lib/i18n";
import { visitorFetch } from "@/lib/visitor";

const inFlight = new Map<string, Promise<number | null>>();

function alreadyCounted(slug: string): boolean {
  const key = `shineue.viewed.${slug}`;
  try {
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, "1");
  } catch { /* storage хаалттай: тоолсоор байна */ }
  return false;
}

function freshCount(slug: string, lang: Lang): Promise<number | null> {
  const pending = inFlight.get(slug);
  if (pending) return pending;
  const path = `/api/news/posts/${encodeURIComponent(slug)}/`;
  const request = alreadyCounted(slug) ? visitorFetch(`${path}?lang=${lang}`) : visitorFetch(`${path}view/`, { method: "POST", keepalive: true });
  const result = request
    .then((res) => (res.ok ? (res.json() as Promise<{ views_count: number }>) : null))
    .then((data) => data?.views_count ?? null)
    .catch(() => null)   // үзэлтийн алдаа уншихад саад болохгүй
    .finally(() => inFlight.delete(slug));
  inFlight.set(slug, result);
  return result;
}

export function PostViews({ slug, initial }: { slug: string; initial: number }) {
  const lang = useLang();
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let alive = true;
    freshCount(slug, lang).then((n) => { if (alive && n !== null) setCount(n); });
    return () => { alive = false; };
  }, [slug, lang]);

  return <ViewCount n={count} lang={lang} />;
}
