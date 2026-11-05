import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_TAG_COLOR, readableOn, TAG_PALETTE, tagColor } from "./color.ts";

test("бараан дэвсгэр дээр цагаан текст", () => {
  for (const c of ["#1e3a8f", "#000000", "#c0392b", "#12245c"]) assert.equal(readableOn(c), "#ffffff", c);
});

test("цайвар дэвсгэр дээр бараан текст", () => {
  for (const c of ["#ffc20e", "#ffffff", "#e6ebf6", "#00ff00"]) assert.equal(readableOn(c), "#1d1d1f", c);
});

test("ангиллын өнгө бүр дээрх текстийн өнгө", () => {
  const text = Object.fromEntries(TAG_PALETTE.map((c) => [c.hex, readableOn(c.hex)]));
  assert.deepEqual(text, {
    "#ec111a": "#ffffff", "#fb6330": "#1d1d1f", "#ffd42f": "#1d1d1f", "#138468": "#ffffff",
    "#009dd6": "#1d1d1f", "#7849b8": "#ffffff", "#f2609e": "#1d1d1f",
  });
});

test("өнгө дутуу эсвэл буруу бол анхдагч өнгө, алдаа шидэхгүй", () => {
  for (const c of [undefined, null, "", "red", "#12345", "#1e3a8f;x"]) {
    assert.equal(tagColor(c), DEFAULT_TAG_COLOR);
    assert.equal(readableOn(c), "#ffffff");
  }
  assert.equal(tagColor("#C0392B"), "#C0392B");
});
