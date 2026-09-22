"use client";

/* Дугуйлангийн зургууд: олон файл сонгож дараалан upload, ▲▼ эрэмбэ, устгах. Хариу бүр ClubAdmin → onChanged. */

import Image from "next/image";
import { useState } from "react";
import { Button, Card, Empty } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { ClubAdmin } from "@/lib/types";

export function ImagesPanel({ club, onChanged }: { club: ClubAdmin; onChanged: (c: ClubAdmin) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError("");
    let latest = club;
    try {
      for (const f of Array.from(files)) { latest = await api.clubsAdmin.images.add(club.id, f); }
    } catch (e) { setError(e instanceof ApiError ? (e.fieldErrors.image ?? e.message) : "Зураг оруулж чадсангүй."); }
    finally { setBusy(false); if (latest !== club) onChanged(latest); }
  }

  async function move(i: number, dir: -1 | 1) {
    const ids = club.images.map((x) => x.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { onChanged(await api.clubsAdmin.images.reorder(club.id, ids)); } catch { setError("Эрэмбийг хадгалж чадсангүй."); }
  }

  async function remove(id: number) {
    if (!confirm("Зургийг устгах уу?")) return;
    try { onChanged(await api.clubsAdmin.images.remove(id)); } catch { setError("Устгаж чадсангүй."); }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">Зургууд</h2>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90">
          {busy ? "Оруулж байна…" : "+ Зураг оруулах"}
          <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {club.images.length === 0 ? <Empty>Зураг байхгүй. Эхний зураг картын нүүр зураг болно.</Empty> : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {club.images.map((img, i) => (
            <div key={img.id} className="space-y-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                <Image src={img.url} alt="" fill unoptimized className="object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-gold px-1.5 text-[10px] font-bold text-navy">НҮҮР</span>}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-navy disabled:opacity-30" aria-label="Өмнө">◀</button>
                <button onClick={() => move(i, 1)} disabled={i === club.images.length - 1} className="px-1 text-navy disabled:opacity-30" aria-label="Дараа">▶</button>
                <Button variant="danger" className="ml-auto px-2 py-1 text-xs" onClick={() => remove(img.id)}>Устгах</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
