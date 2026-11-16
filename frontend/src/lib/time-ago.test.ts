import { test } from "node:test";
import assert from "node:assert/strict";
import { timeAgo } from "./time-ago.ts";

const NOW = new Date("2026-11-16T12:00:00+08:00");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

test("минутаас бага бол 'Дөнгөж сая'", () => {
  assert.equal(timeAgo(ago(30_000), NOW), "Дөнгөж сая");
});

test("цагаас бага бол минутаар", () => {
  assert.equal(timeAgo(ago(5 * MIN), NOW), "5 минутын өмнө");
  assert.equal(timeAgo(ago(59 * MIN), NOW), "59 минутын өмнө");
});

test("өдрөөс бага бол цагаар", () => {
  assert.equal(timeAgo(ago(HOUR), NOW), "1 цагийн өмнө");
  assert.equal(timeAgo(ago(23 * HOUR), NOW), "23 цагийн өмнө");
});

test("7 хоногоос бага бол өдрөөр", () => {
  assert.equal(timeAgo(ago(DAY), NOW), "1 өдрийн өмнө");
  assert.equal(timeAgo(ago(6 * DAY), NOW), "6 өдрийн өмнө");
});

test("7 хоног ба түүнээс өмнөх бол Улаанбаатарын огноо YYYY.MM.DD", () => {
  assert.equal(timeAgo(ago(7 * DAY), NOW), "2026.11.09");
  assert.equal(timeAgo("2026-01-01T17:30:00Z", NOW), "2026.01.02");   // UTC 17:30 = УБ 01:30 дараагийн өдөр
});

test("ирээдүйн цаг (цагийн зөрүү) — 'Дөнгөж сая'", () => {
  assert.equal(timeAgo(ago(-2 * MIN), NOW), "Дөнгөж сая");
});

test("буруу огноо — хоосон мөр", () => {
  assert.equal(timeAgo("not-a-date", NOW), "");
});
