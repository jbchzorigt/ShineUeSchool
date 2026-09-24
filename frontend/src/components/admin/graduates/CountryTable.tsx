"use client";

/* Улсуудын хүснэгт: ▲▼ дараалал (нүүрний чипүүдийн дараалал), тивийн өнгөт цэг + нэр, сургуулиудын тоо/нэрс, засах, устгах. */

import { useState } from "react";
import { Table, Td, Th } from "@/components/ui";
import { CONTINENTS } from "@/lib/home-data";
import { api, ApiError } from "@/lib/api";
import type { GraduateDestination } from "@/lib/types";

const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base transition hover:bg-navy/10";

export function CountryTable({ items, onEdit, onChanged }: { items: GraduateDestination[]; onEdit: (d: GraduateDestination) => void; onChanged: () => void }) {
  const [moving, setMoving] = useState(false);
  async function move(i: number, dir: -1 | 1) {
    if (moving) return;
    const ids = items.map((d) => d.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setMoving(true);
    try { await api.graduates.reorder(ids); onChanged(); } catch { alert("Эрэмбийг хадгалж чадсангүй."); } finally { setMoving(false); }
  }
  async function remove(d: GraduateDestination) {
    if (!confirm(`«${d.name}» улс, ${d.universities.length} сургуулийг устгах уу?`)) return;
    try { await api.graduates.remove(d.id); onChanged(); } catch (e) { alert(e instanceof ApiError ? e.message : "Устгаж чадсангүй."); }
  }
  return (
    <Table head={<><Th></Th><Th>Улс</Th><Th>Тив</Th><Th>Сургуулиуд</Th><Th></Th></>}>
      {items.map((d, i) => (
        <tr key={d.id}>
          <Td className="whitespace-nowrap">
            <button type="button" onClick={() => move(i, -1)} disabled={moving || i === 0} className="px-1 text-navy disabled:opacity-30" aria-label="Дээш">▲</button>
            <button type="button" onClick={() => move(i, 1)} disabled={moving || i === items.length - 1} className="px-1 text-navy disabled:opacity-30" aria-label="Доош">▼</button>
          </Td>
          <Td className="whitespace-nowrap font-semibold text-navy">{d.name} <span className="text-xs font-normal text-slate-400">{d.code}</span></Td>
          <Td className="whitespace-nowrap">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CONTINENTS[d.continent].color }} aria-hidden="true" />{CONTINENTS[d.continent].name}</span>
          </Td>
          <Td>
            <span className="block text-sm text-slate-700">{d.universities.slice(0, 3).join(" · ")}{d.universities.length > 3 ? ` · +${d.universities.length - 3}` : ""}</span>
            <span className="text-xs text-slate-400">{d.universities.length} сургууль</span>
          </Td>
          <Td className="whitespace-nowrap text-right">
            <button type="button" onClick={() => onEdit(d)} className={`${iconBtn} text-navy`} aria-label="Засах" title="Засах">✎</button>
            <button type="button" onClick={() => remove(d)} className={`${iconBtn} text-red-600 hover:bg-red-50`} aria-label="Устгах" title="Устгах">🗑</button>
          </Td>
        </tr>
      ))}
    </Table>
  );
}
