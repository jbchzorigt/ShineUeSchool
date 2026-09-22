"use client";

/* Дугуйлангийн бүртгэлүүд: огноо, анги, сурагч, бүртгүүлэгч, утас, имэйл, төлсөн (төлбөртэй бол), хасах. */

import { Badge, Button, Empty, Spinner, Table, Td, Th } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { ClubAdmin } from "@/lib/types";

const fmt = (iso: string) => new Date(iso).toLocaleString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

export function RegistrationsTable({ club, onChanged }: { club: ClubAdmin; onChanged: () => void }) {
  const q = useFetch(() => api.clubsAdmin.registrations.list(club.id), [club.id, club.taken]);

  async function remove(id: number, name: string) {
    if (!confirm(`${name}-г дугуйлангаас хасах уу? Слот суларна.`)) return;
    try { await api.clubsAdmin.registrations.remove(id); q.reload(); onChanged(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Хасаж чадсангүй."); }
  }

  async function setPaid(id: number, v: boolean) {
    try { await api.clubsAdmin.registrations.setPaid(id, v); q.reload(); } catch { alert("Хадгалж чадсангүй."); }
  }

  if (q.loading) return <Spinner />;
  if (q.error) return <p className="text-sm text-red-700">{q.error}</p>;
  if (!q.data?.length) return <Empty>Бүртгэл байхгүй.</Empty>;

  return (
    <Table head={<><Th>Огноо</Th><Th>Анги</Th><Th>Сурагч</Th><Th>Бүртгүүлэгч</Th><Th>Утас</Th><Th>Имэйл</Th>{club.is_paid && <Th>Төлсөн</Th>}<Th></Th></>}>
      {q.data.map((r) => {
        const removed = r.status === "removed";
        return (
          <tr key={r.id} className={removed ? "text-slate-400" : ""}>
            <Td className="whitespace-nowrap text-xs">{fmt(r.created_at)}</Td>
            <Td>{r.grade}</Td>
            <Td className={removed ? "" : "font-semibold text-navy"}>{r.student_last_name} {r.student_first_name}</Td>
            <Td>{r.guardian_last_name} {r.guardian_first_name}</Td>
            <Td className="whitespace-nowrap">{r.phone}</Td>
            <Td>{r.email}</Td>
            {club.is_paid && <Td>{!removed && <input type="checkbox" checked={r.is_paid_marked} onChange={(e) => setPaid(r.id, e.target.checked)} aria-label="Төлсөн" />}</Td>}
            <Td className="whitespace-nowrap text-right">
              {removed ? <Badge tone="slate">Хасагдсан {r.removed_at ? fmt(r.removed_at) : ""}</Badge>
                       : <Button variant="danger" onClick={() => remove(r.id, `${r.student_last_name} ${r.student_first_name}`)}>Хасах</Button>}
            </Td>
          </tr>
        );
      })}
    </Table>
  );
}
