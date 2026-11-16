import { test } from "node:test";
import assert from "node:assert/strict";
import { pageLabel } from "./page-label.ts";

test("нүүр хуудас", () => {
  assert.equal(pageLabel("/"), "Нүүр");
  assert.equal(pageLabel("/en"), "Нүүр (EN)");
});

test("хэсгийн нэр — эхний сегментээр", () => {
  assert.equal(pageLabel("/admission"), "Элсэлт");
  assert.equal(pageLabel("/news/shine-ue-2026"), "Мэдээ");
  assert.equal(pageLabel("/olympiad/2026"), "Олимпиад");
});

test("англи хувилбар — (EN) тэмдэгтэй", () => {
  assert.equal(pageLabel("/en/clubs"), "Дугуйлан (EN)");
});

test("мэдэгдэхгүй хэсэг — замыг өөрийг нь", () => {
  assert.equal(pageLabel("/something-else"), "/something-else");
  assert.equal(pageLabel("/constructor"), "/constructor");
});
