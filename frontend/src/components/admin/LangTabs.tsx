"use client";

/* Админ засварлагчдын "Монгол | English" таб (мэдээ, хөтөлбөр, бидний тухай). Англи хэсэг бөглөгдсөн эсэхийг шошгон дээр
   харуулна: "English ✓" / "English: хоосон". Агуулгыг дуудагч тал `value`-ээр нууж/харуулна (RichText-ийг хоёуланг нь mount хэвээр). */

import type { Lang } from "@/lib/i18n";

export function LangTabs({ value, onChange, enFilled }: { value: Lang; onChange: (l: Lang) => void; enFilled: boolean }) {
  const tab = (l: Lang, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={value === l}
      onClick={() => onChange(l)}
      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-navy aria-selected:bg-navy aria-selected:text-white"
    >
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label="Хэл" className="inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
      {tab("mn", "Монгол")}
      {tab("en", enFilled ? "English ✓" : "English: хоосон")}
    </div>
  );
}

/** Таб идэвхгүй үед агуулгыг нууна (mount хэвээр — Tiptap-ийн төлөв алдагдахгүй). */
export const langPane = (active: boolean) => (active ? "space-y-4" : "hidden");
