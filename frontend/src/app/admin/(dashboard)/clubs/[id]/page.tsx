"use client";

/* Дугуйлангийн дэлгэрэнгүй: толгой, зургууд, бүртгэлийн хүснэгт. */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Spinner, Table, Td, Th } from "@/components/ui";
import { ClubForm } from "@/components/admin/clubs/ClubForm";
import { ImagesPanel } from "@/components/admin/clubs/ImagesPanel";
import { RegistrationsTable } from "@/components/admin/clubs/RegistrationsTable";
import { SlotBar } from "@/components/clubs/SlotBar";
import { STATE_LABEL, STATE_TONE, formatFee, formatGrades, formatPeriod } from "@/components/clubs/format";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { ClubAdmin } from "@/lib/types";

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clubId = Number(id);
  // Дугуйлангийн GET endpoint байхгүй: ээлжүүдийг татаад тухайн дугуйланг олно (нэг удаа), дараа нь хариунуудаас шинэчилнэ
  const q = useFetch(async (): Promise<{ club: ClubAdmin; roundName: string }> => {
    const rounds = await api.clubsAdmin.rounds.list();
    for (const r of rounds) {
      const c = (await api.clubsAdmin.clubs.list(r.id)).find((x) => x.id === clubId);
      if (c) return { club: c, roundName: r.name };
    }
    throw new Error("Дугуйлан олдсонгүй.");
  }, [clubId]);
  const [override, setOverride] = useState<ClubAdmin | null>(null);
  const [editing, setEditing] = useState(false);
  const club = override ?? q.data?.club;
  const roundName = q.data?.roundName;

  if (q.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  if (!club) return <Spinner />;

  return (
    <div className="space-y-6">
      <Link href={`/admin/clubs?round=${club.round_id}`} className="text-sm font-semibold text-navy hover:underline">← Дугуйлангууд</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">{club.name}</h1>
          <p className="text-sm text-slate-600">{formatGrades(club.grades)} · {formatFee(club)} · {formatPeriod(club)}{roundName ? ` · ${roundName}` : ""}</p>
          <div className="mt-2 flex gap-2">
            <Badge tone={STATE_TONE[club.state]}>{STATE_LABEL[club.state]}</Badge>
            {!club.is_published && <Badge tone="gold">Нийтлээгүй</Badge>}
            <Badge tone="navy">Нийт {club.taken}/{club.capacity} бүртгэгдсэн</Badge>
          </div>
        </div>
        <Button variant="ghost" onClick={() => setEditing(true)}>Засах</Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-navy">Анги тутмын квот</h2>
        <Table head={<><Th>Анги</Th><Th>Квот</Th><Th>Бүртгэгдсэн</Th><Th>Сул</Th><Th className="w-48">Дүүргэлт</Th></>}>
          {club.quotas.map((q) => (
            <tr key={q.grade}>
              <Td className="font-semibold text-navy">{q.grade}-р анги</Td>
              <Td>{q.capacity}</Td>
              <Td>{q.taken}</Td>
              <Td>{q.full ? <Badge tone="red">Дүүрсэн</Badge> : q.slots_left}</Td>
              <Td><SlotBar taken={q.taken} capacity={q.capacity} /></Td>
            </tr>
          ))}
        </Table>
      </section>

      <ImagesPanel club={club} onChanged={setOverride} />

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-navy">Бүртгэл</h2>
        <RegistrationsTable club={club} onChanged={() => { setOverride(null); q.reload(); }} />
      </section>

      {editing && (
        <ClubForm key={club.id} roundId={club.round_id} club={club} open onClose={() => setEditing(false)}
                  onSaved={() => { setOverride(null); q.reload(); }} />
      )}
    </div>
  );
}
