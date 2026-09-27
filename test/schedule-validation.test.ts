import test from "node:test";
import assert from "node:assert/strict";
import { scheduleDate, timeOverlaps } from "@/lib/domain/schedule-validation";
import { optionalUrl, requiredText, validTime } from "@/lib/domain/master-validation";
import { DomainError } from "@/lib/error-codes";

test("timeOverlaps detects overlaps, adjacency and overnight shifts", () => {
  assert.equal(timeOverlaps("08:00", "16:00", "15:00", "20:00"), true);
  assert.equal(timeOverlaps("08:00", "16:00", "16:00", "20:00"), false);
  assert.equal(timeOverlaps("08:00", "16:00", "09:00", "10:00"), true);
  // Closing shift 22:00-06:00 overlaps an early morning shift.
  assert.equal(timeOverlaps("22:00", "06:00", "05:00", "09:00"), true);
  assert.equal(timeOverlaps("22:00", "06:00", "07:00", "09:00"), false);
});

test("scheduleDate enforces YYYY-MM-DD", () => {
  assert.equal(scheduleDate("2026-04-01"), "2026-04-01");
  assert.throws(() => scheduleDate("01-04-2026"), DomainError);
  assert.throws(() => scheduleDate(""), DomainError);
});

test("requiredText and validTime reject malformed input with VALIDATION_ERROR", () => {
  try {
    requiredText("   ", "name");
    assert.fail("expected a throw");
  } catch (error) {
    assert.ok(error instanceof DomainError);
    assert.equal(error.code, "VALIDATION_ERROR");
    assert.deepEqual(error.data, { fields: ["name"] });
  }
  assert.equal(validTime("08:30", "startTime"), "08:30");
  assert.throws(() => validTime("24:00", "startTime"), DomainError);
});

test("optionalUrl allows empty but rejects non-http(s) values", () => {
  assert.equal(optionalUrl(undefined, "photoUrl"), "");
  assert.equal(optionalUrl("  ", "photoUrl"), "");
  assert.equal(optionalUrl("https://drive.google.com/x", "photoUrl"), "https://drive.google.com/x");
  assert.throws(() => optionalUrl("javascript:alert(1)", "photoUrl"), DomainError);
  assert.throws(() => optionalUrl("not a url", "photoUrl"), DomainError);
});
