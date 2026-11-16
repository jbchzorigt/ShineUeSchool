import assert from "node:assert/strict";
import { test } from "node:test";
import { arcPath, groupSubjects, levelsOf, splitGroupName, wheelFits } from "./subject-wheel.ts";
import type { ProgramSubject } from "./types";

const S = (name: string, group: string, tag = ""): ProgramSubject => ({ key: name, group, name, name_en: "", tag, description: "" });

test("groupSubjects: админы эрэмбээр бүлэглэнэ, бүлэггүйг сүүлд 'Бусад'", () => {
  const g = groupSubjects([S("Физик", "Group 4"), S("Монгол хэл", "Group 1"), S("Хими", "Group 4"), S("TOK", "")], "Бусад");
  assert.deepEqual(g.map((x) => x.name), ["Group 4", "Group 1", "Бусад"]);
  assert.deepEqual(g[0].items.map((s) => s.name), ["Физик", "Хими"]);
  assert.deepEqual(g[2].items.map((s) => s.name), ["TOK"]);
});

test("levelsOf: тэмдгээс HL/SL-г таньж, үлдсэн текстийг буцаана", () => {
  assert.deepEqual(levelsOf("HL · SL"), { hl: true, sl: true, rest: "" });
  assert.deepEqual(levelsOf("sl"), { hl: false, sl: true, rest: "" });
  assert.deepEqual(levelsOf("HL/SL"), { hl: true, sl: true, rest: "" });
  assert.deepEqual(levelsOf("11–12-р анги"), { hl: false, sl: false, rest: "11–12-р анги" });
  assert.deepEqual(levelsOf(""), { hl: false, sl: false, rest: "" });
  assert.deepEqual(levelsOf("SLOVAK"), { hl: false, sl: false, rest: "SLOVAK" });   // үгийн хэсэг биш, бүтэн үг
});

test("splitGroupName: 'Group 4 · Шинжлэх ухаан' → богино нэр + тайлбар", () => {
  assert.deepEqual(splitGroupName("Group 4 · Шинжлэх ухаан"), ["Group 4", "Шинжлэх ухаан"]);
  assert.deepEqual(splitGroupName("Group 1 - Language"), ["Group 1", "Language"]);
  assert.deepEqual(splitGroupName("Group 5: Математик"), ["Group 5", "Математик"]);
  assert.deepEqual(splitGroupName("Урлаг"), ["Урлаг", ""]);
});

test("wheelFits: 2–8 бүлэгтэй үед л дугуй", () => {
  const n = (k: number) => Array.from({ length: k }, (_, i) => S(`s${i}`, `G${i}`));
  assert.equal(wheelFits(n(1)), false);
  assert.equal(wheelFits(n(2)), true);
  assert.equal(wheelFits(n(8)), true);
  assert.equal(wheelFits(n(9)), false);
});

test("arcPath: цагираган хэсгийн зам (дээрээс цагийн зүүний дагуу)", () => {
  const d = arcPath(100, 100, 50, 90, 0, 90);
  assert.ok(d.startsWith("M 100 10 "), d);          // 0° = дээд цэг, гадна радиус
  assert.ok(d.includes("A 90 90 0 0 1 190 100"), d); // гадна нум 90° хүртэл
  assert.ok(d.includes("A 50 50 0 0 0 100 50"), d);  // дотор нум буцаж
  assert.ok(d.endsWith("Z"), d);
  assert.ok(arcPath(0, 0, 1, 2, 0, 200).includes(" 0 1 1 "), "180°-аас их нум — large-arc flag 1");
});
