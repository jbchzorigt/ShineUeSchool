/* Server-side fetch (/about хуудас). Алдаанд null; 60 сек revalidate, админ хадгалахад "about" tag-аар шууд. news-api.ts-тэй ижил загвар. */

import type { Lang } from "./i18n/paths";
import type { AboutData } from "./types";

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function fetchAbout(lang: Lang = "mn"): Promise<AboutData | null> {
  try {
    const res = await fetch(`${API}/api/about/?lang=${lang}`, { next: { revalidate: 60, tags: ["about"] } });
    if (!res.ok) return null;
    return (await res.json()) as AboutData;
  } catch {
    return null;
  }
}
