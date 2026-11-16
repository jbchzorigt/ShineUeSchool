"use client";

/* Шалгалтын дундаж оноо (admin): он бүрээр манай сургуулийн ба жишиг дундаж оноо — IB диплом: 45 онооноос, дэлхийн дундаж;
   Үндэсний хөтөлбөр: ЭЕШ-ийн бүх хичээлийн дундаж, 800 онооноос, улсын дундаж (хэмжүүр — examScale, backend EXAM_SCALE). Хуудасны «Үр дүн» хэсэгт
   ApexCharts баганан график (он бүрт хоёр багана) ба үзүүлэлтийн мөрөнд гарна. Мөр нэмэх, устгах; Хадгалах → PUT /programs/{id}/exam-scores/
   (бүхэлд нь солино, он өсөхөөр); "Арилгах" → хоосон илгээнэ. Backend-ийн алдаа (rows) доор нь. */

import { useState, type FormEvent } from "react";
import { Button, Card, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { ProgramExamScore } from "@/lib/types";

const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base text-red-600 transition hover:bg-red-50 disabled:opacity-30";
type Row = { year: string; school: string; world: string };
const toRow = (o: ProgramExamScore): Row => ({ year: String(o.year), school: String(o.school), world: String(o.world) });
const blank = (year: string): Row => ({ year, school: "", world: "" });
const diff = (r: Row) => {
  if (r.school === "" || r.world === "") return "–";
  const d = Math.round((Number(r.school) - Number(r.world)) * 10) / 10;
  return d > 0 ? `+${d}` : String(d);
};

export function ExamScoresPanel({ programId, scores, max = 45, national = false, onChanged }: {
  programId: number; scores: ProgramExamScore[]; max?: number; national?: boolean; onChanged: () => void;
}) {
  const ref = national ? "Улсын дундаж" : "Дэлхийн дундаж";
  const [rows, setRows] = useState<Row[]>(scores.length ? scores.map(toRow) : [blank(String(new Date().getFullYear() - 1))]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (i: number, k: keyof Row, v: string) => { setSaved(false); setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r))); };
  const add = () => {
    const last = Math.max(0, ...rows.map((r) => Number(r.year) || 0));
    setRows([...rows, blank(last ? String(last + 1) : "")]);
  };

  async function submit(body: ProgramExamScore[]) {
    setBusy(true); setError(""); setSaved(false);
    try { await api.programs.setExamScores(programId, body); setSaved(true); onChanged(); }
    catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setError(Object.values(err.fieldErrors).join(" "));
      else setError(err instanceof ApiError ? err.message : "Хадгалж чадсангүй.");
    } finally { setBusy(false); }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (rows.some((r) => !r.year || r.school === "" || r.world === "")) { setError(`Мөр бүрт он, манай дундаж ба ${ref.toLowerCase()} оноог бөглөнө үү.`); return; }
    void submit(rows.map((r) => ({ year: Number(r.year), school: Number(r.school), world: Number(r.world) })));
  }
  async function clear() {
    if (!confirm("Шалгалтын дундаж онооны графикийг хуудаснаас арилгах уу?")) return;
    await submit([]);
    setRows([blank(String(new Date().getFullYear() - 1))]);
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Шалгалтын дундаж оноо</h2>
          <p className="text-sm text-slate-600">
            {national
              ? <>Он бүрээр манай сурагчдын ЭЕШ-ийн бүх хичээлийн дундаж оноо ба улсын дундаж ({max} онооноос, ж.нь 641.4 ба 512.2). Хуудасны «Үр дүн» хэсэгт</>
              : <>Он бүрээр манай сурагчдын шалгалтын дундаж оноо ба дэлхийн дундаж (IB диплом — {max} онооноос, ж.нь 33.1 ба 30.3). Хуудасны «Үр дүн» хэсэгт</>}
            он бүрт хоёр баганатай график, үзүүлэлтийн мөрөнд сүүлийн оны оноо гарна. Ихдээ 30 он.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                <th className="py-2 pr-2">Он</th><th className="py-2 pr-2">Манай дундаж</th><th className="py-2 pr-2">{ref}</th><th className="py-2 pr-2">Зөрүү</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1.5 pr-2"><Input type="number" min={2000} max={2100} value={r.year} onChange={(e) => set(i, "year", e.target.value)} aria-label="Он" className="w-24" /></td>
                  <td className="py-1.5 pr-2"><Input type="number" min={0} max={max} step="0.1" value={r.school} onChange={(e) => set(i, "school", e.target.value)} aria-label={`${r.year} он, манай дундаж`} className="w-28" /></td>
                  <td className="py-1.5 pr-2"><Input type="number" min={0} max={max} step="0.1" value={r.world} onChange={(e) => set(i, "world", e.target.value)} aria-label={`${r.year} он, ${ref.toLowerCase()}`} className="w-28" /></td>
                  <td className="py-1.5 pr-2 font-semibold tabular-nums text-slate-700">{diff(r)}</td>
                  <td className="py-1.5"><button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} disabled={rows.length <= 1} className={iconBtn} aria-label="Мөр устгах" title="Мөр устгах">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={add} disabled={rows.length >= 30}>+ Он</Button>
          <Button type="submit" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button>
          {scores.length > 0 && <Button type="button" variant="danger" onClick={clear} disabled={busy}>Арилгах</Button>}
          {saved && <span className="text-sm text-green-700">Хадгалагдлаа.</span>}
        </div>
      </form>
    </Card>
  );
}
