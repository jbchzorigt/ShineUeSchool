/* datetime-local ↔ ISO (локал цагаар). */

const pad = (n: number) => String(n).padStart(2, "0");

export function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(s: string): string {
  return s ? new Date(s).toISOString() : "";
}
