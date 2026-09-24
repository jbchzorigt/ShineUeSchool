"use client";

/* Баруун багана: сонгосон тэнхимийн багш нар — нэр, хичээл/албан тушаал, Эрхлэгч checkbox (шууд PATCH), ▲▼, ✎ inline, 🗑;
   доор "Багш нэмэх" мөр. Жагсаалт backend-ийн эрэмбээр (эрхлэгч эхэнд) ирдэг тул мутаци бүрийн дараа onChanged. */

import { useState, type FormEvent } from "react";
import { Button, Card, Empty, Input, Table, Td, Th } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AboutDepartment, AboutTeacher, AboutTeacherInput } from "@/lib/types";

const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base transition hover:bg-navy/10";
const EMPTY: AboutTeacherInput = { full_name: "", role: "", is_head: false };

export function TeacherTable({ department, onChanged }: { department: AboutDepartment; onChanged: () => void }) {
  const [draft, setDraft] = useState<AboutTeacherInput>(EMPTY);
  const [editing, setEditing] = useState<(AboutTeacherInput & { id: number }) | null>(null);
  const [error, setError] = useState("");
  const list = department.teachers;

  const fail = (err: unknown, fallback: string) => setError(err instanceof ApiError ? (err.fieldErrors.full_name ?? err.message) : fallback);

  async function add(e: FormEvent) {
    e.preventDefault(); setError("");
    try { await api.about.teachers.create(department.id, { ...draft, full_name: draft.full_name.trim(), role: draft.role.trim() }); setDraft(EMPTY); onChanged(); }
    catch (err) { fail(err, "Нэмж чадсангүй."); }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    try { await api.about.teachers.update(editing.id, { full_name: editing.full_name.trim(), role: editing.role.trim() }); setEditing(null); onChanged(); }
    catch (err) { fail(err, "Хадгалж чадсангүй."); }
  }

  async function toggleHead(t: AboutTeacher) {
    setError("");
    try { await api.about.teachers.update(t.id, { is_head: !t.is_head }); onChanged(); } catch (err) { fail(err, "Хадгалж чадсангүй."); }
  }

  async function move(i: number, dir: -1 | 1) {
    const ids = list.map((t) => t.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await api.about.teachers.reorder(department.id, ids); onChanged(); } catch { setError("Эрэмбийг хадгалж чадсангүй."); }
  }

  async function remove(t: AboutTeacher) {
    if (!confirm(`«${t.full_name}» багшийг устгах уу?`)) return;
    try { await api.about.teachers.remove(t.id); onChanged(); } catch { setError("Устгаж чадсангүй."); }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-bold text-navy">{department.name} — багш нар</h2>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {list.length === 0 ? <Empty>Багш байхгүй.</Empty> : (
        <Table head={<><Th></Th><Th>Нэр</Th><Th>Хичээл / албан тушаал</Th><Th>Эрхлэгч</Th><Th></Th></>}>
          {list.map((t, i) => (
            <tr key={t.id}>
              <Td className="whitespace-nowrap">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-navy disabled:opacity-30" aria-label="Дээш">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === list.length - 1} className="px-1 text-navy disabled:opacity-30" aria-label="Доош">▼</button>
              </Td>
              {editing?.id === t.id ? (
                <Td className="space-y-1" colSpan={2}>
                  <form id={`edit-${t.id}`} onSubmit={saveEdit} className="flex flex-wrap items-center gap-2">
                    <Input value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} maxLength={120} aria-label="Нэр" autoFocus />
                    <Input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} maxLength={120} aria-label="Хичээл / албан тушаал" placeholder="Математикийн багш" />
                    <Button type="submit">OK</Button>
                    <Button type="button" variant="ghost" onClick={() => setEditing(null)}>✕</Button>
                  </form>
                </Td>
              ) : (
                <>
                  <Td className={t.is_head ? "font-semibold text-navy" : "font-semibold"}>{t.full_name}</Td>
                  <Td className="text-slate-600">{t.role}</Td>
                </>
              )}
              <Td><input type="checkbox" checked={t.is_head} onChange={() => toggleHead(t)} aria-label={`${t.full_name} эрхлэгч`} className="h-4 w-4 accent-navy" /></Td>
              <Td className="whitespace-nowrap text-right">
                <button type="button" onClick={() => setEditing({ id: t.id, full_name: t.full_name, role: t.role, is_head: t.is_head })} className={`${iconBtn} text-navy`} aria-label="Засах" title="Засах">✎</button>
                <button type="button" onClick={() => remove(t)} className={`${iconBtn} text-red-600 hover:bg-red-50`} aria-label="Устгах" title="Устгах">🗑</button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <form onSubmit={add} className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
        <Input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} placeholder="Овог, нэр" maxLength={120} aria-label="Багшийн нэр" className="max-w-56" />
        <Input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="Хичээл / албан тушаал" maxLength={120} aria-label="Хичээл / албан тушаал" className="max-w-64" />
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={draft.is_head} onChange={(e) => setDraft({ ...draft, is_head: e.target.checked })} className="h-4 w-4 accent-navy" />Эрхлэгч</label>
        <Button type="submit" disabled={!draft.full_name.trim()}>Багш нэмэх</Button>
      </form>
    </Card>
  );
}
