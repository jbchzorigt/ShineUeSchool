"use client";

/* Заадаг хичээлүүд (admin): хичээл бүрт бүлэг (ж.нь «Group 4 · Шинжлэх ухаан», «IGCSE»), нэр, тэмдэг (HL · SL, 9–10-р анги), товч тайлбар —
   монгол + англи. Хуудасны «Тойм» хэсэгт бүлгээр шүүж, дарж тайлбарыг нь харах хичээлийн жагсаалт болж гарна. Нэр онооны графикийн
   хичээлтэй (монгол эсвэл англи нэрээр) таарвал тайлбарын хажууд сүүлийн дундаж оноо гарна. Хадгалах → PUT /programs/{id}/subjects/
   (бүхэлд нь солино, энэ эрэмбээр); "Арилгах" → хоосон илгээнэ. */

import { useState, type FormEvent } from "react";
import { DeleteButton, MoveButton } from "@/components/admin/ActionLabel";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { ProgramSubjectRow } from "@/lib/types";

const MAX = 40;
const blank = (group = "", group_en = ""): ProgramSubjectRow => ({ group, group_en, name: "", name_en: "", tag: "", description: "", description_en: "" });

export function SubjectsPanel({ programId, subjects, onChanged }: { programId: number; subjects: ProgramSubjectRow[]; onChanged: () => void }) {
  const [rows, setRows] = useState<ProgramSubjectRow[]>(subjects.length ? subjects : [blank()]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (i: number, k: keyof ProgramSubjectRow, v: string) => { setSaved(false); setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r))); };
  const move = (i: number, d: -1 | 1) => { const next = [...rows]; [next[i], next[i + d]] = [next[i + d], next[i]]; setRows(next); };
  // Шинэ мөр сүүлийн хичээлийн бүлгийг өвлөнө — нэг бүлгийн хичээлүүдийг дараалан оруулахад хялбар
  const add = () => { const last = rows[rows.length - 1]; setRows([...rows, blank(last?.group, last?.group_en)]); };

  async function submit(body: ProgramSubjectRow[]) {
    setBusy(true); setError(""); setSaved(false);
    try { await api.programs.setSubjects(programId, body); setSaved(true); onChanged(); }
    catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setError(Object.values(err.fieldErrors).join(" "));
      else setError(err instanceof ApiError ? err.message : "Хадгалж чадсангүй.");
    } finally { setBusy(false); }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    const filled = rows.filter((r) => Object.values(r).some((v) => v.trim()));
    if (filled.some((r) => !r.name.trim())) { setError("Хичээл бүрт нэр бичнэ үү."); return; }
    void submit(filled);
  }
  async function clear() {
    if (!confirm("Хичээлийн жагсаалтыг хуудаснаас арилгах уу?")) return;
    await submit([]);
    setRows([blank()]);
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Хичээлүүд</h2>
          <p className="text-sm text-slate-600">
            Хөтөлбөрт заадаг хичээлүүд — хуудасны «Тойм» хэсэгт бүлгээр шүүж, дарж тайлбарыг нь харах жагсаалт болж гарна. Бүлэг нь шүүлтүүрийн
            нэр болно (ж.нь «Group 4 · Шинжлэх ухаан», «IGCSE», «Байгалийн ухаан»). Тэмдэг — богино шошго (HL · SL, 9–10-р анги). Тайлбар 2–3
            өгүүлбэр, ихдээ 400 тэмдэгт. Англи талбар хоосон бол /en хуудсанд монголоор гарна. Ихдээ {MAX} хичээл.
          </p>
        </div>
        <ol className="space-y-3">
          {rows.map((r, i) => (
            <li key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-navy">{i + 1}. {r.name.trim() || "Шинэ хичээл"}</span>
                <span className="flex items-center gap-1">
                  <MoveButton dir="up" onClick={() => move(i, -1)} disabled={i === 0} />
                  <MoveButton dir="down" onClick={() => move(i, 1)} disabled={i === rows.length - 1} />
                  <DeleteButton onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : [blank()])} />
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Нэр"><Input value={r.name} maxLength={80} onChange={(e) => set(i, "name", e.target.value)} placeholder="Физик" /></Field>
                <Field label="Нэр (англи)"><Input value={r.name_en} maxLength={80} onChange={(e) => set(i, "name_en", e.target.value)} placeholder="Physics" /></Field>
                <Field label="Бүлэг"><Input value={r.group} maxLength={60} onChange={(e) => set(i, "group", e.target.value)} placeholder="Байгалийн ухаан" /></Field>
                <Field label="Бүлэг (англи)"><Input value={r.group_en} maxLength={60} onChange={(e) => set(i, "group_en", e.target.value)} placeholder="Sciences" /></Field>
                <Field label="Тайлбар"><Textarea value={r.description} maxLength={400} onChange={(e) => set(i, "description", e.target.value)} /></Field>
                <Field label="Тайлбар (англи)"><Textarea value={r.description_en} maxLength={400} onChange={(e) => set(i, "description_en", e.target.value)} /></Field>
                <Field label="Тэмдэг" hint="Заавал биш. Ж.нь HL · SL"><Input value={r.tag} maxLength={30} onChange={(e) => set(i, "tag", e.target.value)} className="md:w-48" /></Field>
              </div>
            </li>
          ))}
        </ol>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={add} disabled={rows.length >= MAX}>+ Хичээл</Button>
          <Button type="submit" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button>
          {subjects.length > 0 && <Button type="button" variant="danger" onClick={clear} disabled={busy}>Арилгах</Button>}
          {saved && <span className="text-sm text-green-700">Хадгалагдлаа.</span>}
        </div>
      </form>
    </Card>
  );
}
