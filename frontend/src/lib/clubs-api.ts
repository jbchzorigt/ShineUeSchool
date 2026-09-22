/* Server-side fetch (дугуйлангийн хуудас). Алдаанд null; сул орон тоо байнга өөрчлөгддөг тул кэшлэхгүй, хүсэлт бүрт шинээр татна
   (хуудас `searchParams`-аар аль хэдийн dynamic). olympiad-api.ts-тэй ижил загвар. */

import type { ClubsResponse } from "./types";

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function fetchClubs(): Promise<ClubsResponse | null> {
  try {
    const res = await fetch(`${API}/api/clubs/`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ClubsResponse;
  } catch {
    return null;
  }
}
