"use client";

/* Ээлжийн мөр: сонгох, шинэ, нэр засах, идэвхжүүлэх, устгах, Excel татах. */

import { useState } from "react";
import { Badge, Button, Input, Select } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { ClubRound } from "@/lib/types";

export function RoundBar({ rounds, current, onSelect, onChanged }: {
  rounds: ClubRound[]; current: ClubRound | null; onSelect: (id: number) => void; onChanged: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "new" | "rename">("idle");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, fallback: string) {
    setBusy(true); setError("");
    try { await fn(); onChanged(); setMode("idle"); }
    catch (e) { setError(e instanceof ApiError ? (e.fieldErrors.name ?? e.message) : fallback); }
    finally { setBusy(false); }
  }

  async function download() {
    if (!current) return;
    try {
      const blob = await api.clubsAdmin.rounds.downloadXlsx(current.id);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `clubs-${current.id}.xlsx`; a.click();
      URL.revokeObjectURL(a.href);
    } catch { alert("Excel татаж чадсангүй."); }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={current?.id ?? ""} onChange={(e) => onSelect(Number(e.target.value))} className="w-auto min-w-56" aria-label="Ээлж">
          {rounds.map((r) => <option key={r.id} value={r.id}>{r.name}{r.is_active ? " ✓" : ""}</option>)}
        </Select>
        {current?.is_active && <Badge tone="green">Идэвхтэй</Badge>}
        {current && <span className="text-sm text-slate-600">{current.clubs_count} дугуйлан · {current.registrations_count} бүртгэл</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => { setMode("new"); setName(""); setError(""); }}>+ Шинэ ээлж</Button>
          {current && (
            <>
              <Button variant="ghost" onClick={() => { setMode("rename"); setName(current.name); setError(""); }}>Нэр засах</Button>
              {!current.is_active && (
                <Button variant="secondary" onClick={() => confirm("Энэ ээлжийг идэвхжүүлэх үү? Бусад ээлж идэвхгүй болно.") &&
                  run(() => api.clubsAdmin.rounds.update(current.id, { is_active: true }), "Идэвхжүүлж чадсангүй.")}>Идэвхжүүлэх</Button>
              )}
              <Button variant="ghost" onClick={download}>Excel татах</Button>
              <Button variant="danger" onClick={() => confirm(`«${current.name}» ээлжийг устгах уу? Дугуйлангууд нь устана.`) &&
                run(() => api.clubsAdmin.rounds.remove(current.id), "Устгаж чадсангүй.")}>Устгах</Button>
            </>
          )}
        </div>
      </div>
      {mode !== "idle" && (
        <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault();
          run(() => mode === "new" ? api.clubsAdmin.rounds.create(name.trim()) : api.clubsAdmin.rounds.update(current!.id, { name: name.trim() }), "Хадгалж чадсангүй."); }}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ээлжийн нэр (ж: 2026–2027 намар)" maxLength={120} className="w-auto min-w-72" autoFocus required />
          <Button type="submit" disabled={busy}>{mode === "new" ? "Үүсгэх" : "Хадгалах"}</Button>
          <Button variant="ghost" type="button" onClick={() => setMode("idle")}>Болих</Button>
        </form>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
