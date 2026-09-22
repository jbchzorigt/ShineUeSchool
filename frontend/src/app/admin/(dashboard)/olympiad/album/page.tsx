"use client";

/* Маам багшийн албумын зураг: оруулах, гарчиг, тайлбар, дараалал, нийтлэх, устгах. */

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AlbumPhoto } from "@/lib/types";
import { Button, Card, Empty, Field, Input, Modal, Spinner, Textarea } from "@/components/ui";

export default function AlbumPage() {
  const q = useFetch(() => api.album.list(), []);
  const [adding, setAdding] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [order, setOrder] = useState(1);
  const [published, setPublished] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!file) { setErrors({ image: "Зураг сонгоно уу." }); return; }
    setBusy(true); setErrors({});
    try {
      await api.album.create(file, title.trim(), caption, order, published);
      setAdding(false); setFile(null); setTitle(""); setCaption(""); setOrder((o) => o + 1);
      q.reload();
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  async function patch(p: AlbumPhoto, d: { title?: string; caption?: string; order?: number; is_published?: boolean }) {
    try { await api.album.update(p.id, d); q.reload(); } catch { alert("Хадгалж чадсангүй."); }
  }

  async function remove(p: AlbumPhoto) {
    if (!confirm("Зургийг устгах уу?")) return;
    try { await api.album.remove(p.id); q.reload(); } catch { alert("Устгаж чадсангүй."); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">Албумын зураг</h1>
          <p className="text-sm text-slate-600">Маам багшийн хуудасны дурсамжийн албум. Дарааллаар харагдана.</p>
        </div>
        <Button onClick={() => { setErrors({}); setAdding(true); }}>+ Зураг оруулах</Button>
      </div>

      {q.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>}
      {q.loading ? <Spinner /> : !q.data?.length ? <Empty>Зураг байхгүй.</Empty> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {q.data.map((p) => (
            <Card key={p.id} className="space-y-3">
              <div className="relative h-48 w-full overflow-hidden rounded-lg bg-slate-100">
                <Image src={p.image} alt="" fill unoptimized className="object-cover" />
              </div>
              <Input defaultValue={p.title} aria-label="Гарчиг" className="font-semibold" onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== p.title) patch(p, { title: v }); else e.target.value = p.title; }} />
              <Textarea defaultValue={p.caption} aria-label="Тайлбар" onBlur={(e) => e.target.value !== p.caption && patch(p, { caption: e.target.value })} />
              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-1">Дараалал <Input type="number" className="w-16" defaultValue={p.order} onBlur={(e) => Number(e.target.value) !== p.order && patch(p, { order: Number(e.target.value) })} /></label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={p.is_published} onChange={(e) => patch(p, { is_published: e.target.checked })} />Нийтлэх</label>
                <Button variant="danger" className="ml-auto" onClick={() => remove(p)}>Устгах</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={adding} title="Зураг оруулах" onClose={() => setAdding(false)}
             footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Болих</Button><Button type="submit" form="album-form" disabled={busy}>Оруулах</Button></>}>
        <form id="album-form" onSubmit={save} className="space-y-4">
          {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
          <Field label="Зураг (JPG, PNG, WebP)" error={errors.image}><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
          <Field label="Гарчиг" error={errors.title} hint="Зургийн доор тод харагдана"><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required /></Field>
          <Field label="Тайлбар өгүүлбэр" error={errors.caption}><Textarea value={caption} onChange={(e) => setCaption(e.target.value)} required /></Field>
          <Field label="Дараалал" error={errors.order}><Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />Нийтлэх</label>
        </form>
      </Modal>
    </div>
  );
}
