/* Админы хэсэг тус бүрийн эрх (backend app/auth/models.py SECTIONS-тэй ижил).
   Эрхийн код: "<хэсэг>.view" (харах) эсвэл "<хэсэг>.edit" (засах; харах эрхийг агуулна). Superuser бүгдийг. */

export const SECTIONS = ["olympiad", "timetable", "clubs", "about", "programs", "graduates", "news"] as const;
export type Section = (typeof SECTIONS)[number];
export type Level = "view" | "edit";
export type RoleCode = `${Section}.${Level}`;

interface Perms { is_superuser: boolean; roles: string[] }

export function can(user: Perms, section: Section, level: Level = "view"): boolean {
  return user.is_superuser || user.roles.includes(`${section}.edit`) || (level === "view" && user.roles.includes(`${section}.view`));
}

/** "/admin/<хэсэг>/..." замаас хэсгийг олно; хэсэгт хамаарахгүй зам (нүүр, хэрэглэгчид) → null. */
export function sectionOf(path: string): Section | null {
  const seg = path.split("/")[2] ?? "";
  return (SECTIONS as readonly string[]).includes(seg) ? (seg as Section) : null;
}

/** Хэрэглэгчийн тухайн хэсэг дэх түвшин (засах форм дахь сонголт). */
export function levelOf(roles: string[], section: Section): Level | null {
  return roles.includes(`${section}.edit`) ? "edit" : roles.includes(`${section}.view`) ? "view" : null;
}

/** Нэг хэсгийн түвшинг солино (null — эрхгүй); бусад хэсгийн кодыг хэвээр үлдээнэ. */
export function setLevel(roles: RoleCode[], section: Section, level: Level | null): RoleCode[] {
  const rest = roles.filter((r) => !r.startsWith(`${section}.`));
  return level ? [...rest, `${section}.${level}` as const] : rest;
}
