"use client";

/* Төгсөгчдийн үр дүн (admin): он бүрээр төгссөн тоо ба гадаадын их, дээд сургуульд элссэн тоо. Хуудсанд «Гадаадад элссэн хувь» area
   график + үзүүлэлтийн мөр. Мөр нэмэх, устгах; Хадгалах → PUT /programs/{id}/outcomes/ (бүхэлд нь солино, он өсөхөөр эрэмбэлнэ);
   "Арилгах" → хоосон илгээнэ. Backend-ийн алдаа (rows) доор нь. */

import { useState, type FormEvent } from "react";
import { Button, Card, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { ProgramOutcome } from "@/lib/types";

const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base text-red-600 transition hover:bg-red-50 disabled:opacity-30";
type Row = { year: string; graduates: string; abroad: string };
const toRow = (o: ProgramOutcome): Row => ({ year: String(o.year), graduates: String(o.graduates), abroad: String(o.abroad) });
const pct = (r: Row) => { const g = Number(r.graduates), a = Number(r.abroad); return g > 0 && r.abroad !== "" ? `${Math.round((a / g) * 1000) / 10}%` : "–"; };

export function OutcomesPanel({ programId, outcomes, onChanged }: { programId: number; outcomes: ProgramOutcome[]; onChanged: () => void }) {
  const [rows, setRows] = useState<Row[]>(outcomes.length ? outcomes.map(toRow) : [{ year: String(new Date().getFullYear()), graduates: "", abroad: "" }]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (i: number, k: keyof Row, v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const add = () => {
    const last = Math.max(0, ...rows.map((r) => Number(r.year) || 0));
    setRows([...rows, { year: last ? String(last + 1) : "", graduates: "", abroad: "" }]);
  };

  async function submit(body: ProgramOutcome[]) {
    setBusy(true); setError(""); setSaved(false);
    try { await api.programs.setOutcomes(programId, body); setSaved(true); onChanged(); }
    catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setError(Object.values(err.fieldErrors).join(" "));
      else setError(err instanceof ApiError ? err.message : "Хадгалж чадсангүй.");
    } finally { setBusy(false); }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (rows.some((r) => !r.year || !r.graduates || r.abroad === "")) { setError("Мөр бүрт он, төгссөн, гадаадад элссэн тоог бөглөнө үү."); return; }
    void submit(rows.map((r) => ({ year: Number(r.year), graduates: Number(r.graduates), abroad: Number(r.abroad) })));
  }
  async function clear() {
    if (!confirm("Төгсөгчдийн үр дүнг хуудаснаас арилгах уу?")) return;
    await submit([]);
    setRows([{ year: String(new Date().getFullYear()), graduates: "", abroad: "" }]);
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Төгсөгчдийн үр дүн</h2>
          <p className="text-sm text-slate-600">Он бүрээр тухайн хөтөлбөрийг төгссөн сурагчийн тоо ба тэдгээрээс гадаадын их, дээд сургуульд элссэн тоо. Хуудсанд «Гадаадад элссэн хувь» график (2+ он) ба үзүүлэлтийн мөрөнд гарна. Ихдээ 30 он.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                <th className="py-2 pr-2">Он</th><th className="py-2 pr-2">Төгссөн</th><th className="py-2 pr-2">Гадаадад элссэн</th><th className="py-2 pr-2">Хувь</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1.5 pr-2"><Input type="number" min={2000} max={2100} value={r.year} onChange={(e) => set(i, "year", e.target.value)} aria-label="Он" className="w-24" /></td>
                  <td className="py-1.5 pr-2"><Input type="number" min={1} max={10000} value={r.graduates} onChange={(e) => set(i, "graduates", e.target.value)} aria-label={`${r.year} он, төгссөн`} className="w-28" /></td>
                  <td className="py-1.5 pr-2"><Input type="number" min={0} max={10000} value={r.abroad} onChange={(e) => set(i, "abroad", e.target.value)} aria-label={`${r.year} он, гадаадад элссэн`} className="w-28" /></td>
                  <td className="py-1.5 pr-2 font-semibold tabular-nums text-slate-700">{pct(r)}</td>
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
          {outcomes.length > 0 && <Button type="button" variant="danger" onClick={clear} disabled={busy}>Арилгах</Button>}
          {saved && <span className="text-sm text-green-700">Хадгалагдлаа.</span>}
        </div>
      </form>
    </Card>
  );
}
