"use client";

/* Дугуйлангийн удирдлага (manager): ээлж сонгох, дугуйлангийн хүснэгт, форм. */

import { useState } from "react";
import { Button, Empty, Spinner } from "@/components/ui";
import { ClubForm } from "@/components/admin/clubs/ClubForm";
import { ClubTable } from "@/components/admin/clubs/ClubTable";
import { RoundBar } from "@/components/admin/clubs/RoundBar";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { ClubAdmin } from "@/lib/types";

function initialRound(): number | null {
  if (typeof window === "undefined") return null;
  const v = Number(new URLSearchParams(window.location.search).get("round"));
  return v > 0 ? v : null;
}

export default function ClubsAdminPage() {
  const rounds = useFetch(() => api.clubsAdmin.rounds.list(), []);
  const [picked, setPicked] = useState<number | null>(initialRound);
  const [editing, setEditing] = useState<ClubAdmin | null | "new">(null);

  const list = rounds.data ?? [];
  const current = list.find((r) => r.id === picked) ?? list.find((r) => r.is_active) ?? list[0] ?? null;
  const clubs = useFetch(() => (current ? api.clubsAdmin.clubs.list(current.id) : null), [current?.id]);

  function select(id: number) {
    setPicked(id);
    const url = new URL(window.location.href);
    url.searchParams.set("round", String(id));
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">Дугуйлан</h1>
          <p className="text-sm text-slate-600">Ээлж тутамд дугуйлангуудыг зарлаж, бүртгэлийг удирдана. Олон нийтэд зөвхөн идэвхтэй ээлжийн нийтлэгдсэн дугуйлан харагдана.</p>
        </div>
        {current && <Button onClick={() => setEditing("new")}>+ Шинэ дугуйлан</Button>}
      </div>

      {rounds.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{rounds.error}</p>}
      {rounds.loading ? <Spinner /> : (
        <RoundBar rounds={list} current={current} onSelect={select} onChanged={() => { rounds.reload(); clubs.reload(); }} />
      )}

      {!rounds.loading && !current && <Empty>Ээлж байхгүй. «Шинэ ээлж» дарж эхэлнэ үү.</Empty>}
      {current && (clubs.loading ? <Spinner /> : clubs.error ? <p className="text-sm text-red-700">{clubs.error}</p> :
        !clubs.data?.length ? <Empty>Энэ ээлжид дугуйлан байхгүй.</Empty> :
        <ClubTable clubs={clubs.data} onEdit={setEditing} onChanged={() => { clubs.reload(); rounds.reload(); }} />)}

      {current && editing !== null && (
        <ClubForm key={editing === "new" ? "new" : editing.id} roundId={current.id} club={editing === "new" ? null : editing} open
                  onClose={() => setEditing(null)} onSaved={() => { clubs.reload(); rounds.reload(); }} />
      )}
    </div>
  );
}
