"use client";

/* Олимпиадын үр дүн: он + анги сонгож, сурагчдын оноог нэмэх / засах / устгах */

import { useMemo, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { GRADES, type Result, type ResultInput } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";
import { Badge, Button, Empty, Field, Input, Modal, Select, Spinner, Table, Td, Th } from "@/components/ui";

const MEDAL = ["bg-gold text-navy", "bg-slate-300 text-navy", "bg-amber-600 text-white"];

const empty = (year: number, grade: number): ResultInput => ({ year, grade, student: "", school: "", score: 0, note: "" });

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
  const [grade, setGrade] = useState<number>(6);

  /* Он + ангийн үр дүн */
  const rowsQ = useFetch(() => (yearsQ.data ? api.results.list(year, grade) : null), [year, grade, !!yearsQ.data]);
  const rows = rowsQ.data;

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
    if (!confirm(`${r.student} — үр дүнг устгах уу?`)) return;
    await api.results.remove(r.id);
    rowsQ.reload();
  }

  const d = editing?.data;
  const set = (patch: Partial<ResultInput>) => editing && setEditing({ ...editing, data: { ...editing.data, ...patch } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy">Олимпиадын үр дүн</h1>
          <p className="text-sm text-slate-600">Оноог оруулахад байр автоматаар тооцогдоно. Эхний 3 байр вэб сайтад медалиар тодорно.</p>
        </div>
        <Button onClick={() => setEditing({ data: empty(year, grade) })}>+ Сурагч нэмэх</Button>
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

      {/* Анги */}
      <div className="flex flex-wrap gap-2">
        {GRADES.map((g) => (
          <button key={g} onClick={() => setGrade(g)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${g === grade ? "border-navy bg-navy text-white" : "border-slate-300 bg-white text-slate-700 hover:border-navy"}`}>{g}-р анги</button>
        ))}
      </div>

      {rowsQ.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{rowsQ.error}</p>}
      {rowsQ.loading || !rows ? <Spinner /> : rows.length === 0 ? (
        <Empty>{year} он, {grade}-р ангид үр дүн ороогүй байна.</Empty>
      ) : (
        <Table head={<><Th className="w-16">Байр</Th><Th>Сурагч</Th><Th>Сургууль</Th><Th className="text-right">Оноо</Th><Th className="hidden md:table-cell">Тэмдэглэл</Th><Th className="w-40"></Th></>}>
          {rows.map((r, i) => (
            <tr key={r.id} className={i < 3 ? "bg-gold/5" : "hover:bg-slate-50"}>
              <Td><span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${i < 3 ? MEDAL[i] : "border border-navy text-navy"}`}>{r.rank ?? i + 1}</span></Td>
              <Td className="font-semibold">{r.student}</Td>
              <Td className="text-slate-600">{r.school}</Td>
              <Td className="text-right font-bold tabular-nums text-navy">{r.score}</Td>
              <Td className="hidden text-slate-500 md:table-cell">{r.note && <Badge tone="slate">{r.note}</Badge>}</Td>
              <Td className="text-right">
                <Button variant="ghost" onClick={() => setEditing({ id: r.id, data: { year: r.year, grade: r.grade, student: r.student, school: r.school, score: r.score, note: r.note } })}>Засах</Button>
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => remove(r)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!editing} title={editing?.id ? "Үр дүн засах" : "Сурагч нэмэх"} onClose={() => setEditing(null)}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Болих</Button><Button type="submit" form="result-form" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button></>}>
        {d && (
          <form id="result-form" onSubmit={save} className="space-y-4">
            {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Он" error={errors.year}><Input type="number" value={d.year} onChange={(e) => set({ year: Number(e.target.value) })} required /></Field>
              <Field label="Анги" error={errors.grade}>
                <Select value={d.grade} onChange={(e) => set({ grade: Number(e.target.value) })}>
                  {GRADES.map((g) => <option key={g} value={g}>{g}-р анги</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Сурагчийн нэр" error={errors.student}><Input value={d.student} onChange={(e) => set({ student: e.target.value })} required autoFocus /></Field>
            <Field label="Сургууль" error={errors.school}><Input value={d.school} onChange={(e) => set({ school: e.target.value })} required /></Field>
            <Field label="Оноо" error={errors.score}><Input type="number" step="0.01" min={0} value={d.score} onChange={(e) => set({ score: Number(e.target.value) })} required /></Field>
            <Field label="Тэмдэглэл" error={errors.note}><Input value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder="Жишээ: Тусгай байр" /></Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
