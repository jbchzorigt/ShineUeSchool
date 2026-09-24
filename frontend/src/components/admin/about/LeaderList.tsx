"use client";

/* Түвшин бүрт нэг блок (levels prop — хуудас тооцно); блок бүрт гишүүдийн мөр (зураг, нэр, албан тушаал, ▲▼, ✎, 🗑).
   ▲▼ → бүх жагсаалтыг reorder. Хоосон хамгийн доод түвшинг ✕-ээр хаана; «Түвшин нэмэх» доор. */

import Image from "next/image";
import { Button, Card, Empty } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AboutLeader } from "@/lib/types";

const LEVEL_HINT: Record<number, string> = { 1: "захирал", 2: "дэд захирлууд", 3: "менежерүүд" };
const levelLabel = (lv: number) => `${lv}-р түвшин${LEVEL_HINT[lv] ? ` (${LEVEL_HINT[lv]})` : ""}`;
const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base transition hover:bg-navy/10";

export function LeaderList({ leaders, levels, canAddLevel, onAdd, onAddLevel, onRemoveLevel, onEdit, onChanged }: {
  leaders: AboutLeader[]; levels: number[]; canAddLevel: boolean; onAdd: (level: number) => void; onAddLevel: () => void;
  onRemoveLevel: (level: number) => void; onEdit: (l: AboutLeader) => void; onChanged: () => void;
}) {
  const maxUsed = Math.max(0, ...leaders.map((l) => l.level));
  async function move(level: number, i: number, dir: -1 | 1) {
    const row = leaders.filter((l) => l.level === level);
    const j = i + dir;
    if (j < 0 || j >= row.length) return;
    [row[i], row[j]] = [row[j], row[i]];
    const items = levels.flatMap((lv) => (lv === level ? row : leaders.filter((l) => l.level === lv)).map((l, k) => ({ id: l.id, level: lv, order: k + 1 })));
    try { await api.about.leaders.reorder(items); onChanged(); } catch { alert("Эрэмбийг хадгалж чадсангүй."); }
  }

  async function remove(l: AboutLeader) {
    if (!confirm(`«${l.full_name}» гишүүнийг устгах уу?`)) return;
    try { await api.about.leaders.remove(l.id); onChanged(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Устгаж чадсангүй."); }
  }

  return (
    <div className="space-y-6">
      {levels.map((level) => {
        const row = leaders.filter((l) => l.level === level);
        const removable = row.length === 0 && level > maxUsed && level === levels[levels.length - 1] && level > 1;   // хоосон хамгийн доод түвшин
        return (
          <Card key={level} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-navy">{levelLabel(level)}</h2>
              <span className="flex items-center gap-1">
                <Button type="button" variant="secondary" onClick={() => onAdd(level)}>Гишүүн нэмэх</Button>
                {removable && <button type="button" onClick={() => onRemoveLevel(level)} className={`${iconBtn} text-slate-500`} aria-label="Хоосон түвшинг хаах" title="Хоосон түвшинг хаах">✕</button>}
              </span>
            </div>
            {row.length === 0 ? <Empty>Гишүүн байхгүй.</Empty> : (
              <ul className="divide-y divide-slate-200">
                {row.map((l, i) => (
                  <li key={l.id} className="flex items-center gap-3 py-2">
                    <span className="whitespace-nowrap">
                      <button onClick={() => move(level, i, -1)} disabled={i === 0} className="px-1 text-navy disabled:opacity-30" aria-label="Дээш">▲</button>
                      <button onClick={() => move(level, i, 1)} disabled={i === row.length - 1} className="px-1 text-navy disabled:opacity-30" aria-label="Доош">▼</button>
                    </span>
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-navy text-center font-bold leading-10 text-gold">
                      {l.photo ? <Image src={l.photo} alt="" fill unoptimized sizes="40px" className="object-cover" /> : l.full_name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-900">{l.full_name}</span>
                      <span className="block truncate text-sm text-slate-600">{l.position}</span>
                    </span>
                    <span className="whitespace-nowrap">
                      <button type="button" onClick={() => onEdit(l)} className={`${iconBtn} text-navy`} aria-label="Засах" title="Засах">✎</button>
                      <button type="button" onClick={() => remove(l)} className={`${iconBtn} text-red-600 hover:bg-red-50`} aria-label="Устгах" title="Устгах">🗑</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
      <Button type="button" variant="ghost" onClick={onAddLevel} disabled={!canAddLevel} title={canAddLevel ? undefined : "Хамгийн ихдээ 10 түвшин"}>+ Түвшин нэмэх</Button>
    </div>
  );
}
