"use client";

/* Бүтээлийн булан (admin): grid карт — зураг, гарчиг, сурагч; ▲▼, ✎ inline (гарчиг/сурагч/тайлбар), зураг солих, 🗑; "Бүтээл нэмэх". */

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Button, Card, Empty, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { ProgramWork, WorkInput } from "@/lib/types";
import { WorkDialog } from "./WorkDialog";

const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base transition hover:bg-navy/10";

export function WorksPanel({ programId, works, onChanged }: { programId: number; works: ProgramWork[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<(WorkInput & { id: number }) | null>(null);
  const [error, setError] = useState("");
  const [moving, setMoving] = useState(false);
  const fail = (e: unknown, fb: string) => setError(e instanceof ApiError ? (e.fieldErrors.title ?? e.fieldErrors.image ?? e.message) : fb);

  async function move(i: number, dir: -1 | 1) {
    if (moving) return;
    const ids = works.map((w) => w.id); const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setMoving(true);
    try { await api.programs.works.reorder(programId, ids); onChanged(); } catch { setError("Эрэмбийг хадгалж чадсангүй."); } finally { setMoving(false); }
  }
  async function saveEdit(e: FormEvent) {
    e.preventDefault(); if (!editing) return; setError("");
    try { await api.programs.works.update(editing.id, { title: editing.title.trim(), student: editing.student.trim(), caption: editing.caption.trim() }); setEditing(null); onChanged(); }
    catch (err) { fail(err, "Хадгалж чадсангүй."); }
  }
  async function replaceImage(w: ProgramWork, f: File | undefined) {
    if (!f) return; setError("");
    try { await api.programs.works.setImage(w.id, f); onChanged(); } catch (err) { fail(err, "Зураг солиж чадсангүй."); }
  }
  async function remove(w: ProgramWork) {
    if (!confirm(`«${w.title}» бүтээлийг устгах уу?`)) return;
    try { await api.programs.works.remove(w.id); onChanged(); } catch { setError("Устгаж чадсангүй."); }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy">Бүтээлийн булан ({works.length})</h2>
        <Button type="button" variant="secondary" onClick={() => setAdding(true)}>Бүтээл нэмэх</Button>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {works.length === 0 ? <Empty>Бүтээл байхгүй.</Empty> : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((w, i) => (
            <li key={w.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
              <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-slate-100"><Image src={w.image} alt="" fill unoptimized sizes="300px" className="object-cover" /></span>
              {editing?.id === w.id ? (
                <form onSubmit={saveEdit} className="flex flex-col gap-2">
                  <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={160} aria-label="Гарчиг" autoFocus />
                  <Input value={editing.student} onChange={(e) => setEditing({ ...editing, student: e.target.value })} maxLength={120} aria-label="Сурагч" placeholder="Сурагч" />
                  <Input value={editing.caption} onChange={(e) => setEditing({ ...editing, caption: e.target.value })} maxLength={280} aria-label="Тайлбар" placeholder="Тайлбар" />
                  <span className="flex gap-2"><Button type="submit">OK</Button><Button type="button" variant="ghost" onClick={() => setEditing(null)}>✕</Button></span>
                </form>
              ) : (
                <>
                  <span className="font-semibold text-slate-900">{w.title}</span>
                  {w.student && <span className="text-sm text-slate-600">{w.student}</span>}
                  {w.caption && <span className="text-xs text-slate-500">{w.caption}</span>}
                </>
              )}
              <span className="mt-auto flex items-center gap-1 pt-1">
                <button type="button" onClick={() => move(i, -1)} disabled={moving || i === 0} className="px-1 text-navy disabled:opacity-30" aria-label="Дээш">▲</button>
                <button type="button" onClick={() => move(i, 1)} disabled={moving || i === works.length - 1} className="px-1 text-navy disabled:opacity-30" aria-label="Доош">▼</button>
                <label className={`${iconBtn} cursor-pointer text-navy`} title="Зураг солих"><span aria-hidden="true">🖼</span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Зураг солих" onChange={(e) => { replaceImage(w, e.target.files?.[0]); e.target.value = ""; }} /></label>
                <button type="button" onClick={() => setEditing({ id: w.id, title: w.title, student: w.student, caption: w.caption })} className={`${iconBtn} text-navy`} aria-label="Засах" title="Засах">✎</button>
                <button type="button" onClick={() => remove(w)} className={`${iconBtn} ml-auto text-red-600 hover:bg-red-50`} aria-label="Устгах" title="Устгах">🗑</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {adding && <WorkDialog programId={programId} open onClose={() => setAdding(false)} onSaved={onChanged} />}
    </Card>
  );
}
