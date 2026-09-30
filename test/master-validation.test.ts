import test from "node:test";
import assert from "node:assert/strict";
import { validUsername } from "@/lib/domain/master-validation";
import { DomainError } from "@/lib/error-codes";

test("validUsername lowercases valid login names", () => {
  assert.equal(validUsername("Taufik_01"), "taufik_01");
});

test("validUsername rejects unsupported characters", () => {
  assert.throws(() => validUsername("user name"), (error) =>
    error instanceof DomainError && error.code === "VALIDATION_ERROR"
  );
});
