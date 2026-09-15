"use client";

/* Жижиг UI бүрдлүүд — Tailwind классуудыг нэг газар хадгална. */

import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

/* ---------- Button ---------- */
type Variant = "primary" | "secondary" | "danger" | "ghost";
const variants: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-navy/90 focus-visible:ring-navy",
  secondary: "bg-gold text-navy hover:bg-gold/90 focus-visible:ring-gold",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
  ghost: "bg-transparent text-navy hover:bg-navy/10 focus-visible:ring-navy",
};
export function Button({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...p}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant], className
      )}
    />
  );
}

/* ---------- Form талбарууд ---------- */
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30";

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}
export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(field, className)} />;
}
export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(field, "min-h-24", className)} />;
}
export function Select({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cx(field, className)} />;
}

/* ---------- Card / Badge / Spinner ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}>{children}</div>;
}
export function Badge({ children, tone = "navy" }: { children: ReactNode; tone?: "navy" | "gold" | "green" | "slate" }) {
  const tones = {
    navy: "bg-navy/10 text-navy",
    gold: "bg-gold/30 text-navy",
    green: "bg-emerald-100 text-emerald-800",
    slate: "bg-slate-100 text-slate-700",
  };
  return <span className={cx("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}
export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block h-5 w-5 animate-spin rounded-full border-2 border-navy/30 border-t-navy", className)} aria-label="Ачаалж байна" />;
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{children}</div>;
}

/* ---------- Modal ---------- */
export function Modal({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-navy">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Хаах">✕</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Table ---------- */
export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-navy text-xs uppercase tracking-wider text-white">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => <th className={cx("px-4 py-3 font-semibold", className)}>{children}</th>;
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cx("px-4 py-3 align-middle", className)}>{children}</td>;
