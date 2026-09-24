/* Server-side fetch (нүүрний хөтөлбөрийн картууд, /programs/[slug]). Алдаанд null; 60 сек revalidate. news-api.ts загвар. */

import type { ProgramCard, ProgramDetail } from "./types";

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const fetchPrograms = () => getJson<ProgramCard[]>("/api/programs/");
export const fetchProgram = (slug: string) => getJson<ProgramDetail>(`/api/programs/${encodeURIComponent(slug)}/`);
