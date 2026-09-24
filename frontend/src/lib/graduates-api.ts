/* Server-side fetch: нүүрний «Төгсөлт» — улс + сургуулиуд (газрын зураг) ба тоонууд. Алдаанд null; 60 сек revalidate + "graduates" tag (админ хадгалмагц /api/revalidate цэвэрлэнэ). */

import type { GraduateDestination, GraduateStats } from "./types";

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 60, tags: ["graduates"] } });   // админ хадгалахад revalidateTag("graduates")
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const fetchGraduates = () => getJson<GraduateDestination[]>("/api/graduates/");
export const fetchGraduateStats = () => getJson<GraduateStats>("/api/graduates/stats/");
