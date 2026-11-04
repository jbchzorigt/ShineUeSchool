"use client";

/* Хөтөлбөрийн хүснэгт: ▲▼ дараалал, cover, нэр + badge + slug, анги, бүтээл/тэтгэлгийн тоо, Нийтлээгүй badge, icon үйлдлүүд. */

import Image from "next/image";
import Link from "next/link";
import { Badge, Table, Td, Th } from "@/components/ui";
import { getDict } from "@/lib/i18n";

const gradeRange = getDict("mn").programs.gradeRange;   // админ монголоор
import { api, ApiError } from "@/lib/api";
import type { ProgramAdmin } from "@/lib/types";
import { DeleteButton, EditLabel, MoveButton, actionBtn } from "@/components/admin/ActionLabel";

const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base transition hover:bg-navy/10";

export function ProgramTable({ programs, onEdit, onChanged }: { programs: ProgramAdmin[]; onEdit: (p: ProgramAdmin) => void; onChanged: () => void }) {
  async function move(i: number, dir: -1 | 1) {
    const ids = programs.map((p) => p.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await api.programs.reorder(ids); onChanged(); } catch { alert("Эрэмбийг хадгалж чадсангүй."); }
  }
  async function remove(p: ProgramAdmin) {
    if (!confirm(`«${p.name}» хөтөлбөр, ${p.works_count} бүтээл, ${p.scholarships_count} тэтгэлгийн бичлэгийг устгах уу?`)) return;
    try { await api.programs.remove(p.id); onChanged(); } catch (e) { alert(e instanceof ApiError ? e.message : "Устгаж чадсангүй."); }
  }
  return (
    <Table head={<><Th></Th><Th>Хөтөлбөр</Th><Th>Анги</Th><Th>Бүтээл</Th><Th>Тэтгэлэг</Th><Th></Th><Th></Th></>}>
      {programs.map((p, i) => (
        <tr key={p.id}>
          <Td className="whitespace-nowrap">
            <MoveButton dir="up" onClick={() => move(i, -1)} disabled={i === 0} />
            <MoveButton dir="down" onClick={() => move(i, 1)} disabled={i === programs.length - 1} />
          </Td>
          <Td>
            <span className="flex items-center gap-3">
              <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md bg-navy">
                {p.cover_image && <Image src={p.cover_image} alt="" fill unoptimized sizes="64px" className="object-cover" />}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2"><span className="font-semibold text-navy">{p.name}</span><Badge tone="navy">{p.badge}</Badge></span>
                <span className="block text-xs text-slate-500">/programs/{p.slug}</span>
              </span>
            </span>
          </Td>
          <Td className="whitespace-nowrap">{gradeRange(p.grade_from, p.grade_to)}</Td>
          <Td>{p.works_count}</Td>
          <Td>{p.scholarships_count}</Td>
          <Td>{!p.is_published && <Badge tone="gold">Нийтлээгүй</Badge>}</Td>
          <Td className="whitespace-nowrap text-right">
            <button type="button" onClick={() => onEdit(p)} className={`${actionBtn} text-navy hover:bg-navy/10`}><EditLabel /></button>
            <Link href={`/admin/programs/${p.id}`} className={`${iconBtn} text-navy`} aria-label="Бүтээл, тэтгэлэг" title="Бүтээл, тэтгэлэг">☷</Link>
            <DeleteButton onClick={() => remove(p)} />
          </Td>
        </tr>
      ))}
    </Table>
  );
}
