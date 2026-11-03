/* Server-side fetch (элсэлтийн хуудсууд). Алдаанд null. Бүртгэлийн төлөв, дүн нийтлэгдэх нь цагтай уялдсан тул
   кэшлэхгүй (clubs-api.ts-тэй ижил загвар). */

import type { AdmissionResults, AdmissionRoundPublic } from "./types";

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchAdmission(): Promise<{ round: AdmissionRoundPublic | null } | null> {
  return get("/api/admissions/");
}

export async function fetchAdmissionResults(): Promise<AdmissionResults | null> {
  return get("/api/admissions/results/");
}
