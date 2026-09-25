"use client";

/* Олимпиадын хуваарь: он сонгож, шатуудыг нэмэх / засах / устгах */

import { useMemo, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import type { Stage, StageInput } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";
import { Badge, Button, Empty, Field, Input, Modal, Spinner, Table, Td, Textarea, Th } from "@/components/ui";

const empty = (year: number, order: number): StageInput => ({
  year, order, title: "", date_text: `${year} · `, date: null, text: "", tags: [], location: "",
});

export default function SchedulePage() {
  /* Онууд: backend-ээс ирсэн + хэрэглэгчийн шинээр нэмсэн */
  const yearsQ = useFetch(() => api.years(), []);
  const [extraYears, setExtraYears] = useState<number[]>([]);
  const [yearSel, setYearSel] = useState<number | null>(null);
  const years = useMemo(() => {
    const base = yearsQ.data?.schedule ?? [];
    const all = [...new Set([...base, ...extraYears])].sort((a, b) => a - b);
    return all.length ? all : [new Date().getFullYear()];
  }, [yearsQ.data, extraYears]);
  const year = yearSel && years.includes(yearSel) ? yearSel : years[years.length - 1];

  /* Сонгосон оны шатууд */
  const stagesQ = useFetch(() => (yearsQ.data ? api.stages.list(year) : null), [year, !!yearsQ.data]);
  const stages = stagesQ.data;

  const [editing, setEditing] = useState<{ id?: number; data: StageInput } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [newYear, setNewYear] = useState("");

  function addYear() {
    const y = Number(newYear);
    if (!y) return;
    setExtraYears((xs) => [...xs, y]);
    setYearSel(y);
    setNewYear("");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true); setErrors({});
    try {
      if (editing.id) await api.stages.update(editing.id, editing.data);
      else await api.stages.create(editing.data);
      setEditing(null);
      stagesQ.reload();
      yearsQ.reload();
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: Stage) {
    if (!confirm(`"${s.title}" шатыг устгах уу?`)) return;
    await api.stages.remove(s.id);
    stagesQ.reload();
  }

  const d = editing?.data;
  const set = (patch: Partial<StageInput>) => editing && setEditing({ ...editing, data: { ...editing.data, ...patch } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy">Хуваарь</h1>
          <p className="text-sm text-slate-600">Оны шат бүрийн огноо, тайлбар, тагууд. Вэб сайтын &quot;Хуваарь&quot; хэсэгт шууд харагдана.</p>
        </div>
        <Button onClick={() => setEditing({ data: empty(year, (stages?.length ?? 0) + 1) })}>+ Шат нэмэх</Button>
      </div>

      {/* Оны сонголт */}
      <div className="flex flex-wrap items-center gap-2">
        {years.map((y) => (
          <button key={y} onClick={() => setYearSel(y)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${y === year ? "bg-navy text-white" : "bg-navy/10 text-navy hover:bg-navy/20"}`}>{y}</button>
        ))}
        <div className="ml-2 flex items-center gap-1">
          <Input type="number" placeholder="Шинэ он" value={newYear} onChange={(e) => setNewYear(e.target.value)} className="w-28" />
          <Button variant="ghost" onClick={addYear} disabled={!newYear}>Нэмэх</Button>
        </div>
      </div>

      {/* Хүснэгт */}
      {stagesQ.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{stagesQ.error}</p>}
      {stagesQ.loading || !stages ? <Spinner /> : stages.length === 0 ? (
        <Empty>{year} онд шат ороогүй байна. &quot;Шат нэмэх&quot; товчоор эхлүүлнэ үү.</Empty>
      ) : (
        <Table head={<><Th className="w-12">#</Th><Th>Огноо</Th><Th>Шат</Th><Th className="hidden lg:table-cell">Тайлбар</Th><Th>Тагууд</Th><Th className="w-40"></Th></>}>
          {stages.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50">
              <Td><span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-xs font-bold text-navy">{s.order}</span></Td>
              <Td className="whitespace-nowrap font-semibold text-navy">{s.date_text}</Td>
              <Td><div className="font-semibold">{s.title}</div>{s.location && <div className="text-xs text-slate-500">{s.location}</div>}</Td>
              <Td className="hidden max-w-md text-slate-600 lg:table-cell">{s.text}</Td>
              <Td><div className="flex flex-wrap gap-1">{s.tags.map((t) => <Badge key={t} tone="slate">{t}</Badge>)}</div></Td>
              <Td className="text-right">
                <Button variant="ghost" onClick={() => setEditing({ id: s.id, data: { ...s } })}>Засах</Button>
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => remove(s)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      {/* Нэмэх / засах модал */}
      <Modal open={!!editing} title={editing?.id ? "Шат засах" : "Шат нэмэх"} onClose={() => setEditing(null)}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Болих</Button><Button type="submit" form="stage-form" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button></>}>
        {d && (
          <form id="stage-form" onSubmit={save} className="space-y-4">
            {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Он" error={errors.year}><Input type="number" value={d.year} onChange={(e) => set({ year: Number(e.target.value) })} required /></Field>
              <Field label="Дараалал" error={errors.order}><Input type="number" min={1} value={d.order} onChange={(e) => set({ order: Number(e.target.value) })} required /></Field>
            </div>
            <Field label="Шатны нэр" error={errors.title}><Input value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="I шат — Сургуулийн" required /></Field>
            <Field label="Огноо (текстээр)" error={errors.date_text} hint="Хэлбэр: 2026 · 10 сарын 1–20 — доорх огноо хоосон бол календарийн карт (сар, өдөр, он) үүнээс үүснэ">
              <Input value={d.date_text} onChange={(e) => set({ date_text: e.target.value })} required />
            </Field>
            <Field label="Огноо (яг өдөр)" error={errors.date} hint="Оруулбал карт дээр гараг + өдөр (жишээ: Мя 07) гарна; хугацааны муж бол хоосон үлдээнэ">
              <Input type="date" value={d.date ?? ""} onChange={(e) => set({ date: e.target.value || null })} />
            </Field>
            <Field label="Тайлбар" error={errors.text}><Textarea value={d.text} onChange={(e) => set({ text: e.target.value })} /></Field>
            <Field label="Тагууд" error={errors.tags} hint="Таслалаар тусгаарлана: 90 минут, 5 бодлого">
              <Input value={d.tags.join(", ")} onChange={(e) => set({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
            </Field>
            <Field label="Байршил" error={errors.location}><Input value={d.location} onChange={(e) => set({ location: e.target.value })} /></Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
