/* Олимпиадын үр дүнгийн хүснэгтийн туслахууд: ангийн бодлогын тоо (багана), медалийн өнгө, оноо харуулах. Node test-д шууд ачаалагдана. */

export type MedalKind = "gold" | "silver" | "bronze";

/** Тухайн ангийн мөрүүдийн хамгийн урт `scores` — бодлогын баганын тоо (Б1…Бn) */
export const problemCount = (rows: { scores: (number | null)[] }[]): number => rows.reduce((n, r) => Math.max(n, r.scores?.length ?? 0), 0);

const KIND: Record<string, MedalKind> = { "АЛТ": "gold", "МӨНГӨ": "silver", "ХҮРЭЛ": "bronze" };

/** Медалийн талбар (АЛТ/МӨНГӨ/ХҮРЭЛ) → өнгө; медальгүй бол null */
export const medalKind = (medal: string): MedalKind | null => KIND[medal] ?? null;

/** 7 → "7", 3.5 → "3.5"; байхгүй бол "—" */
export const fmtScore = (v: number | null | undefined): string => (v === null || v === undefined ? "—" : String(Math.round(v * 10) / 10));
