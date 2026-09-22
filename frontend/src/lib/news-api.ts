/* =====================================================================
   Сервер талын мэдээний API — зөвхөн Server Component / generateMetadata-д
   ашиглана ("use client" биш). Алдаанд шидэхгүй, null буцаана (build/SSR
   тасрахгүй байх зорилготой). 60 секундэд нэг удаа дахин баталгаажина.
   ===================================================================== */

import type { NewsCategory, Paged, PostCard, PostDetail } from "./types";

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

export async function fetchPosts(
  opts: { page?: number; category?: string; pageSize?: number } = {},
): Promise<Paged<PostCard> | null> {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.pageSize) params.set("page_size", String(opts.pageSize));
  if (opts.category) params.set("category", opts.category);
  const qs = params.toString();
  return getJson<Paged<PostCard>>(`/api/news/posts/${qs ? `?${qs}` : ""}`);
}

export async function fetchPost(slug: string): Promise<PostDetail | null> {
  try {
    const res = await fetch(`${API}/api/news/posts/${encodeURIComponent(slug)}/`, { next: { revalidate: 60 } });
    if (!res.ok) return null; // 404 болон бусад алдаа хоёулаа null (олдоогүйтэй адил харагдана)
    return (await res.json()) as PostDetail;
  } catch {
    return null;
  }
}

export async function fetchCategories(): Promise<NewsCategory[]> {
  return (await getJson<NewsCategory[]>("/api/news/categories/")) ?? [];
}
