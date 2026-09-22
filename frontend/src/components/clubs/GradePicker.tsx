"use client";

/* 1–12-р анги сонгох товчнууд; утсан дээр хэвтээ гүйлгэнэ. null = бүх анги. */

import { GRADES } from "./format";

export function GradePicker({ value, onChange }: { value: number | null; onChange: (g: number | null) => void }) {
  const btn = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? "border-navy bg-navy text-white" : "border-line bg-white text-navy hover:bg-navy/10"}`;
  return (
    <div role="group" aria-label="Анги сонгох" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      <button type="button" className={btn(value === null)} aria-pressed={value === null} onClick={() => onChange(null)}>Бүх анги</button>
      {GRADES.map((g) => (
        <button key={g} type="button" className={btn(value === g)} aria-pressed={value === g} onClick={() => onChange(g)}>{g}-р анги</button>
      ))}
    </div>
  );
}
