"use client";

/* Хичээлийн жилийн сонголт: жагсаалтыг татаж, сонгосон жилийг localStorage-д санана.
   Сонгоогүй эсвэл сонгосон нь жагсаалтад байхгүй бол одоогийн (is_current) жил, тэр ч байхгүй бол эхнийх. */

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AcademicYear } from "@/lib/types";

const KEY = "shineue.tt.year";

function readStored(): number | null {
  if (typeof window === "undefined") return null;
  try { const v = localStorage.getItem(KEY); return v ? Number(v) : null; } catch { return null; }
}

export function useYear() {
  const yearsQ = useFetch(() => api.timetable.years.list(), []);
  const [chosen, setChosen] = useState<number | null>(readStored);
  const years = yearsQ.data ?? [];
  const year: AcademicYear | null = years.find((y) => y.id === chosen) ?? years.find((y) => y.is_current) ?? years[0] ?? null;
  const setYearId = useCallback((id: number) => {
    setChosen(id);
    try { localStorage.setItem(KEY, String(id)); } catch { /* хадгалах боломжгүй (private mode) — зүгээр */ }
  }, []);
  return { years, year, yearId: year?.id ?? null, setYearId, loading: yearsQ.loading, error: yearsQ.error, reload: yearsQ.reload };
}
