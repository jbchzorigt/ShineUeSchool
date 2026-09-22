"use client";

/* Олимпиадын үр дүн: он + ангилал сонгож, оролцогчдын оноог нэмэх / засах / устгах.
   Excel-ээс бөөнөөр оруулах бол /admin/results/import хуудсыг ашиглана. */

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { CATEGORIES, type CategoryValue, type Medal, type RankLabel, type Result, type ResultInput } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";
import { Badge, Button, Empty, Field, Input, Modal, Select, Spinner, Table, Td, Th } from "@/components/ui";

const MEDAL_STYLE: Record<string, string> = {
  "АЛТ": "bg-gold text-navy",
  "МӨНГӨ": "bg-slate-300 text-navy",
  "ХҮРЭЛ": "bg-amber-600 text-white",
};
const RANKS: RankLabel[] = ["", "I", "II", "III"];
const MEDALS: Medal[] = ["", "АЛТ", "МӨНГӨ", "ХҮРЭЛ"];

const empty = (year: number, category: CategoryValue): ResultInput => ({
  year, category, last_name: "", first_name: "", school: "", code: "", scores: [], score: null, rank_label: "", medal: "", note: "",
});

export default function ResultsPage() {
  /* Онууд */
  const yearsQ = useFetch(() => api.years(), []);
  const [extraYears, setExtraYears] = useState<number[]>([]);
  const [yearSel, setYearSel] = useState<number | null>(null);
  const years = useMemo(() => {
    const base = yearsQ.data?.results ?? [];
    const all = [...new Set([...base, ...extraYears])].sort((a, b) => a - b);
    return all.length ? all : [new Date().getFullYear()];
  }, [yearsQ.data, extraYears]);
  const year = yearSel && years.includes(yearSel) ? yearSel : years[years.length - 1];
  const [category, setCategory] = useState<CategoryValue>("6");

  /* Он + ангиллын үр дүн */
  const rowsQ = useFetch(() => (yearsQ.data ? api.results.list(year, category) : null), [year, category, !!yearsQ.data]);
  const rows = rowsQ.data;
  const problems = useMemo(() => Math.max(0, ...(rows?.map((r) => r.scores.length) ?? [0])), [rows]);

  const [editing, setEditing] = useState<{ id?: number; data: ResultInput } | null>(null);
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
      if (editing.id) await api.results.update(editing.id, editing.data);
      else await api.results.create(editing.data);
      setEditing(null);
      rowsQ.reload();
      yearsQ.reload();
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: Result) {
    if (!confirm(`${r.full_name} — үр дүнг устгах уу?`)) return;
    await api.results.remove(r.id);
    rowsQ.reload();
  }

  const d = editing?.data;
  const set = (patch: Partial<ResultInput>) => editing && setEditing({ ...editing, data: { ...editing.data, ...patch } });
  const catLabel = CATEGORIES.find((c) => c.value === category)?.label ?? category;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy">Үр дүн</h1>
          <p className="text-sm text-slate-600">Excel файлаас бөөнөөр оруулах эсвэл нэг нэгээр нь засах. Байр оноогоор автоматаар тооцогдоно.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/olympiad/results/import"><Button variant="secondary">⇪ Excel-ээс оруулах</Button></Link>
          <Button onClick={() => setEditing({ data: empty(year, category) })}>+ Оролцогч нэмэх</Button>
        </div>
      </div>

      {/* Он */}
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

      {/* Ангилал */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button key={c.value} onClick={() => setCategory(c.value)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${c.value === category ? "border-navy bg-navy text-white" : "border-slate-300 bg-white text-slate-700 hover:border-navy"}`}>{c.label}</button>
        ))}
      </div>

      {rowsQ.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{rowsQ.error}</p>}
      {rowsQ.loading || !rows ? <Spinner /> : rows.length === 0 ? (
        <Empty>{year} он, {catLabel} ангилалд үр дүн ороогүй байна.</Empty>
      ) : (
        <>
          <p className="text-xs text-slate-500">{rows.length} оролцогч · {problems} бодлого</p>
          <Table head={<>
            <Th className="w-14">#</Th><Th>Оролцогч</Th><Th>Сургууль</Th>
            {Array.from({ length: problems }, (_, i) => <Th key={i} className="w-10 text-center">{i + 1}</Th>)}
            <Th className="text-right">Нийт</Th><Th>Байр</Th><Th className="w-36"></Th>
          </>}>
            {rows.map((r, i) => (
              <tr key={r.id} className={r.medal ? "bg-gold/5" : "hover:bg-slate-50"}>
                <Td><span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${r.medal ? MEDAL_STYLE[r.medal] : "border border-slate-300 text-slate-600"}`}>{r.rank ?? i + 1}</span></Td>
                <Td>
                  <div className="font-semibold">{r.full_name}</div>
                  {r.code && <div className="text-xs text-slate-500">Шифр {r.code}</div>}
                </Td>
                <Td className="text-slate-600">{r.school}</Td>
                {Array.from({ length: problems }, (_, k) => (
                  <Td key={k} className="text-center tabular-nums text-slate-700">{r.scores[k] ?? "–"}</Td>
                ))}
                <Td className="text-right font-bold tabular-nums text-navy">{r.score ?? "–"}</Td>
                <Td>{r.rank_label && <Badge tone={r.medal === "АЛТ" ? "gold" : "navy"}>{r.rank_label} байр{r.medal ? ` · ${r.medal}` : ""}</Badge>}</Td>
                <Td className="text-right whitespace-nowrap">
                  <Button variant="ghost" onClick={() => setEditing({ id: r.id, data: {
                    year: r.year, category: r.category, last_name: r.last_name, first_name: r.first_name, school: r.school,
                    code: r.code, scores: r.scores, score: r.score, rank_label: r.rank_label, medal: r.medal, note: r.note,
                  } })}>Засах</Button>
                  <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => remove(r)}>Устгах</Button>
                </Td>
              </tr>
            ))}
          </Table>
        </>
      )}

      <Modal open={!!editing} title={editing?.id ? "Үр дүн засах" : "Оролцогч нэмэх"} onClose={() => setEditing(null)}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Болих</Button><Button type="submit" form="result-form" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button></>}>
        {d && (
          <form id="result-form" onSubmit={save} className="space-y-4">
            {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Он" error={errors.year}><Input type="number" value={d.year} onChange={(e) => set({ year: Number(e.target.value) })} required /></Field>
              <Field label="Ангилал" error={errors.category}>
                <Select value={d.category} onChange={(e) => set({ category: e.target.value as CategoryValue })}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Овог" error={errors.last_name}><Input value={d.last_name} onChange={(e) => set({ last_name: e.target.value })} /></Field>
              <Field label="Нэр" error={errors.first_name}><Input value={d.first_name} onChange={(e) => set({ first_name: e.target.value })} required autoFocus /></Field>
            </div>
            <Field label="Сургууль" error={errors.school}><Input value={d.school} onChange={(e) => set({ school: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Шифр" error={errors.code} hint="Багш нарын ангилалд"><Input value={d.code} onChange={(e) => set({ code: e.target.value })} /></Field>
              <Field label="Нийт оноо" error={errors.score}>
                <Input type="number" step="0.01" min={0} value={d.score ?? ""} onChange={(e) => set({ score: e.target.value === "" ? null : Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Бодлого бүрийн оноо" error={errors.scores} hint="Таслалаар: 7, 7, 0, 7, 5">
              <Input value={d.scores.map((s) => (s ?? "")).join(", ")}
                onChange={(e) => set({ scores: e.target.value.split(",").map((s) => s.trim()).filter((s) => s !== "").map(Number) })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Байр" error={errors.rank_label}>
                <Select value={d.rank_label} onChange={(e) => set({ rank_label: e.target.value as RankLabel })}>
                  {RANKS.map((r) => <option key={r} value={r}>{r ? `${r} байр` : "—"}</option>)}
                </Select>
              </Field>
              <Field label="Медаль" error={errors.medal}>
                <Select value={d.medal} onChange={(e) => set({ medal: e.target.value as Medal })}>
                  {MEDALS.map((m) => <option key={m} value={m}>{m || "—"}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Тэмдэглэл" error={errors.note}><Input value={d.note} onChange={(e) => set({ note: e.target.value })} /></Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
