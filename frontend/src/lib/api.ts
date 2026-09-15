/* =====================================================================
   API клиент — Django backend-тэй харьцана.
   - JWT токенийг localStorage-д хадгална.
   - 401 гарвал refresh токеноор нэг удаа сэргээж, дахин оролдоно.
   - Алдааг ApiError болгон шиднэ (status + backend-ийн JSON).
   ===================================================================== */

import type { Result, ResultInput, Stage, StageInput, Stats, User, Years } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "shineue.tokens";

export interface Tokens { access: string; refresh: string }

export class ApiError extends Error {
  constructor(public status: number, public data: unknown) {
    super(typeof data === "object" && data && "detail" in data ? String((data as { detail: unknown }).detail) : `HTTP ${status}`);
  }
  /** DRF-ийн талбар бүрийн алдааг {талбар: "мессеж"} болгоно */
  get fieldErrors(): Record<string, string> {
    if (!this.data || typeof this.data !== "object") return {};
    return Object.fromEntries(
      Object.entries(this.data as Record<string, unknown>).map(([k, v]) => [k, Array.isArray(v) ? v.join(" ") : String(v)])
    );
  }
}

export const tokens = {
  get(): Tokens | null {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null"); } catch { return null; }
  },
  set(t: Tokens) { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); },
  clear() { localStorage.removeItem(TOKEN_KEY); },
};

interface Options { method?: string; body?: unknown; auth?: boolean; retry?: boolean }

async function request<T>(path: string, { method = "GET", body, auth = true, retry = true }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const t = auth ? tokens.get() : null;
  if (t) headers.Authorization = `Bearer ${t.access}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  // Access токен хугацаа дууссан бол refresh хийгээд дахин оролдоно.
  if (res.status === 401 && auth && retry && t?.refresh) {
    const ok = await refresh(t.refresh);
    if (ok) return request<T>(path, { method, body, auth, retry: false });
    tokens.clear();
  }

  if (res.status === 204) return undefined as T;
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

async function refresh(refreshToken: string): Promise<boolean> {
  try {
    const r = await fetch(`${API_URL}/api/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!r.ok) return false;
    const d = (await r.json()) as Partial<Tokens>;
    tokens.set({ access: d.access!, refresh: d.refresh ?? refreshToken });
    return true;
  } catch {
    return false;
  }
}

const q = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : "";
};

export const api = {
  /* ---- нэвтрэлт ---- */
  async login(username: string, password: string) {
    const t = await request<Tokens>("/api/auth/token/", { method: "POST", body: { username, password }, auth: false });
    tokens.set(t);
    return t;
  },
  logout() { tokens.clear(); },
  me: () => request<User>("/api/auth/me/"),

  /* ---- ерөнхий ---- */
  years: () => request<Years>("/api/olympiad/years/", { auth: false }),
  stats: () => request<Stats>("/api/olympiad/stats/", { auth: false }),

  /* ---- хуваарь ---- */
  stages: {
    list: (year?: number) => request<Stage[]>(`/api/olympiad/schedule/${q({ year })}`, { auth: false }),
    create: (d: StageInput) => request<Stage>("/api/olympiad/schedule/", { method: "POST", body: d }),
    update: (id: number, d: Partial<StageInput>) => request<Stage>(`/api/olympiad/schedule/${id}/`, { method: "PATCH", body: d }),
    remove: (id: number) => request<void>(`/api/olympiad/schedule/${id}/`, { method: "DELETE" }),
  },

  /* ---- үр дүн ---- */
  results: {
    list: (year?: number, grade?: number) => request<Result[]>(`/api/olympiad/results/${q({ year, grade })}`, { auth: false }),
    create: (d: ResultInput) => request<Result>("/api/olympiad/results/", { method: "POST", body: d }),
    update: (id: number, d: Partial<ResultInput>) => request<Result>(`/api/olympiad/results/${id}/`, { method: "PATCH", body: d }),
    remove: (id: number) => request<void>(`/api/olympiad/results/${id}/`, { method: "DELETE" }),
  },
};
