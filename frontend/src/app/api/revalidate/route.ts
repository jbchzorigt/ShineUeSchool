/* POST /api/revalidate — админ хадгалсны дараа нүүр зэрэг хуудасны cache-ийг шууд цэвэрлэнэ (on-demand revalidation).
   Эрх: Authorization header-ийн JWT-г backend /api/auth/me/-ээр шалгана (нэвтэрсэн ажилтан л). Body: { tags?: string[], paths?: string[] }.
   Tag-ууд зөвшөөрөгдсөн жагсаалтаас (fetch-ийн next.tags-тай ижил); path нь "/"-ээр эхэлсэн байх ёстой. */

import { revalidatePath, revalidateTag } from "next/cache";

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const TAGS = new Set(["graduates", "programs", "about", "news"]);

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return Response.json({ detail: "Нэвтрээгүй." }, { status: 401 });
  try {
    const me = await fetch(`${API}/api/auth/me/`, { headers: { authorization: auth }, cache: "no-store" });
    if (!me.ok) return Response.json({ detail: "Нэвтрээгүй." }, { status: 401 });
  } catch {
    return Response.json({ detail: "Backend-тэй холбогдож чадсангүй." }, { status: 502 });
  }
  const body = (await req.json().catch(() => ({}))) as { tags?: unknown; paths?: unknown };
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string" && TAGS.has(t)) : [];
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string" && p.startsWith("/") && !p.includes("..")) : ["/"];
  for (const t of tags) revalidateTag(t, "max");
  for (const p of paths) revalidatePath(p);
  return Response.json({ tags, paths });
}
