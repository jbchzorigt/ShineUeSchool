"use client";

/* Админы CRUD хуудсуудын давтагдах хэсэг: Modal-ын форм төлөв, устгах баталгаажуулалт, алдааны мөр. */

import { useState } from "react";
import { ApiError } from "@/lib/api";

export function useModalForm<T>() {
  const [editing, setEditing] = useState<{ id?: number; data: T } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const open = (data: T, id?: number) => { setErrors({}); setEditing({ id, data }); };
  const close = () => setEditing(null);
  const set = (patch: Partial<T>) => setEditing((e) => (e ? { ...e, data: { ...e.data, ...patch } } : e));

  /** fn(id, data): id байвал update, үгүй бол create. Амжилттай бол хаагаад after() дуудна. */
  async function submit(fn: (id: number | undefined, data: T) => Promise<unknown>, after: () => void) {
    if (!editing) return;
    setBusy(true); setErrors({});
    try {
      await fn(editing.id, editing.data);
      setEditing(null);
      after();
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }
  return { editing, errors, busy, open, close, set, submit };
}

export async function confirmRemove(message: string, fn: () => Promise<void>, after: () => void) {
  if (!confirm(message)) return;
  try { await fn(); after(); }
  catch (err) { alert(err instanceof ApiError ? Object.values(err.fieldErrors).join(" ") : "Устгаж чадсангүй."); }
}

export function FormError({ errors }: { errors: Record<string, string> }) {
  const msg = errors.non_field_errors ?? errors.detail;
  return msg ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p> : null;
}
