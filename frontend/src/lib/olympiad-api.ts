/* Server-side fetch (олимпиадын хуудас, header-ийн оны хавтан). Алдаанд null; 60 сек revalidate + "olympiad" tag
   (админ хадгалмагц /api/revalidate шууд цэвэрлэнэ). */

import type { AlbumPhoto, OlympiadPage, Result, Stage, Years } from "./types";

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 60, tags: ["olympiad"] } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const fetchOlympiadPage = () => getJson<OlympiadPage>("/api/olympiad/page/");
export const fetchOlympiadYears = () => getJson<Years>("/api/olympiad/years/");
export const fetchOlympiadStages = () => getJson<Stage[]>("/api/olympiad/schedule/");
export const fetchOlympiadResults = () => getJson<Result[]>("/api/olympiad/results/");
export const fetchOlympiadAlbum = () => getJson<AlbumPhoto[]>("/api/olympiad/album/");

/** Сүүлийн олимпиадын он: хуваарийн онуудын хамгийн их нь; өгөгдөлгүй бол энэ он (олимпиадын хуудас, сайтын header хоёулаа ашиглана). */
export const latestYear = (years: Years | null) =>
  years && years.schedule.length ? Math.max(...years.schedule) : new Date().getFullYear();
