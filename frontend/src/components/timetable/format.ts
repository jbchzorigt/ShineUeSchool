/* Хуваарийн текст туслахууд (олон нийт ба админ хоёулаа). */

import type { AppliesTo, EventCategory, RoomKind } from "@/lib/types";

export const WEEKDAY_NAMES = ["", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
export const WEEKDAY_SHORT = ["", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
/** "08:00:00" → "08:00" */
export const hm = (t: string) => t.slice(0, 5);
export const ROOM_KINDS: Record<RoomKind, string> = { classroom: "Анги", lab: "Лаборатори", gym: "Спорт заал", other: "Бусад" };
export const EVENT_CATEGORIES: Record<EventCategory, string> = { term: "Улирал", holiday: "Амралт", exam: "Шалгалт", event: "Үйл явдал", other: "Бусад" };
/** Ангиллын анхдагч өнгө; үйл явдлын `color` хоосон бол үүнийг ашиглана */
export const EVENT_COLORS: Record<EventCategory, string> = { term: "#1e3a8f", holiday: "#10b981", exam: "#ef4444", event: "#ffc20e", other: "#94a3b8" };
export const eventColor = (e: { category: EventCategory; color: string }) => e.color || EVENT_COLORS[e.category];
export const APPLIES_TO: Record<AppliesTo, string> = { all: "Бүх анги", primary: "Бага анги", secondary: "Дунд анги", high: "Ахлах анги" };
