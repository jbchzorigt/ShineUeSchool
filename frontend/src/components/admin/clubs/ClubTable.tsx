"use client";

/* Ээлжийн дугуйлангийн хүснэгт: эрэмбэ ▲▼, слотын progress bar, төлөв, icon үйлдлүүд (засах, бүртгэл/зураг, устгах). */

import Link from "next/link";
import { Badge, Table, Td, Th } from "@/components/ui";
import { STATE_LABEL, STATE_TONE, formatFee, formatGrades, formatPeriod } from "@/components/clubs/format";
import { api, ApiError } from "@/lib/api";
import type { ClubAdmin } from "@/lib/types";
import { QuotaRows } from "@/components/clubs/QuotaRows";
import { ClipboardList } from "lucide-react";
import { DeleteLabel, EditLabel, actionBtn } from "@/components/admin/ActionLabel";


export function ClubTable({ clubs, onEdit, onChanged }: { clubs: ClubAdmin[]; onEdit: (c: ClubAdmin) => void; onChanged: () => void }) {
  async function move(i: number, dir: -1 | 1) {
    const ids = clubs.map((c) => c.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await api.clubsAdmin.clubs.reorder(clubs[0].round_id, ids); onChanged(); } catch { alert("Эрэмбийг хадгалж чадсангүй."); }
  }

  async function remove(c: ClubAdmin) {
    if (!confirm(`«${c.name}» дугуйланг устгах уу?`)) return;
    try { await api.clubsAdmin.clubs.remove(c.id); onChanged(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Устгаж чадсангүй."); }
  }

  return (
    <Table head={<><Th></Th><Th>Нэр</Th><Th>Анги</Th><Th>Бүртгэл</Th><Th>Нийт</Th><Th>Төлбөр</Th><Th>Хугацаа</Th><Th>Төлөв</Th><Th></Th></>}>
      {clubs.map((c, i) => (
        <tr key={c.id}>
          <Td className="whitespace-nowrap">
            <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-navy disabled:opacity-30" aria-label="Дээш">▲</button>
            <button onClick={() => move(i, 1)} disabled={i === clubs.length - 1} className="px-1 text-navy disabled:opacity-30" aria-label="Доош">▼</button>
          </Td>
          <Td className="font-semibold text-navy">{c.name}</Td>
          <Td>{formatGrades(c.grades)}</Td>
          <Td className="min-w-44"><QuotaRows quotas={c.quotas} total={false} compact /></Td>
          <Td className="whitespace-nowrap"><span className="font-semibold">{c.taken}</span>/{c.capacity}</Td>
          <Td>{formatFee(c)}</Td>
          <Td className="whitespace-nowrap text-xs">{formatPeriod(c)}</Td>
          <Td className="space-x-1 whitespace-nowrap">
            <Badge tone={STATE_TONE[c.state]}>{STATE_LABEL[c.state]}</Badge>
            {!c.is_published && <Badge tone="gold">Нийтлээгүй</Badge>}
          </Td>
          <Td className="whitespace-nowrap text-right">
            <button type="button" onClick={() => onEdit(c)} className={`${actionBtn} text-navy hover:bg-navy/10`}><EditLabel /></button>
            <Link href={`/admin/clubs/${c.id}`} className={`${actionBtn} text-navy hover:bg-navy/10`}>
              <ClipboardList size={15} strokeWidth={2.2} aria-hidden="true" className="shrink-0" />Бүртгэл, зураг
            </Link>
            <button type="button" onClick={() => remove(c)} className={`${actionBtn} text-red-600 hover:bg-red-50`}><DeleteLabel /></button>
          </Td>
        </tr>
      ))}
    </Table>
  );
}
