"use client";

/* Маам багшийн албумын зураг: оруулах, гарчиг, тайлбар, дараалал, нийтлэх, устгах.
   Карт бүр өөрийн "Хадгалах" товчтой (өмнө нь талбараас гарахад анзааралгүй хадгалагддаг байсан): өөрчлөлт хадгалаагүй бол
   шар анхааруулга, хадгалсны дараа "Хадгалагдлаа"; хадгалахад /olympiad хуудасны кэш шууд шинэчлэгдэнэ (api.ts afterSave). */

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AlbumPhoto } from "@/lib/types";
import { Button, Card, Empty, Field, Input, Modal, Spinner, Textarea } from "@/components/ui";
import { DeleteLabel } from "@/components/admin/ActionLabel";

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
            <AlbumCard key={p.id} photo={p} onSaved={q.reload} onRemove={() => remove(p)} />
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

/** Албумын нэг зураг: талбаруудыг засаад "Хадгалах" дарахад л PATCH хийнэ. */
function AlbumCard({ photo, onSaved, onRemove }: { photo: AlbumPhoto; onSaved: () => void; onRemove: () => void }) {
  const [base, setBase] = useState(photo);   // сүүлд хадгалагдсан утга (серверийн хариу)
  const [d, setD] = useState({ title: photo.title, caption: photo.caption, order: photo.order, is_published: photo.is_published });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const dirty = d.title !== base.title || d.caption !== base.caption || d.order !== base.order || d.is_published !== base.is_published;
  const up = (patch: Partial<typeof d>) => { setD({ ...d, ...patch }); setSaved(false); setError(""); };

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!d.title.trim()) { setError("Гарчиг оруулна уу."); return; }
    setBusy(true); setError("");
    try {
      const p = await api.album.update(photo.id, { ...d, title: d.title.trim() });
      setBase(p); setD({ title: p.title, caption: p.caption, order: p.order, is_published: p.is_published }); setSaved(true);
      if (p.order !== base.order) onSaved();   // дараалал өөрчлөгдсөн бол жагсаалтыг дахин эрэмбэлнэ
    }
    catch (err) { setError(err instanceof ApiError ? Object.values(err.fieldErrors).join(" ") || err.message : "Хадгалж чадсангүй."); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={save}>
      <Card className="space-y-3">
        <div className="relative h-48 w-full overflow-hidden rounded-lg bg-slate-100">
          <Image src={photo.image} alt="" fill unoptimized className="object-cover" />
        </div>
        <Input value={d.title} aria-label="Гарчиг" className="font-semibold" onChange={(e) => up({ title: e.target.value })} />
        <Textarea value={d.caption} aria-label="Тайлбар" onChange={(e) => up({ caption: e.target.value })} />
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1">Дараалал <Input type="number" className="w-16" value={d.order} onChange={(e) => up({ order: Number(e.target.value) })} /></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={d.is_published} onChange={(e) => up({ is_published: e.target.checked })} />Нийтлэх</label>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          <Button type="submit" disabled={busy || !dirty}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button>
          {saved && !dirty && <span className="text-sm font-medium text-emerald-700">✓ Хадгалагдлаа</span>}
          {dirty && <span className="text-sm text-amber-700">Хадгалаагүй өөрчлөлт</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
          <Button type="button" variant="danger" className="ml-auto" onClick={onRemove}><DeleteLabel /></Button>
        </div>
      </Card>
    </form>
  );
}
