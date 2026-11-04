/* Эрхийн цэвэр функцуудын тест: `npm test`. */

import assert from "node:assert/strict";
import test from "node:test";
import { can, levelOf, sectionOf, setLevel } from "./permissions.ts";

test("can", () => {
  const viewer = { is_superuser: false, roles: ["news.view"] };
  const editor = { is_superuser: false, roles: ["news.edit"] };
  assert.equal(can(viewer, "news"), true);
  assert.equal(can(viewer, "news", "edit"), false);
  assert.equal(can(editor, "news", "view"), true);
  assert.equal(can(editor, "news", "edit"), true);
  assert.equal(can(editor, "olympiad"), false);
  assert.equal(can({ is_superuser: true, roles: [] }, "olympiad", "edit"), true);
});

test("sectionOf", () => {
  assert.equal(sectionOf("/admin/news/12"), "news");
  assert.equal(sectionOf("/admin/olympiad"), "olympiad");
  assert.equal(sectionOf("/admin"), null);
  assert.equal(sectionOf("/admin/users"), null);
});

test("levelOf / setLevel", () => {
  assert.equal(levelOf(["news.view", "about.edit"], "about"), "edit");
  assert.equal(levelOf(["news.view"], "news"), "view");
  assert.equal(levelOf(["news.view"], "clubs"), null);
  assert.deepEqual(setLevel(["news.view", "about.edit"], "news", "edit"), ["about.edit", "news.edit"]);
  assert.deepEqual(setLevel(["news.view", "about.edit"], "about", null), ["news.view"]);
});
