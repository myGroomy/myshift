import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createSessionToken, verifySessionToken, sessionCookieHeader, COOKIE_NAME } from "@/lib/session";

// These tests verify the session token lifecycle that every auth-protected route depends on.
// Seam: lib/session.ts HMAC-signed stateless tokens.

const payload = {
  employeeId: "EMP-001",
  nama: "Test User",
  role: "karyawan" as const,
  branches: [{ branchId: "CBG001", nama: "Test Branch" }],
  activeBranchId: "CBG001",
};

test("createSessionToken produces a signed token that verifySessionToken accepts", async () => {
  const token = await createSessionToken(payload);
  const session = await verifySessionToken(token);
  assert.ok(session);
  assert.equal(session.employeeId, "EMP-001");
  assert.equal(session.role, "karyawan");
  assert.equal(session.activeBranchId, "CBG001");
});

test("verifySessionToken rejects a tampered token", async () => {
  const token = await createSessionToken(payload);
  const [body, sig] = token.split(".");
  const tampered = `${body}.${sig.slice(0, -2)}xx`;
  const session = await verifySessionToken(tampered);
  assert.equal(session, null);
});

test("verifySessionToken rejects a garbage token", async () => {
  // Valid base64 but not a valid signed token signature verification fails
  const garbage = btoa("garbage").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const token = `${garbage}.${garbage}`;
  const session = await verifySessionToken(token);
  assert.equal(session, null);
});

test("verifySessionToken rejects an expired token", async () => {
  const expiredPayload = { ...payload, iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 };
  const body = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
  const signature = createHmac("sha256", process.env.MYSHIFT_API_KEY!)
    .update(body)
    .digest("base64url");
  const token = `${body}.${signature}`;
  const session = await verifySessionToken(token);
  assert.equal(session, null);
});

test("verifySessionToken returns null for empty input", async () => {
  assert.equal(await verifySessionToken(""), null);
  assert.equal(await verifySessionToken(undefined), null);
});

test("sessionCookieHeader sets HttpOnly, SameSite=Lax, Path=/", () => {
  const header = sessionCookieHeader("abc123");
  const setCookie = header["Set-Cookie"];
  assert.ok(setCookie.includes(`${COOKIE_NAME}=abc123`));
  assert.ok(setCookie.includes("Path=/"));
  assert.ok(setCookie.includes("HttpOnly"));
  assert.ok(setCookie.includes("SameSite=Lax"));
  assert.ok(setCookie.includes("Max-Age="));
});

test("sessionCookieHeader with Max-Age=0 clears the cookie", () => {
  const header = sessionCookieHeader("", 0);
  assert.ok(header["Set-Cookie"].includes("Max-Age=0"));
});

test("createSessionToken rewrites iat/exp from server clock", async () => {
  const token = await createSessionToken({ ...payload, iat: 1, exp: 2 });
  const session = await verifySessionToken(token);
  assert.ok(session);
  const now = Math.floor(Date.now() / 1000);
  assert.ok(session.iat! >= now - 5);
  assert.ok(session.exp! > session.iat!);
});
