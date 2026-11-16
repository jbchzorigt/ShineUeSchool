"use client";

/* Cambridge IGCSE дүнгийн хувь (admin): он бүрээр A*–A ба A*–C дүн авсан хувь — манай сургууль ба дэлхийн (Cambridge-ийн нийт). Хуудасны «Үр дүн»
   хэсэгт ApexCharts график (он бүрт хоёр багана, доод хэсэг A*–A, дээд хэсэг A*–C хүртэл) ба үзүүлэлтийн мөрөнд гарна. Мөр нэмэх, устгах;
   Хадгалах → PUT /programs/{id}/grade-rates/ (бүхэлд нь солино, он өсөхөөр); "Арилгах" → хоосон илгээнэ. Backend-ийн алдаа (rows) доор нь. */

import { useState, type FormEvent } from "react";
import { Button, Card, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { ProgramGradeRate } from "@/lib/types";

const KEYS = ["school_a", "world_a", "school_c", "world_c"] as const;
type Key = (typeof KEYS)[number];
type Row = { year: string } & Record<Key, string>;
const HEAD: Record<Key, string> = { school_a: "Манай A*–A %", world_a: "Дэлхий A*–A %", school_c: "Манай A*–C %", world_c: "Дэлхий A*–C %" };
const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base text-red-600 transition hover:bg-red-50 disabled:opacity-30";
const toRow = (o: ProgramGradeRate): Row => ({ year: String(o.year), school_a: String(o.school_a), world_a: String(o.world_a), school_c: String(o.school_c), world_c: String(o.world_c) });
const blank = (year: string): Row => ({ year, school_a: "", world_a: "", school_c: "", world_c: "" });

export function GradeRatesPanel({ programId, rates, onChanged }: { programId: number; rates: ProgramGradeRate[]; onChanged: () => void }) {
  const [rows, setRows] = useState<Row[]>(rates.length ? rates.map(toRow) : [blank(String(new Date().getFullYear() - 1))]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (i: number, k: keyof Row, v: string) => { setSaved(false); setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r))); };
  const add = () => {
    const last = Math.max(0, ...rows.map((r) => Number(r.year) || 0));
    setRows([...rows, blank(last ? String(last + 1) : "")]);
  };

  async function submit(body: ProgramGradeRate[]) {
    setBusy(true); setError(""); setSaved(false);
    try { await api.programs.setGradeRates(programId, body); setSaved(true); onChanged(); }
    catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setError(Object.values(err.fieldErrors).join(" "));
      else setError(err instanceof ApiError ? err.message : "Хадгалж чадсангүй.");
    } finally { setBusy(false); }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (rows.some((r) => !r.year || KEYS.some((k) => r[k] === ""))) { setError("Мөр бүрт он ба дөрвөн хувийг бөглөнө үү."); return; }
    void submit(rows.map((r) => ({ year: Number(r.year), school_a: Number(r.school_a), world_a: Number(r.world_a), school_c: Number(r.school_c), world_c: Number(r.world_c) })));
  }
  async function clear() {
    if (!confirm("IGCSE дүнгийн графикийг хуудаснаас арилгах уу?")) return;
    await submit([]);
    setRows([blank(String(new Date().getFullYear() - 1))]);
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-navy">IGCSE дүнгийн хувь</h2>
          <p className="text-sm text-slate-600">
            Он бүрээр IGCSE-д A*–A ба A*–C дүн авсан хувь — манай сурагчид ба дэлхийн (Cambridge-ийн нийт) хувь. A*–A нь A*–C-ээс их байж болохгүй.
            Хуудасны «Үр дүн» хэсэгт он бүрт хоёр баганатай график, үзүүлэлтийн мөрөнд сүүлийн оны A*–C гарна. Ихдээ 30 он.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                <th className="py-2 pr-2">Он</th>
                {KEYS.map((k) => <th key={k} className="py-2 pr-2">{HEAD[k]}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1.5 pr-2"><Input type="number" min={2000} max={2100} value={r.year} onChange={(e) => set(i, "year", e.target.value)} aria-label="Он" className="w-24" /></td>
                  {KEYS.map((k) => (
                    <td key={k} className="py-1.5 pr-2">
                      <Input type="number" min={0} max={100} step="0.1" value={r[k]} onChange={(e) => set(i, k, e.target.value)} aria-label={`${r.year} он, ${HEAD[k]}`} className="w-24" />
                    </td>
                  ))}
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
          {rates.length > 0 && <Button type="button" variant="danger" onClick={clear} disabled={busy}>Арилгах</Button>}
          {saved && <span className="text-sm text-green-700">Хадгалагдлаа.</span>}
        </div>
      </form>
    </Card>
  );
}
