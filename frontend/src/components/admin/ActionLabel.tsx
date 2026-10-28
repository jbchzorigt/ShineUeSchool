/* Админы "Засах" / "Устгах" товчны агуулга: Lucide icon + текст хамт. <Button>-ий хүүхэд эсвэл actionBtn класстай <button>-д. */

import { Pencil, Trash2 } from "lucide-react";

/** Хүснэгтийн мөрийн жижиг үйлдлийн товч (icon + текст): өнгө, hover-ийг дуудагч нэмнэ. */
export const actionBtn = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition";

export function EditLabel({ text = "Засах" }: { text?: string }) {
  return <><Pencil size={15} strokeWidth={2.2} aria-hidden="true" className="shrink-0" />{text}</>;
}

export function DeleteLabel({ text = "Устгах" }: { text?: string }) {
  return <><Trash2 size={15} strokeWidth={2.2} aria-hidden="true" className="shrink-0" />{text}</>;
}
