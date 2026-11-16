"use client";

/* Сонгосон тэнхимийн харьяалагдах удирдлага: сонгоход шууд хадгална (PATCH leader_id). Харьяалалгүй тэнхим олон нийтийн бүтцийн диаграмд гарахгүй. */

import { useState } from "react";
import { Card, Field, Select } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AboutDepartment, AboutLeader } from "@/lib/types";

export function DepartmentLeaderSelect({ department, leaders, onChanged }: { department: AboutDepartment; leaders: AboutLeader[]; onChanged: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(v: string) {
    setBusy(true); setError("");
    try { await api.about.departments.setLeader(department.id, v ? Number(v) : null); onChanged(); }
    catch (err) { setError(err instanceof ApiError ? (err.fieldErrors.leader_id ?? err.message) : "Хадгалж чадсангүй."); }
    finally { setBusy(false); }
  }

  return (
    <Card>
      <Field label="Харьяалагдах удирдлага" error={error} hint="Олон нийтийн хуудасны бүтцийн диаграмд сонгосон хүний доор гарна.">
        <Select value={department.leader_id ?? ""} disabled={busy} onChange={(e) => void pick(e.target.value)}>
          <option value="">— Харьяалалгүй (диаграмд гарахгүй)</option>
          {leaders.map((l) => <option key={l.id} value={l.id}>{l.full_name} — {l.position}</option>)}
        </Select>
      </Field>
    </Card>
  );
}
