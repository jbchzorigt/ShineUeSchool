"use client";

/* Зүүн багана: тэнхимийн жагсаалт (сонгох, inline нэр засах, ▲▼, устгах), доор "Тэнхим нэмэх" мөр. */

import { useState, type FormEvent } from "react";
import { Button, Card, Empty, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AboutDepartment } from "@/lib/types";

const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base transition hover:bg-navy/10";

export function DepartmentList({ departments, selectedId, onSelect, onChanged }: {
  departments: AboutDepartment[]; selectedId: number | null; onSelect: (id: number) => void; onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [error, setError] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    try { const d = await api.about.departments.create(newName.trim()); setNewName(""); onChanged(); onSelect(d.id); }
    catch (err) { setError(err instanceof ApiError ? (err.fieldErrors.name ?? err.message) : "Нэмж чадсангүй."); }
  }

  async function rename(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    try { await api.about.departments.update(editing.id, editing.name.trim()); setEditing(null); onChanged(); }
    catch (err) { setError(err instanceof ApiError ? (err.fieldErrors.name ?? err.message) : "Хадгалж чадсангүй."); }
  }

  async function move(i: number, dir: -1 | 1) {
    const ids = departments.map((d) => d.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await api.about.departments.reorder(ids); onChanged(); } catch { setError("Эрэмбийг хадгалж чадсангүй."); }
  }

  async function remove(d: AboutDepartment) {
    if (!confirm(`«${d.name}» тэнхим болон ${d.teachers.length} багшийг устгах уу?`)) return;
    try { await api.about.departments.remove(d.id); onChanged(); } catch { setError("Устгаж чадсангүй."); }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-bold text-navy">Тэнхимүүд</h2>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {departments.length === 0 ? <Empty>Тэнхим нэмнэ үү.</Empty> : (
        <ul className="divide-y divide-slate-200">
          {departments.map((d, i) => (
            <li key={d.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${d.id === selectedId ? "bg-navy/10" : ""}`}>
              <span className="whitespace-nowrap">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-navy disabled:opacity-30" aria-label="Дээш">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === departments.length - 1} className="px-1 text-navy disabled:opacity-30" aria-label="Доош">▼</button>
              </span>
              {editing?.id === d.id ? (
                <form onSubmit={rename} className="flex flex-1 items-center gap-1">
                  <Input value={editing.name} onChange={(e) => setEditing({ id: d.id, name: e.target.value })} maxLength={120} autoFocus aria-label="Тэнхимийн нэр" />
                  <Button type="submit">OK</Button>
                  <Button type="button" variant="ghost" onClick={() => setEditing(null)}>✕</Button>
                </form>
              ) : (
                <button type="button" onClick={() => onSelect(d.id)} className={`min-w-0 flex-1 truncate text-left font-semibold ${d.id === selectedId ? "text-navy" : "text-slate-800"}`}>
                  {d.name} <span className="text-xs font-normal text-slate-500">({d.teachers.length})</span>
                </button>
              )}
              <span className="whitespace-nowrap">
                <button type="button" onClick={() => setEditing({ id: d.id, name: d.name })} className={`${iconBtn} text-navy`} aria-label="Нэр засах" title="Нэр засах">✎</button>
                <button type="button" onClick={() => remove(d)} className={`${iconBtn} text-red-600 hover:bg-red-50`} aria-label="Устгах" title="Устгах">🗑</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex items-center gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Шинэ тэнхимийн нэр" maxLength={120} aria-label="Шинэ тэнхимийн нэр" />
        <Button type="submit" disabled={!newName.trim()}>Нэмэх</Button>
      </form>
    </Card>
  );
}
