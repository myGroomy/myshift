import test from "node:test";
import assert from "node:assert/strict";
import { DomainError, ERROR_STATUS, isDomainError, statusForCode } from "@/lib/error-codes";
import { fail, handleRouteError } from "@/lib/api-response";

// Codes required by PLAN/API-CONTRACT.md §11.
const CONTRACT_CODES = [
  "INVALID_CREDENTIALS",
  "ACCOUNT_LOCKED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "CHECKLIST_INCOMPLETE",
  "REQUIRED_FIELD_MISSING",
  "SHEETS_RATE_LIMITED",
] as const;

test("every contract code exists with its documented status", () => {
  for (const code of CONTRACT_CODES) assert.ok(code in ERROR_STATUS, code);
  assert.equal(statusForCode("ACCOUNT_LOCKED"), 423);
  assert.equal(statusForCode("VALIDATION_ERROR"), 400);
  assert.equal(statusForCode("FORBIDDEN"), 403);
  assert.equal(statusForCode("UNAUTHORIZED"), 401);
  assert.equal(statusForCode("NOT_FOUND"), 404);
  assert.equal(statusForCode("SHEETS_RATE_LIMITED"), 429);
});

test("DomainError carries code, status and data", () => {
  const error = new DomainError("REQUIRED_FIELD_MISSING", "kosong", { data: { fields: ["HOF-001"] } });
  assert.ok(error instanceof Error);
  assert.equal(error.name, "DomainError");
  assert.equal(error.status, 400);
  assert.deepEqual(error.data, { fields: ["HOF-001"] });
  assert.equal(isDomainError(error), true);
  assert.equal(isDomainError(new Error("plain")), false);
});

test("fail nests extra detail inside error.data", async () => {
  const response = fail("VALIDATION_ERROR", "Field wajib", { data: { fields: ["photoUrl"] } });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    error: { code: "VALIDATION_ERROR", message: "Field wajib", data: { fields: ["photoUrl"] } },
  });
});

test("handleRouteError keeps DomainError details and hides everything else", async () => {
  const typed = handleRouteError(new DomainError("NOT_FOUND", "Jadwal tidak ditemukan"), "Gagal");
  assert.equal(typed.status, 404);
  assert.deepEqual((await typed.json()).error, { code: "NOT_FOUND", message: "Jadwal tidak ditemukan" });

  const untyped = handleRouteError(
    new Error("Google API: spreadsheetId=abc range=Schedules!A:G invalid_grant"),
    "Gagal memuat jadwal"
  );
  assert.equal(untyped.status, 500);
  const body = await untyped.json();
  assert.equal(body.error.code, "INTERNAL_ERROR");
  assert.equal(body.error.message, "Gagal memuat jadwal");
  assert.ok(!JSON.stringify(body).includes("spreadsheetId"));
});
