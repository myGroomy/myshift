import test from "node:test";
import assert from "node:assert/strict";
import {
  LOGIN_LOCK_MS,
  LOGIN_MAX_ATTEMPTS,
  isLockActive,
  parseAttempts,
  registerLoginFailure,
  resetLoginFailure,
} from "@/lib/domain/login-lockout";

const NOW = Date.parse("2026-09-27T08:00:00Z");

test("parseAttempts tolerates empty and junk values", () => {
  assert.equal(parseAttempts(undefined), 0);
  assert.equal(parseAttempts(""), 0);
  assert.equal(parseAttempts("3"), 3);
  assert.equal(parseAttempts("-4"), 0);
  assert.equal(parseAttempts("abc"), 0);
});

test("isLockActive only for future ISO timestamps", () => {
  assert.equal(isLockActive("", NOW), false);
  assert.equal(isLockActive("not-a-date", NOW), false);
  assert.equal(isLockActive(new Date(NOW - 1000).toISOString(), NOW), false);
  assert.equal(isLockActive(new Date(NOW + 1000).toISOString(), NOW), true);
});

test("fifth consecutive failure locks the account", () => {
  let state = { attempts: 0, lockedUntil: "" };
  for (let attempt = 1; attempt < LOGIN_MAX_ATTEMPTS; attempt++) {
    state = registerLoginFailure(state, NOW);
    assert.equal(state.attempts, attempt);
    assert.equal(state.lockedUntil, "");
  }
  state = registerLoginFailure(state, NOW);
  assert.equal(state.attempts, LOGIN_MAX_ATTEMPTS);
  assert.equal(state.lockedUntil, new Date(NOW + LOGIN_LOCK_MS).toISOString());
});

test("an expired lock resets the counter on the next failure", () => {
  const expired = { attempts: 5, lockedUntil: new Date(NOW - LOGIN_LOCK_MS).toISOString() };
  const next = registerLoginFailure(expired, NOW);
  assert.equal(next.attempts, 1);
  assert.equal(next.lockedUntil, "");
});

test("resetLoginFailure clears both counters", () => {
  assert.deepEqual(resetLoginFailure(), { attempts: 0, lockedUntil: "" });
});
