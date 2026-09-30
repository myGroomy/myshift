import test from "node:test";
import assert from "node:assert/strict";
import { todayInWIB } from "@/lib/domain/date";

test("todayInWIB uses the WIB calendar day, not UTC", () => {
  // 2026-09-26 20:00 UTC is already 2026-09-27 03:00 WIB the UTC+7 window that used to make
  // the dashboard show yesterday's schedules between 00:00 and 07:00 WIB.
  assert.equal(todayInWIB(new Date("2026-09-26T20:00:00Z")), "2026-09-27");
  assert.equal(new Date("2026-09-26T20:00:00Z").toISOString().slice(0, 10), "2026-09-26");
});

test("todayInWIB boundaries at WIB midnight", () => {
  assert.equal(todayInWIB(new Date("2026-09-27T16:59:59Z")), "2026-09-27");
  assert.equal(todayInWIB(new Date("2026-09-27T17:00:00Z")), "2026-09-28");
  assert.equal(todayInWIB(new Date("2026-09-27T23:30:00Z")), "2026-09-28");
});
