"use client";

/* /admin/about — танилцуулгын гарчиг, rich text, үзүүлэлт (0–4). Олимпиадын тохиргооны хуудастай ижил загвар. */

import { useState, type FormEvent } from "react";
import { RichText } from "@/components/admin/RichText";
import { Button, Card, Field, Input, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AboutPageInput, AboutStat } from "@/lib/types";

const STATS_MAX = 4;

export default function AboutPageAdmin() {
  const q = useFetch(() => api.about.page.get(), []);
  const [form, setForm] = useState<AboutPageInput | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  // Серверийн өгөгдөл ирэхэд формыг нэг удаа дүүргэнэ (render-д, effect-гүй)
  const data = form ?? q.data ?? null;
  const set = (patch: Partial<AboutPageInput>) => data && setForm({ ...data, ...patch });
  const setStat = (i: number, patch: Partial<AboutStat>) => data && set({ stats: data.stats.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    setBusy(true); setErrors({}); setSaved(false);
    try { setForm(await api.about.page.update(data)); setSaved(true); }
    catch (err) { setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." }); }
    finally { setBusy(false); }
  }

  if (q.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  if (!data) return <Spinner />;

  return (
    <form onSubmit={save} className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Танилцуулга</h1>
        <p className="text-sm text-slate-600">Олон нийтийн <code>/about</code> хуудасны дээд хэсэг: гарчиг, танилцуулга, тоон үзүүлэлт.</p>
      </div>
      {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
      <Card className="space-y-4">
        <Field label="Гарчиг" error={errors.intro_title}><Input value={data.intro_title} onChange={(e) => set({ intro_title: e.target.value })} maxLength={160} /></Field>
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Танилцуулга</span>
          <RichText value={data.intro_html} onChange={(html) => set({ intro_html: html })} onUploadImage={(f) => api.about.page.uploadImage(f).then((r) => r.url)} />
          {errors.intro_html && <p className="mt-1 text-xs font-medium text-red-600">{errors.intro_html}</p>}
        </div>
      </Card>
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-navy">Үзүүлэлт</h2>
          <Button type="button" variant="secondary" disabled={data.stats.length >= STATS_MAX} onClick={() => set({ stats: [...data.stats, { value: "", label: "" }] })}>Мөр нэмэх</Button>
        </div>
        {data.stats.length === 0 && <p className="text-sm text-slate-500">Үзүүлэлт байхгүй. 4 хүртэл мөр нэмж болно.</p>}
        {data.stats.map((s, i) => (
          <div key={i} className="flex items-end gap-2">
            <Field label="Тоо"><Input value={s.value} onChange={(e) => setStat(i, { value: e.target.value })} maxLength={20} placeholder="1200+" /></Field>
            <div className="flex-1"><Field label="Шошго"><Input value={s.label} onChange={(e) => setStat(i, { label: e.target.value })} maxLength={60} placeholder="Суралцагчид" /></Field></div>
            <button type="button" onClick={() => set({ stats: data.stats.filter((_, j) => j !== i) })} className="mb-1 inline-grid h-9 w-9 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label="Устгах" title="Устгах">🗑</button>
          </div>
        ))}
        {errors.stats && <p className="text-xs font-medium text-red-600">{errors.stats}</p>}
      </Card>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button>
        {saved && <span className="text-sm text-emerald-700">Хадгалагдлаа</span>}
      </div>
    </form>
  );
}
