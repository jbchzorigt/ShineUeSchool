"use client";

/* Дугуйлангийн хуудасны client хэсэг: анги сонгох (?grade= URL-д), картууд, бүртгэлийн диалог. */

import { useState } from "react";
import { Empty } from "@/components/ui";
import type { Club, ClubsResponse } from "@/lib/types";
import { ClubCard } from "./ClubCard";
import { GradePicker } from "./GradePicker";
import { RegisterDialog } from "./RegisterDialog";

export function ClubsPage({ data, initialGrade }: { data: ClubsResponse | null; initialGrade: number | null }) {
  const [grade, setGrade] = useState<number | null>(initialGrade);
  const [target, setTarget] = useState<Club | null>(null);

  function pick(g: number | null) {
    setGrade(g);
    const url = new URL(window.location.href);
    if (g === null) url.searchParams.delete("grade"); else url.searchParams.set("grade", String(g));
    window.history.replaceState(null, "", url);
  }

  if (!data) return <Empty>Мэдээлэл түр байхгүй. Дараа дахин оролдоно уу.</Empty>;
  if (!data.round) return <Empty>Одоогоор зарлагдсан дугуйлан байхгүй.</Empty>;
  const clubs = grade === null ? data.clubs : data.clubs.filter((c) => c.grades.includes(grade));

  return (
    <div className="space-y-6">
      <p className="text-base text-muted">{data.round.name}</p>
      <GradePicker value={grade} onChange={pick} />
      {clubs.length === 0 ? (
        <Empty>{grade === null ? "Одоогоор зарлагдсан дугуйлан байхгүй." : `${grade}-р ангид зарлагдсан дугуйлан байхгүй.`}</Empty>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {clubs.map((c) => <ClubCard key={c.id} club={c} selectedGrade={grade} onRegister={setTarget} />)}
        </div>
      )}
      <RegisterDialog key={target?.id ?? "none"} club={target} grade={grade} onClose={() => setTarget(null)} />
    </div>
  );
}
