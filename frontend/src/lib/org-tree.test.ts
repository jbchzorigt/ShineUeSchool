import assert from "node:assert/strict";
import { test } from "node:test";
import { buildOrgTree, descendantIds, type OrgNode } from "./org-tree.ts";
import type { AboutDepartment, AboutLeader } from "./types";

const L = (id: number, parent: number | null): AboutLeader => ({ id, full_name: `Гишүүн ${id}`, position: "", position_en: "", level: 1, photo: null, parent_id: parent });
const D = (id: number, leader: number | null): AboutDepartment => ({ id, name: `Тэнхим ${id}`, name_en: "", leader_id: leader, teachers: [] });
const ids = (nodes: OrgNode[]) => nodes.map((n) => n.leader.id);
const all = (nodes: OrgNode[]): number[] => nodes.flatMap((n) => [n.leader.id, ...all(n.children)]);

test("үндэс ба хүүхдүүд API эрэмбээр, depth", () => {
  const roots = buildOrgTree([L(1, null), L(2, 1), L(3, 2), L(4, 2)], []);
  assert.deepEqual(ids(roots), [1]);
  assert.deepEqual(ids(roots[0].children), [2]);
  assert.deepEqual(ids(roots[0].children[0].children), [3, 4]);
  assert.deepEqual([roots[0].depth, roots[0].children[0].depth, roots[0].children[0].children[1].depth], [0, 1, 2]);
});

test("тэнхим харьяалагдах гишүүндээ, эрэмбээр; харьяалалгүй/байхгүй гишүүн рүү заасан нь гарахгүй", () => {
  const roots = buildOrgTree([L(1, null), L(2, 1)], [D(10, 2), D(11, null), D(12, 1), D(13, 99), D(14, 2)]);
  assert.deepEqual(roots[0].departments.map((d) => d.id), [12]);
  assert.deepEqual(roots[0].children[0].departments.map((d) => d.id), [10, 14]);
  const shown = (nodes: OrgNode[]): number[] => nodes.flatMap((n) => [...n.departments.map((d) => d.id), ...shown(n.children)]);
  assert.deepEqual(shown(roots).sort(), [10, 12, 14]);
});

test("олон үндэс; байхгүй эцэг рүү заасан гишүүн үндэс болно", () => {
  const roots = buildOrgTree([L(1, null), L(2, 77), L(3, 1), L(4, null)], []);
  assert.deepEqual(ids(roots), [1, 2, 4]);
  assert.deepEqual(ids(roots[0].children), [3]);
});

test("мөчлөг: 1→2→1 ба 3→3 — гишүүн бүр яг нэг удаа, гацахгүй", () => {
  const roots = buildOrgTree([L(1, 2), L(2, 1), L(3, 3), L(4, 1)], []);
  assert.deepEqual(all(roots).sort(), [1, 2, 3, 4]);
  assert.equal(all(roots).length, 4);
  assert.deepEqual(ids(roots), [3, 1]);   // өөртөө заасан 3 — үндэс; 1↔2 мөчлөгөөс API эрэмбээр эхний зочлоогүй 1 — нэмэлт үндэс
});

test("хуучин API: parent_id/leader_id байхгүй → бүгд үндэс, тэнхим гарахгүй", () => {
  const old = [{ id: 1, full_name: "А", position: "", position_en: "", level: 1, photo: null }, { id: 2, full_name: "Б", position: "", position_en: "", level: 2, photo: null }] as unknown as AboutLeader[];
  const depts = [{ id: 5, name: "Т", name_en: "", teachers: [] }] as unknown as AboutDepartment[];
  const roots = buildOrgTree(old, depts);
  assert.deepEqual(ids(roots), [1, 2]);
  assert.deepEqual(roots.flatMap((n) => n.departments), []);
});

test("descendantIds: доод бүх гишүүн, өөрийг нь оруулахгүй, мөчлөгт гацахгүй", () => {
  const ls = [L(1, null), L(2, 1), L(3, 2), L(4, 1), L(5, null)];
  assert.deepEqual([...descendantIds(ls, 1)].sort(), [2, 3, 4]);
  assert.deepEqual([...descendantIds(ls, 3)], []);
  assert.deepEqual([...descendantIds([L(1, 2), L(2, 1)], 1)].sort(), [2]);
});
