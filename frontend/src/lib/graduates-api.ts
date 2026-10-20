/* Server-side fetch: нүүрний «Төгсөлт» — улс + сургуулиуд (газрын зураг) ба тоонууд. Алдаанд null; 60 сек revalidate + "graduates" tag (админ хадгалмагц /api/revalidate цэвэрлэнэ). */

import type { Lang } from "./i18n/paths";
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

/** Улсын нэр `lang`-аар (backend каталог). */
export const fetchGraduates = (lang: Lang = "mn") => getJson<GraduateDestination[]>(`/api/graduates/?lang=${lang}`);
export const fetchGraduateStats = () => getJson<GraduateStats>("/api/graduates/stats/");
