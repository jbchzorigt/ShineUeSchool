/* Server-side fetch (/about хуудас). Алдаанд null; 60 сек revalidate. news-api.ts-тэй ижил загвар. */

import type { AboutData } from "./types";

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function fetchAbout(): Promise<AboutData | null> {
  try {
    const res = await fetch(`${API}/api/about/`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as AboutData;
  } catch {
    return null;
  }
}
