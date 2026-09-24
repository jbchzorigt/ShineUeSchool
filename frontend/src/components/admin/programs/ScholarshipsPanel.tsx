"use client";

/* Тэтгэлэг (admin): хүснэгт ▲▼, зураг, нэр, их сургууль, он, дүн; ✎ inline, зураг солих/устгах, 🗑; доор нийт дүн; "Тэтгэлэг нэмэх".
   Жагсаалт backend-ийн эрэмбээр (year DESC, order) — ▲▼ нь нэг оны доторх дарааллыг л өөрчилнө. */

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { formatUsd } from "@/components/programs/money";
import { Button, Card, Empty, Input, Table, Td, Th } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { Scholarship, ScholarshipInput } from "@/lib/types";
import { ScholarshipDialog } from "./ScholarshipDialog";

const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base transition hover:bg-navy/10";

export function ScholarshipsPanel({ programId, items, onChanged }: { programId: number; items: Scholarship[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<(ScholarshipInput & { id: number }) | null>(null);
  const [error, setError] = useState("");
  const [moving, setMoving] = useState(false);
  const total = items.reduce((a, s) => a + s.amount_usd, 0);
  const fail = (e: unknown, fb: string) => setError(e instanceof ApiError ? (Object.values(e.fieldErrors)[0] ?? e.message) : fb);

  async function move(i: number, dir: -1 | 1) {
    if (moving) return;
    const ids = items.map((s) => s.id); const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setMoving(true);
    try { await api.programs.scholarships.reorder(programId, ids); onChanged(); } catch { setError("Эрэмбийг хадгалж чадсангүй."); } finally { setMoving(false); }
  }
  async function saveEdit(e: FormEvent) {
    e.preventDefault(); if (!editing) return; setError("");
    try { await api.programs.scholarships.update(editing.id, { student_name: editing.student_name.trim(), university: editing.university.trim(), year: editing.year, amount_usd: editing.amount_usd }); setEditing(null); onChanged(); }
    catch (err) { fail(err, "Хадгалж чадсангүй."); }
  }
  async function setPhoto(s: Scholarship, f: File | undefined) {
    if (!f) return; setError("");
    try { await api.programs.scholarships.setPhoto(s.id, f); onChanged(); } catch (err) { fail(err, "Зураг оруулж чадсангүй."); }
  }
  async function removePhoto(s: Scholarship) {
    if (!confirm("Зургийг устгах уу?")) return;
    try { await api.programs.scholarships.removePhoto(s.id); onChanged(); } catch { setError("Устгаж чадсангүй."); }
  }
  async function remove(s: Scholarship) {
    if (!confirm(`«${s.student_name}» тэтгэлгийн бичлэгийг устгах уу?`)) return;
    try { await api.programs.scholarships.remove(s.id); onChanged(); } catch { setError("Устгаж чадсангүй."); }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy">Тэтгэлэгт хамрагдсан сурагчид ({items.length})</h2>
        <Button type="button" variant="secondary" onClick={() => setAdding(true)}>Тэтгэлэг нэмэх</Button>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {items.length === 0 ? <Empty>Тэтгэлгийн бичлэг байхгүй.</Empty> : (
        <Table head={<><Th></Th><Th>Сурагч</Th><Th>Их сургууль</Th><Th>Он</Th><Th className="text-right">Дүн</Th><Th></Th></>}>
          {items.map((s, i) => (
            <tr key={s.id}>
              <Td className="whitespace-nowrap">
                <button type="button" onClick={() => move(i, -1)} disabled={moving || i === 0 || items[i - 1]?.year !== s.year} className="px-1 text-navy disabled:opacity-30" aria-label="Дээш">▲</button>
                <button type="button" onClick={() => move(i, 1)} disabled={moving || i === items.length - 1 || items[i + 1]?.year !== s.year} className="px-1 text-navy disabled:opacity-30" aria-label="Доош">▼</button>
              </Td>
              {editing?.id === s.id ? (
                <Td colSpan={4}>
                  <form onSubmit={saveEdit} className="flex flex-wrap items-center gap-2">
                    <Input value={editing.student_name} onChange={(e) => setEditing({ ...editing, student_name: e.target.value })} maxLength={120} aria-label="Нэр" className="max-w-40" autoFocus />
                    <Input value={editing.university} onChange={(e) => setEditing({ ...editing, university: e.target.value })} maxLength={160} aria-label="Их сургууль" className="max-w-48" />
                    <Input type="number" min={2000} max={2100} value={editing.year} onChange={(e) => setEditing({ ...editing, year: Number(e.target.value) })} aria-label="Он" className="max-w-24" />
                    <Input type="number" min={0} value={editing.amount_usd} onChange={(e) => setEditing({ ...editing, amount_usd: Number(e.target.value) })} aria-label="Дүн USD" className="max-w-32" />
                    <Button type="submit">OK</Button><Button type="button" variant="ghost" onClick={() => setEditing(null)}>✕</Button>
                  </form>
                </Td>
              ) : (
                <>
                  <Td>
                    <span className="flex items-center gap-2">
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-navy text-center font-bold leading-10 text-gold">
                        {s.photo ? <Image src={s.photo} alt="" fill unoptimized sizes="40px" className="object-cover" /> : s.student_name.charAt(0)}
                      </span>
                      <span className="font-semibold">{s.student_name}</span>
                    </span>
                  </Td>
                  <Td className="text-slate-600">{s.university}</Td>
                  <Td>{s.year}</Td>
                  <Td className="whitespace-nowrap text-right font-semibold text-navy">{formatUsd(s.amount_usd)}</Td>
                </>
              )}
              <Td className="whitespace-nowrap text-right">
                <label className={`${iconBtn} cursor-pointer text-navy`} title="Зураг оруулах"><span aria-hidden="true">🖼</span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Зураг оруулах" onChange={(e) => { setPhoto(s, e.target.files?.[0]); e.target.value = ""; }} /></label>
                {s.photo && <button type="button" onClick={() => removePhoto(s)} className={`${iconBtn} text-slate-500`} aria-label="Зураг устгах" title="Зураг устгах">⊘</button>}
                <button type="button" onClick={() => setEditing({ id: s.id, student_name: s.student_name, university: s.university, year: s.year, amount_usd: s.amount_usd })} className={`${iconBtn} text-navy`} aria-label="Засах" title="Засах">✎</button>
                <button type="button" onClick={() => remove(s)} className={`${iconBtn} text-red-600 hover:bg-red-50`} aria-label="Устгах" title="Устгах">🗑</button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      {items.length > 0 && <p className="text-right text-sm text-slate-600">Нийт: <span className="font-bold text-navy">{formatUsd(total)}</span> · {items.length} сурагч</p>}
      {adding && <ScholarshipDialog programId={programId} open onClose={() => setAdding(false)} onSaved={onChanged} />}
    </Card>
  );
}
