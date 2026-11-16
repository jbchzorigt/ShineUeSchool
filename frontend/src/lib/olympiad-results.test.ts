import assert from "node:assert/strict";
import { test } from "node:test";
import { fmtScore, medalKind, problemCount } from "./olympiad-results.ts";

test("problemCount: ангийн мөрүүдийн хамгийн урт scores (бодлогын тоо)", () => {
  assert.equal(problemCount([{ scores: [7, 7, 5, 6] }, { scores: [7, 7] }, { scores: [] }]), 4);
  assert.equal(problemCount([{ scores: [] }, { scores: [] }]), 0);
  assert.equal(problemCount([]), 0);
  assert.equal(problemCount([{ scores: [7, null, null, null, 2] }]), 5);
});

test("medalKind: медалийн талбараас өнгө (Алт/Мөнгө/Хүрэл), хоосон бол null", () => {
  assert.equal(medalKind("АЛТ"), "gold");
  assert.equal(medalKind("МӨНГӨ"), "silver");
  assert.equal(medalKind("ХҮРЭЛ"), "bronze");
  assert.equal(medalKind(""), null);
});

test("fmtScore: бүхэл тоо бутархайгүй, бутархай 1 оронтой, байхгүй бол зураас", () => {
  assert.equal(fmtScore(7), "7");
  assert.equal(fmtScore(3.5), "3.5");
  assert.equal(fmtScore(22.5), "22.5");
  assert.equal(fmtScore(0), "0");
  assert.equal(fmtScore(null), "—");
  assert.equal(fmtScore(undefined), "—");
});
