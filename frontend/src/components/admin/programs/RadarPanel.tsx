"use client";

/* Онооны график (admin, slope chart): гарчиг; хичээлүүд = мөр, цуврал (жил) = багана, нүд бүрт оноо. Мөр/багана нэмэх, устгах; Хадгалах →
   PUT /programs/{id}/radar/ (бүхэлд нь солино); "Графикийг арилгах" → хоосон илгээнэ. Backend-ийн талбарын алдаа доор нь. */

import { useState, type FormEvent } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { ProgramRadar } from "@/lib/types";

const EMPTY: ProgramRadar = { title: "ЭЕШ-ийн дундаж оноо", subjects: ["Математик", "Монгол хэл", "Англи хэл"], series: [{ name: String(new Date().getFullYear()), values: [0, 0, 0] }] };
const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base text-red-600 transition hover:bg-red-50 disabled:opacity-30";

export function RadarPanel({ programId, radar, onChanged }: { programId: number; radar: ProgramRadar | null; onChanged: () => void }) {
  const [d, setD] = useState<ProgramRadar>(radar ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const setSubject = (i: number, v: string) => setD({ ...d, subjects: d.subjects.map((s, j) => (j === i ? v : s)) });
  const setSeriesName = (i: number, v: string) => setD({ ...d, series: d.series.map((s, j) => (j === i ? { ...s, name: v } : s)) });
  const setValue = (si: number, i: number, v: string) => setD({ ...d, series: d.series.map((s, j) => (j === si ? { ...s, values: s.values.map((x, k) => (k === i ? Number(v) : x)) } : s)) });
  const addSubject = () => setD({ ...d, subjects: [...d.subjects, ""], series: d.series.map((s) => ({ ...s, values: [...s.values, 0] })) });
  const removeSubject = (i: number) => setD({ ...d, subjects: d.subjects.filter((_, j) => j !== i), series: d.series.map((s) => ({ ...s, values: s.values.filter((_, k) => k !== i) })) });
  const addSeries = () => setD({ ...d, series: [...d.series, { name: "", values: d.subjects.map(() => 0) }] });
  const removeSeries = (i: number) => setD({ ...d, series: d.series.filter((_, j) => j !== i) });

  async function submit(body: ProgramRadar) {
    setBusy(true); setErrors({}); setSaved(false);
    try { await api.programs.setRadar(programId, body); setSaved(true); onChanged(); }
    catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      else setErrors({ _: err instanceof ApiError ? err.message : "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }
  function save(e: FormEvent) { e.preventDefault(); void submit({ ...d, title: d.title.trim(), subjects: d.subjects.map((s) => s.trim()), series: d.series.map((s) => ({ ...s, name: s.name.trim() })) }); }
  async function clear() {
    if (!confirm("Графикийг хуудаснаас арилгах уу?")) return;
    await submit({ title: "", subjects: [], series: [] });
    setD(EMPTY);
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Онооны график (slope chart)</h2>
          <p className="text-sm text-slate-600">Хичээл бүрээр (мөр) цуврал тус бүрийн (багана, жишээ нь он) оноо. Хуудсанд ApexCharts slope chart-аар гарна (багана = цуврал, шугам = хичээл); хичээл 3–12, цуврал 1–5, оноо 0–1000.</p>
        </div>
        {errors._ && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors._}</p>}
        <Field label="Гарчиг" error={errors.title}><Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="ЭЕШ-ийн дундаж оноо" maxLength={120} /></Field>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                <th className="py-2 pr-2">Хичээл</th>
                {d.series.map((s, si) => (
                  <th key={si} className="py-2 pr-2">
                    <span className="flex items-center gap-1">
                      <Input value={s.name} onChange={(e) => setSeriesName(si, e.target.value)} placeholder="Он" className="w-24" maxLength={40} />
                      <button type="button" onClick={() => removeSeries(si)} disabled={d.series.length <= 1} className={iconBtn} aria-label="Цуврал устгах" title="Цуврал устгах">✕</button>
                    </span>
                  </th>
                ))}
                <th className="py-2"><Button type="button" variant="secondary" onClick={addSeries} disabled={d.series.length >= 5}>+ Цуврал</Button></th>
              </tr>
            </thead>
            <tbody>
              {d.subjects.map((sub, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1.5 pr-2"><Input value={sub} onChange={(e) => setSubject(i, e.target.value)} placeholder="Хичээл" className="min-w-40" maxLength={40} /></td>
                  {d.series.map((s, si) => (
                    <td key={si} className="py-1.5 pr-2"><Input type="number" min={0} max={1000} step="0.1" value={s.values[i] ?? 0} onChange={(e) => setValue(si, i, e.target.value)} className="w-24" /></td>
                  ))}
                  <td className="py-1.5"><button type="button" onClick={() => removeSubject(i)} disabled={d.subjects.length <= 3} className={iconBtn} aria-label="Хичээл устгах" title="Хичээл устгах">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(errors.subjects || errors.series) && <p className="text-xs font-medium text-red-600">{errors.subjects ?? errors.series}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={addSubject} disabled={d.subjects.length >= 12}>+ Хичээл</Button>
          <Button type="submit" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button>
          {radar && <Button type="button" variant="danger" onClick={clear} disabled={busy}>Графикийг арилгах</Button>}
          {saved && <span className="text-sm text-green-700">Хадгалагдлаа.</span>}
        </div>
      </form>
    </Card>
  );
}
