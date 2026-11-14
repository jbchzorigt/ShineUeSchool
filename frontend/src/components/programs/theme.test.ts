import assert from "node:assert/strict";
import { test } from "node:test";
import { cumulative, esc, num, signed } from "./theme.ts";

test("esc: tooltip-д орох админы текстээс HTML тэмдэгтүүдийг шүүнэ", () => {
  assert.equal(esc(`<img src=x onerror="alert('1')">`), "&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;");
  assert.equal(esc("Physics & Chemistry"), "Physics &amp; Chemistry");
  assert.equal(esc("2026"), "2026");
});

test("cumulative: хуримтлагдсан нийлбэр", () => {
  assert.deepEqual(cumulative([10, 14, 20]), [10, 24, 44]);
  assert.deepEqual(cumulative([]), []);
});

test("num, signed: нэг оронтой бутархай, тэмдэгтэй зөрүү", () => {
  assert.equal(num(69.64), "69.6");
  assert.equal(num(74), "74");
  assert.equal(signed(3.25), "+3.3");
  assert.equal(signed(-2), "-2");
  assert.equal(signed(0), "0");
});
