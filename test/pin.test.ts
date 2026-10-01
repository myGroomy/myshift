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

test("hashPin returns the PIN as-is (plaintext mode)", () => {
  assert.equal(hashPin("123456"), "123456");
  assert.equal(hashPin("4321"), "4321");
});

test("verifyPin accepts the right PIN and rejects everything else", () => {
  assert.equal(verifyPin("4321", "4321"), true);
  assert.equal(verifyPin("1234", "4321"), false);
  assert.equal(verifyPin("", "4321"), false);
  assert.equal(verifyPin("4321", ""), false);
  assert.equal(verifyPin("4321", "no-separator"), false);
  assert.equal(verifyPin("4321", "deadbeef$zz"), false);
});

test("hashPin refuses values that are not a valid PIN", () => {
  assert.throws(() => hashPin("12"));
  assert.throws(() => hashPin("abcd"));
});
