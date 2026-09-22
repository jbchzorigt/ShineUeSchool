"use client";

/* Сэтгэгдлийн хяналт: жагсаалт, шүүлт (бүгд/нуугдсан), нуух/харуулах, устгах, зочин блоклох. */

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { CommentAdmin, VisitorAdmin } from "@/lib/types";
import { Badge, Button, Empty, Select, Spinner, Table, Td, Th } from "@/components/ui";

const fmt = (iso: string) => new Date(iso).toLocaleString("mn-MN", { dateStyle: "short", timeStyle: "short" });
const truncate = (s: string, n = 80) => (s.length > n ? `${s.slice(0, n)}…` : s);

export default function NewsCommentsPage() {
  const [filter, setFilter] = useState<"all" | "hidden">("all");
  const [page, setPage] = useState(1);
  const q = useFetch(() => api.news.comments.list({ hidden: filter === "hidden" ? true : undefined, page }), [filter, page]);

  const [visitorPage, setVisitorPage] = useState(1);
  const visitorsQ = useFetch(() => api.news.visitors.list(visitorPage), [visitorPage]);

  async function toggleHide(c: CommentAdmin) {
    try {
      await api.news.comments.hide(c.id, !c.is_hidden);
      q.reload();
    } catch {
      alert("Хадгалж чадсангүй.");
    }
  }

  async function remove(c: CommentAdmin) {
    if (!confirm("Сэтгэгдлийг устгах уу?")) return;
    try {
      await api.news.comments.remove(c.id);
      q.reload();
    } catch {
      alert("Устгаж чадсангүй.");
    }
  }

  async function blockVisitor(c: CommentAdmin) {
    if (!confirm(`"${c.visitor.name}" зочныг блоклох уу? Цаашид сэтгэгдэл бичих боломжгүй болно.`)) return;
    try {
      await api.news.visitors.block(c.visitor.id, true);
      alert("Зочныг блоклолоо.");
    } catch (err) {
      alert(err instanceof ApiError ? Object.values(err.fieldErrors).join(" ") : "Блоклож чадсангүй.");
    }
  }

  async function toggleBlockVisitor(v: VisitorAdmin) {
    const verb = v.is_blocked ? "сэргээх" : "блоклох";
    if (!confirm(`"${v.name}" зочныг ${verb} уу?`)) return;
    try {
      await api.news.visitors.block(v.id, !v.is_blocked);
      visitorsQ.reload();
    } catch (err) {
      alert(err instanceof ApiError ? Object.values(err.fieldErrors).join(" ") : "Хадгалж чадсангүй.");
    }
  }

  const pages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.page_size)) : 1;
  const visitorPages = visitorsQ.data ? Math.max(1, Math.ceil(visitorsQ.data.total / visitorsQ.data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Сэтгэгдлийн хяналт</h1>
        <p className="text-sm text-slate-600">Мэдээн дэх сэтгэгдлүүдийг нуух, устгах, зочныг блоклох.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filter} onChange={(e) => { setFilter(e.target.value as typeof filter); setPage(1); }} className="w-44">
          <option value="all">Бүгд</option>
          <option value="hidden">Нуугдсан</option>
        </Select>
      </div>

      {q.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>}
      {q.loading ? <Spinner /> : !q.data?.items.length ? <Empty>Сэтгэгдэл байхгүй.</Empty> : (
        <Table head={<><Th>Огноо</Th><Th>Мэдээ</Th><Th>Зочин</Th><Th>Сэтгэгдэл</Th><Th>Төлөв</Th><Th className="text-right">Үйлдэл</Th></>}>
          {q.data.items.map((c) => (
            <tr key={c.id} className="border-t border-slate-100">
              <Td className="whitespace-nowrap text-slate-600">{fmt(c.created_at)}</Td>
              <Td><Link href={`/news/${c.post.slug}`} target="_blank" className="font-semibold text-navy hover:underline">{c.post.title}</Link></Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
                    {c.visitor.avatar_url && <Image src={c.visitor.avatar_url} alt="" fill unoptimized className="object-cover" />}
                  </div>
                  <span>{c.visitor.name}</span>
                </div>
              </Td>
              <Td className="max-w-sm text-slate-700">{truncate(c.body)}</Td>
              <Td>{c.is_hidden ? <Badge tone="slate">Нуугдсан</Badge> : <Badge tone="green">Харагдана</Badge>}</Td>
              <Td className="space-x-2 text-right whitespace-nowrap">
                <Button variant="ghost" onClick={() => toggleHide(c)}>{c.is_hidden ? "Харуулах" : "Нуух"}</Button>
                <Button variant="ghost" onClick={() => blockVisitor(c)}>Зочныг блоклох</Button>
                <Button variant="danger" onClick={() => remove(c)}>Устгах</Button>
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

      <div className="space-y-3 pt-4">
        <div>
          <h2 className="text-xl font-black text-navy">Зочид</h2>
          <p className="text-sm text-slate-600">Facebook-ээр нэвтэрсэн зочид, тэдний сэтгэгдлийн тоо, төлөв.</p>
        </div>

        {visitorsQ.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{visitorsQ.error}</p>}
        {visitorsQ.loading ? <Spinner /> : !visitorsQ.data?.items.length ? <Empty>Зочин байхгүй.</Empty> : (
          <Table head={<><Th>Нэр</Th><Th>Facebook ID</Th><Th>Огноо</Th><Th>Сэтгэгдэл</Th><Th>Төлөв</Th><Th className="text-right">Үйлдэл</Th></>}>
            {visitorsQ.data.items.map((v) => (
              <tr key={v.id} className="border-t border-slate-100">
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
                      {v.avatar_url && <Image src={v.avatar_url} alt="" fill unoptimized className="object-cover" />}
                    </div>
                    <span>{v.name}</span>
                  </div>
                </Td>
                <Td className="text-slate-600">{v.fb_id}</Td>
                <Td className="whitespace-nowrap text-slate-600">{fmt(v.created_at)}</Td>
                <Td>{v.comments_count}</Td>
                <Td>{v.is_blocked ? <Badge tone="slate">Блоклогдсон</Badge> : <Badge tone="green">Идэвхтэй</Badge>}</Td>
                <Td className="text-right whitespace-nowrap">
                  <Button variant="ghost" onClick={() => toggleBlockVisitor(v)}>{v.is_blocked ? "Сэргээх" : "Блоклох"}</Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {visitorPages > 1 && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <Button variant="ghost" disabled={visitorPage <= 1} onClick={() => setVisitorPage(visitorPage - 1)}>Өмнөх</Button>
            <span>{visitorPage} / {visitorPages}</span>
            <Button variant="ghost" disabled={visitorPage >= visitorPages} onClick={() => setVisitorPage(visitorPage + 1)}>Дараах</Button>
          </div>
        )}
      </div>
    </div>
  );
}
