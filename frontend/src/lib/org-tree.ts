/* Байгууллагын бүтэц: удирдлагын гишүүдийг харьяаллаар (parent_id) мод болгож угсарна, тэнхимүүдийг харьяалагдах гишүүнд (leader_id) нь хавсаргана.
   Өгөгдөл ямар ч байсан гацахгүй: байхгүй/өөртөө заасан эцэг → үндэс; мөчлөгт орсон гишүүд API эрэмбээр нэмэлт үндэс болно (хэн ч алга болохгүй).
   Харьяалалгүй тэнхим диаграмд гарахгүй. Хуучин API (parent_id/leader_id байхгүй) → бүгд үндэс. Эрэмбэ: API-ийн (level, order, id), тэнхим (order, id). */

import type { AboutDepartment, AboutLeader } from "./types";

export interface OrgNode { leader: AboutLeader; depth: number; children: OrgNode[]; departments: AboutDepartment[] }

/** Эцэг нь жагсаалтад байгаа бөгөөд өөр гишүүн бол түүний id, үгүй бол null */
function parentOf(l: AboutLeader, byId: Map<number, AboutLeader>): number | null {
  const p = l.parent_id ?? null;
  return p !== null && p !== l.id && byId.has(p) ? p : null;
}

function childrenMap(leaders: AboutLeader[]) {
  const byId = new Map(leaders.map((l) => [l.id, l]));
  const kids = new Map<number, AboutLeader[]>();
  for (const l of leaders) {
    const p = parentOf(l, byId);
    if (p !== null) kids.set(p, [...(kids.get(p) ?? []), l]);
  }
  return { byId, kids };
}

export function buildOrgTree(leaders: AboutLeader[], departments: AboutDepartment[]): OrgNode[] {
  const { byId, kids } = childrenMap(leaders);
  const depts = new Map<number, AboutDepartment[]>();
  for (const d of departments) {
    const id = d.leader_id ?? null;
    if (id !== null && byId.has(id)) depts.set(id, [...(depts.get(id) ?? []), d]);
  }
  const visited = new Set<number>();
  const visit = (l: AboutLeader, depth: number): OrgNode | null => {
    if (visited.has(l.id)) return null;
    visited.add(l.id);
    const children = (kids.get(l.id) ?? []).map((c) => visit(c, depth + 1)).filter((n): n is OrgNode => n !== null);
    return { leader: l, depth, children, departments: depts.get(l.id) ?? [] };
  };
  const roots: OrgNode[] = [];
  for (const l of leaders) if (parentOf(l, byId) === null) { const n = visit(l, 0); if (n) roots.push(n); }
  // Мөчлөгт орсон (үндэсээс хүрэхгүй) гишүүд — API эрэмбээр эхний зочлоогүйг нэмэлт үндэс болгоно
  for (const l of leaders) if (!visited.has(l.id)) { const n = visit(l, 0); if (n) roots.push(n); }
  return roots;
}

/** Гишүүний бүх доод гишүүд (өөрийг нь оруулахгүй) — админы dropdown-оос мөчлөг үүсгэх сонголтыг хасахад */
export function descendantIds(leaders: AboutLeader[], id: number): Set<number> {
  const { kids } = childrenMap(leaders);
  const out = new Set<number>();
  const stack = [...(kids.get(id) ?? [])];
  while (stack.length) {
    const l = stack.pop()!;
    if (l.id === id || out.has(l.id)) continue;
    out.add(l.id);
    stack.push(...(kids.get(l.id) ?? []));
  }
  return out;
}
