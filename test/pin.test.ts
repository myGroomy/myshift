import test from "node:test";
import assert from "node:assert/strict";
import { hashPin, isValidPin, verifyPin } from "@/lib/domain/pin";

test("isValidPin enforces 4-8 digits", () => {
  assert.equal(isValidPin("1234"), true);
  assert.equal(isValidPin("12345678"), true);
  assert.equal(isValidPin("123"), false);
  assert.equal(isValidPin("123456789"), false);
  assert.equal(isValidPin("12a4"), false);
  assert.equal(isValidPin(1234), false);
});

test("hashPin stores salt$hash, never the PIN itself", () => {
  const hash = hashPin("123456");
  const [salt, key] = hash.split("$");
  assert.equal(salt.length, 32);
  assert.equal(key.length, 64);
  assert.ok(!hash.includes("123456"));
});

test("hashPin uses a fresh salt per call", () => {
  assert.notEqual(hashPin("123456"), hashPin("123456"));
});

test("verifyPin accepts the right PIN and rejects everything else", () => {
  const hash = hashPin("4321");
  assert.equal(verifyPin("4321", hash), true);
  assert.equal(verifyPin("1234", hash), false);
  assert.equal(verifyPin("", hash), false);
  assert.equal(verifyPin("4321", ""), false);
  assert.equal(verifyPin("4321", "no-separator"), false);
  assert.equal(verifyPin("4321", "deadbeef$zz"), false);
});

test("hashPin refuses values that are not a valid PIN", () => {
  assert.throws(() => hashPin("12"));
  assert.throws(() => hashPin("abcd"));
});
