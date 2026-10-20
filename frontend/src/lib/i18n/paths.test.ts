/* Хэл, замын цэвэр функцуудын тест: `npm test` (Node 24 `node --test`, TypeScript type stripping). */

import assert from "node:assert/strict";
import test from "node:test";
import { localePath, proxyAction, shouldHandle, stripLang, switchPath } from "./paths.ts";

test("proxyAction", () => {
  assert.deepEqual(proxyAction("/", ""), { kind: "rewrite", to: "/mn" });
  assert.deepEqual(proxyAction("/news", "?page=2&category=x"), { kind: "rewrite", to: "/mn/news?page=2&category=x" });
  assert.deepEqual(proxyAction("/en", ""), { kind: "next" });
  assert.deepEqual(proxyAction("/en/news", "?page=2"), { kind: "next" });
  assert.deepEqual(proxyAction("/mn/about", "?a=1"), { kind: "redirect", to: "/about?a=1", status: 308 });
  assert.deepEqual(proxyAction("/mn", ""), { kind: "redirect", to: "/", status: 308 });
  assert.deepEqual(proxyAction("/en/calendar/timetable", ""), { kind: "redirect", to: "/calendar/timetable", status: 307 });
  assert.deepEqual(proxyAction("/en/clubs", "?g=5"), { kind: "redirect", to: "/clubs?g=5", status: 307 });
  assert.deepEqual(proxyAction("/english", ""), { kind: "rewrite", to: "/mn/english" });
  assert.deepEqual(proxyAction("/mnx", ""), { kind: "rewrite", to: "/mn/mnx" });
});

test("shouldHandle", () => {
  for (const p of ["/logo-full.png", "/icon.png", "/favicon.ico", "/_next/static/x.js", "/admin", "/admin/news/1", "/api/revalidate", "/olympiad"]) {
    assert.equal(shouldHandle(p), false, p);
  }
  for (const p of ["/", "/about", "/en", "/news/abc", "/administration"]) assert.equal(shouldHandle(p), true, p);
});

test("stripLang", () => {
  assert.deepEqual(stripLang("/en/news/x"), { lang: "en", path: "/news/x" });
  assert.deepEqual(stripLang("/en"), { lang: "en", path: "/" });
  assert.deepEqual(stripLang("/news"), { lang: "mn", path: "/news" });
  assert.deepEqual(stripLang("/english"), { lang: "mn", path: "/english" });
  // Prerender/rewrite үед usePathname() дотоод "/mn/…" замыг буцаана — хэлгүй зам руу хэвийн болгоно
  assert.deepEqual(stripLang("/mn/about"), { lang: "mn", path: "/about" });
  assert.deepEqual(stripLang("/mn"), { lang: "mn", path: "/" });
  assert.deepEqual(stripLang("/mnx"), { lang: "mn", path: "/mnx" });
});

test("switchPath from internal /mn paths", () => {
  assert.equal(switchPath("/mn", "", "en"), "/en");
  assert.equal(switchPath("/mn/about", "", "en"), "/en/about");
  assert.equal(switchPath("/mn/about", "", "mn"), "/about");
  assert.equal(switchPath("/mn/calendar", "", "en"), "/en");
});

test("switchPath", () => {
  assert.equal(switchPath("/", "", "en"), "/en");
  assert.equal(switchPath("/en", "", "mn"), "/");
  assert.equal(switchPath("/news/abc", "?x=1", "en"), "/en/news/abc?x=1");
  assert.equal(switchPath("/en/news/abc", "", "mn"), "/news/abc");
  assert.equal(switchPath("/calendar", "", "en"), "/en");
  assert.equal(switchPath("/calendar/timetable", "?a=1", "en"), "/en");
  assert.equal(switchPath("/about", "", "mn"), "/about");
});

test("localePath", () => {
  assert.equal(localePath("en", "/"), "/en");
  assert.equal(localePath("en", "/about"), "/en/about");
  assert.equal(localePath("en", "/#programs"), "/en#programs");
  assert.equal(localePath("mn", "/about"), "/about");
  assert.equal(localePath("mn", "/#programs"), "/#programs");
});
