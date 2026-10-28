"use client";

/* Админы "Засах" / "Устгах" товчны агуулга: Lucide icon + текст хамт. <Button>-ий хүүхэд эсвэл actionBtn класстай <button>-д. */

import type { ButtonHTMLAttributes } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { READ_ONLY_HINT, useReadOnly } from "@/components/ui";

/** Хүснэгтийн мөрийн жижиг үйлдлийн товч (icon + текст): өнгө, hover-ийг дуудагч нэмнэ. */
export const actionBtn = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition";

export function EditLabel({ text = "Засах" }: { text?: string }) {
  return <><Pencil size={15} strokeWidth={2.2} aria-hidden="true" className="shrink-0" />{text}</>;
}

export function DeleteLabel({ text = "Устгах" }: { text?: string }) {
  return <><Trash2 size={15} strokeWidth={2.2} aria-hidden="true" className="shrink-0" />{text}</>;
}

/** Хүснэгтийн мөрийн "Устгах" товч (улаан, icon + текст); зөвхөн харах эрхтэй үед идэвхгүй. */
export function DeleteButton({ className = "", disabled, ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const readOnly = useReadOnly();
  return (
    <button type="button" {...p} disabled={disabled || readOnly} title={readOnly ? READ_ONLY_HINT : p.title}
      className={`${actionBtn} text-red-600 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50 ${className}`}><DeleteLabel /></button>
  );
}

/** Эрэмбэ солих ▲/▼ товч; зөвхөн харах эрхтэй үед идэвхгүй. */
export function MoveButton({ dir, onClick, disabled }: { dir: "up" | "down"; onClick: () => void; disabled?: boolean }) {
  const readOnly = useReadOnly();
  return (
    <button type="button" onClick={onClick} disabled={disabled || readOnly} title={readOnly ? READ_ONLY_HINT : undefined}
      className="px-1 text-navy disabled:opacity-30" aria-label={dir === "up" ? "Дээш" : "Доош"}>{dir === "up" ? "▲" : "▼"}</button>
  );
}
