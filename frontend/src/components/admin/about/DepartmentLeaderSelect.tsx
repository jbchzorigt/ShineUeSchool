"use client";

/* Сонгосон тэнхимийн харьяалагдах удирдлага: сонгоход шууд хадгална (PATCH leader_id). Харьяалалгүй тэнхим олон нийтийн бүтцийн диаграмд гарахгүй.
   Удирдлагын жагсаалт ачаалж дуустал (эсвэл ачаалах алдаатай үед) сонголт идэвхгүй — "Харьяалалгүй" гэж буруу харагдахгүй.
   Хуудас тэнхим солиход `key`-ээр шинэчилнэ (өмнөх тэнхимийн алдаа үлдэхгүй). */

import { useState } from "react";
import { Card, Field, Select } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AboutDepartment, AboutLeader } from "@/lib/types";

export function DepartmentLeaderSelect({ department, leaders, loadError, onChanged }: {
  department: AboutDepartment; leaders: AboutLeader[] | null; loadError?: string | null; onChanged: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(v: string) {
    setBusy(true); setError("");
    try { await api.about.departments.setLeader(department.id, v ? Number(v) : null); onChanged(); }
    catch (err) { setError(err instanceof ApiError ? (err.fieldErrors.leader_id ?? err.message) : "Хадгалж чадсангүй."); }
    finally { setBusy(false); }
  }

  const ready = leaders !== null;
  return (
    <Card>
      <Field label="Харьяалагдах удирдлага" error={error || (loadError ? `Удирдлагын жагсаалтыг ачаалж чадсангүй: ${loadError}` : "")}
             hint="Олон нийтийн хуудасны бүтцийн диаграмд сонгосон хүний доор гарна.">
        <Select value={ready ? (department.leader_id ?? "") : "loading"} disabled={busy || !ready} onChange={(e) => void pick(e.target.value)}>
          {!ready && <option value="loading">{loadError ? "—" : "Ачаалж байна…"}</option>}
          <option value="">— Харьяалалгүй (диаграмд гарахгүй)</option>
          {(leaders ?? []).map((l) => <option key={l.id} value={l.id}>{l.full_name} — {l.position}</option>)}
        </Select>
      </Field>
    </Card>
  );
}
