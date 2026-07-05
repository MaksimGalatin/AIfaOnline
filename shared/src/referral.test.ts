import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tierPctForSaleIndex, effectivePct, commissionCents, weekStartUTC, prestigeForLifetimeSales,
} from "./referral.js";

test("tier boundaries 30/40/50", () => {
  assert.equal(tierPctForSaleIndex(1), 30);
  assert.equal(tierPctForSaleIndex(10), 30);
  assert.equal(tierPctForSaleIndex(11), 40);
  assert.equal(tierPctForSaleIndex(60), 40);
  assert.equal(tierPctForSaleIndex(61), 50);
  assert.equal(tierPctForSaleIndex(1000), 50);
});

test("prestige floor lifts 30/40 to 45 but keeps 50", () => {
  assert.equal(effectivePct(5, true), 45);    // 30 -> 45
  assert.equal(effectivePct(30, true), 45);   // 40 -> 45
  assert.equal(effectivePct(70, true), 50);   // 50 stays
  assert.equal(effectivePct(5, false), 30);   // no floor
});

test("commission cents rounding", () => {
  assert.equal(commissionCents(199, 1, false), 60);   // 30% of 199 = 59.7 -> 60
  assert.equal(commissionCents(999, 11, false), 400);  // 40% of 999 = 399.6 -> 400
  assert.equal(commissionCents(999, 61, false), 500);  // 50%
});

test("weekStartUTC returns Monday", () => {
  // 2026-06-24 is a Wednesday -> Monday 2026-06-22
  assert.equal(weekStartUTC(new Date("2026-06-24T09:00:00Z")), "2026-06-22");
  // Sunday rolls back to previous Monday
  assert.equal(weekStartUTC(new Date("2026-06-28T23:59:00Z")), "2026-06-22");
  // Monday maps to itself
  assert.equal(weekStartUTC(new Date("2026-06-22T00:00:00Z")), "2026-06-22");
});

test("prestige thresholds", () => {
  assert.equal(prestigeForLifetimeSales(0), "none");
  assert.equal(prestigeForLifetimeSales(10), "spark");
  assert.equal(prestigeForLifetimeSales(50), "resonance");
  assert.equal(prestigeForLifetimeSales(100), "eternal");
});
