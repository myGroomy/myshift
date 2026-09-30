import test from "node:test";
import assert from "node:assert/strict";
import { ok, fail, handleRouteError } from "@/lib/api-response";
import { DomainError } from "@/lib/error-codes";

// These tests verify the API response contract shape that every route depends on.
// Seam: lib/api-response.ts the single mapper for all route responses.

test("ok() returns 200 with success:true and data", async () => {
  const res = ok({ hello: "world" });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { success: true, data: { hello: "world" } });
});

test("ok() passes through custom status and headers", async () => {
  const res = ok({ created: true }, { status: 201, headers: { "X-Custom": "yes" } });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get("x-custom"), "yes");
  assert.equal(res.headers.get("content-type"), "application/json");
});

test("fail() returns error shape with code and message", async () => {
  const res = fail("INVALID_CREDENTIALS", "Username atau PIN salah");
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.deepEqual(body, {
    success: false,
    error: { code: "INVALID_CREDENTIALS", message: "Username atau PIN salah" },
  });
});

test("fail() nests data inside error for VALIDATION_ERROR", async () => {
  const res = fail("VALIDATION_ERROR", "Field wajib", { data: { fields: ["pin"] } });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.deepEqual(body.error.data, { fields: ["pin"] });
});

test("handleRouteError preserves DomainError code/status/data", async () => {
  const error = new DomainError("FORBIDDEN", "Tidak boleh", { status: 403 });
  const res = handleRouteError(error, "fallback");
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error.code, "FORBIDDEN");
  assert.equal(body.error.message, "Tidak boleh");
});

test("handleRouteError maps unknown errors to INTERNAL_ERROR", async () => {
  const res = handleRouteError(new Error("secret Google API detail"), "Login gagal");
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.error.code, "INTERNAL_ERROR");
  assert.equal(body.error.message, "Login gagal");
  assert.ok(!JSON.stringify(body).includes("secret"));
});
