"use client";

import type { AcademicYear } from "@/lib/types";

export function YearSelect({ years, value, onChange, className = "" }: { years: AcademicYear[]; value: number | null; onChange: (id: number) => void; className?: string }) {
  if (years.length === 0) return null;
  return (
    <select value={value ?? ""} onChange={(e) => onChange(Number(e.target.value))} aria-label="Хичээлийн жил"
            className={`rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30 ${className}`}>
      {years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.is_current ? " (одоогийн)" : ""}</option>)}
    </select>
  );
}
