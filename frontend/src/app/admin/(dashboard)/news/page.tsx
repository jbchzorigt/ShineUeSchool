"use client";

/* Мэдээний жагсаалт: төлөв/ангилал шүүлт, хуудаслалт, нийтлэх/буцаах/устгах. */

import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { PostAdmin } from "@/lib/types";
import { Badge, Button, Empty, Select, Spinner, Table, Td, Th } from "@/components/ui";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("mn-MN", { dateStyle: "short", timeStyle: "short" }) : "—");

function statusOf(p: PostAdmin) {
  if (!p.is_published) return <Badge tone="slate">Ноорог</Badge>;
  if (p.published_at && new Date(p.published_at) > new Date()) return <Badge tone="gold">Товлосон</Badge>;
  return <Badge tone="green">Нийтлэгдсэн</Badge>;
}

export default function NewsListPage() {
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const catsQ = useFetch(() => api.news.categories.list(), []);
  const q = useFetch(() => api.news.posts.list({ page, status, category: category || undefined }), [page, status, category]);
  const [fbStatus] = useState(() => api.social.status().catch(() => null));

  async function publish(p: PostAdmin) {
    const fb = (await fbStatus)?.enabled ?? false;
    const toFb = fb && confirm("Facebook Page дээр пост тавих уу?");
    try {
      const r = await api.news.posts.publish(p.id, toFb);
      if (toFb && !r.fb.ok) alert(`Нийтлэгдсэн, гэхдээ Facebook алдаа: ${r.fb.error}`);
      q.reload();
    } catch (err) { alert(err instanceof ApiError ? Object.values(err.fieldErrors).join(" ") : "Нийтэлж чадсангүй."); }
  }
  async function unpublish(p: PostAdmin) { await api.news.posts.unpublish(p.id); q.reload(); }
  async function remove(p: PostAdmin) {
    if (!confirm(`"${p.title}" мэдээг устгах уу? Зургууд хамт устна.`)) return;
    await api.news.posts.remove(p.id); q.reload();
  }

  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.page_size)) : 1;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Мэдээ</h1>
          <p className="text-sm text-slate-600">Сургуулийн мэдээ, ноорог, товлосон нийтлэлүүд.</p>
        </div>
        <Link href="/admin/news/new"><Button>+ Мэдээ бичих</Button></Link>
      </div>
      <div className="flex flex-wrap gap-3">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} className="w-44">
          <option value="all">Бүх төлөв</option><option value="draft">Ноорог</option><option value="published">Нийтлэгдсэн</option>
        </Select>
        <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="w-52">
          <option value="">Бүх ангилал</option>
          {(catsQ.data ?? []).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </Select>
      </div>
      {q.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>}
      {q.loading ? <Spinner /> : !q.data?.items.length ? <Empty>Мэдээ байхгүй.</Empty> : (
        <Table head={<><Th>Огноо</Th><Th>Гарчиг</Th><Th>Ангилал</Th><Th>Төлөв</Th><Th>Facebook</Th><Th className="text-right">Үйлдэл</Th></>}>
          {q.data.items.map((p) => (
            <tr key={p.id} className="border-t border-slate-100">
              <Td className="whitespace-nowrap text-slate-600">{fmt(p.published_at)}</Td>
              <Td><Link href={`/admin/news/${p.id}`} className="font-semibold text-navy hover:underline">{p.title}</Link></Td>
              <Td>{p.category?.name ?? "—"}</Td>
              <Td>{statusOf(p)}</Td>
              <Td>{p.fb_post_id ? <Badge tone="green">✓</Badge> : p.fb_error ? <span title={p.fb_error}><Badge tone="gold">⚠ алдаа</Badge></span> : "—"}</Td>
              <Td className="space-x-2 text-right">
                {p.is_published ? <Button variant="ghost" onClick={() => unpublish(p)}>Буцаах</Button> : <Button variant="secondary" onClick={() => publish(p)}>Нийтлэх</Button>}
                <Button variant="danger" onClick={() => remove(p)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Өмнөх</Button>
          <span>{page} / {pages}</span>
          <Button variant="ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Дараах</Button>
        </div>
      )}
    </div>
  );
}
