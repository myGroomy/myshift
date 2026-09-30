import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { createSessionToken, COOKIE_NAME } from "@/lib/session";

// These tests verify the middleware auth guard that protects all pages and API routes.
// Seam: middleware.ts the single entry point for all requests.

function makeRequest(path: string, cookie?: string): NextRequest {
  const url = `http://localhost${path}`;
  const req = new NextRequest(url);
  if (cookie) req.cookies.set(COOKIE_NAME, cookie);
  return req;
}

async function makeSessionCookie(role: "admin" | "petugas" = "petugas") {
  const token = await createSessionToken({
    employeeId: "EMP-001",
    nama: "Test",
    role,
    branches: [{ branchId: "CBG001", nama: "Test" }],
    activeBranchId: "CBG001",
  });
  return token;
}

// ---------------------------------------------------------------------------
// Public paths (no auth needed)
// ---------------------------------------------------------------------------
test("middleware: allows /api/auth/login without session", async () => {
  const req = makeRequest("/api/auth/login");
  const res = await middleware(req);
  assert.equal(res.status, 200);
});

test("middleware: allows /api/auth/logout without session", async () => {
  const req = makeRequest("/api/auth/logout");
  const res = await middleware(req);
  assert.equal(res.status, 200);
});

test("middleware: allows /api/public/reports/:token without session", async () => {
  const req = makeRequest("/api/public/reports/abc123");
  const res = await middleware(req);
  assert.equal(res.status, 200);
});

test("middleware: allows /login page without session", async () => {
  const req = makeRequest("/login");
  const res = await middleware(req);
  assert.equal(res.status, 200);
});

test("middleware: allows / (landing) without session", async () => {
  const req = makeRequest("/");
  const res = await middleware(req);
  assert.equal(res.status, 200);
});

test("middleware: allows /laporan-publik/:token without session", async () => {
  const req = makeRequest("/laporan-publik/abc123");
  const res = await middleware(req);
  assert.equal(res.status, 200);
});

// ---------------------------------------------------------------------------
// Protected API paths (need session)
// ---------------------------------------------------------------------------
test("middleware: returns 401 for protected API without session", async () => {
  const req = makeRequest("/api/schedules");
  const res = await middleware(req);
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error.code, "UNAUTHORIZED");
});

test("middleware: returns 401 for /api/dashboard without session", async () => {
  const req = makeRequest("/api/dashboard");
  const res = await middleware(req);
  assert.equal(res.status, 401);
});

test("middleware: allows protected API with valid session", async () => {
  const cookie = await makeSessionCookie();
  const req = makeRequest("/api/schedules", cookie);
  const res = await middleware(req);
  assert.equal(res.status, 200);
});

// ---------------------------------------------------------------------------
// Protected pages (need session)
// ---------------------------------------------------------------------------
test("middleware: redirects to /login when accessing protected page without session", async () => {
  const req = makeRequest("/dashboard");
  const res = await middleware(req);
  assert.equal(res.status, 307);
  assert.ok(res.headers.get("location")?.includes("/login"));
});

test("middleware: redirects to /login with next param", async () => {
  const req = makeRequest("/jadwal");
  const res = await middleware(req);
  assert.equal(res.status, 307);
  const location = res.headers.get("location") ?? "";
  assert.ok(location.includes("/login"));
  // URLSearchParams encodes the path, so "next=/jadwal" becomes "next=%2Fjadwal" or similar
  assert.ok(location.includes("next="));
});

test("middleware: allows protected page with valid session", async () => {
  const cookie = await makeSessionCookie();
  const req = makeRequest("/dashboard", cookie);
  const res = await middleware(req);
  // /dashboard is admin-only, so Petugas gets redirected to /jadwal-saya
  assert.equal(res.status, 307);
  assert.ok(res.headers.get("location")?.includes("/jadwal-saya"));
});

// ---------------------------------------------------------------------------
// Role-based redirects
// ---------------------------------------------------------------------------
test("middleware: redirects admin from /login to /dashboard", async () => {
  const cookie = await makeSessionCookie("admin");
  const req = makeRequest("/login", cookie);
  const res = await middleware(req);
  assert.equal(res.status, 307);
  assert.ok(res.headers.get("location")?.includes("/dashboard"));
});

test("middleware: redirects Petugas from /login to /jadwal-saya", async () => {
  const cookie = await makeSessionCookie("petugas");
  const req = makeRequest("/login", cookie);
  const res = await middleware(req);
  assert.equal(res.status, 307);
  assert.ok(res.headers.get("location")?.includes("/jadwal-saya"));
});

test("middleware: redirects Petugas from /dashboard to /jadwal-saya", async () => {
  const cookie = await makeSessionCookie("petugas");
  const req = makeRequest("/dashboard", cookie);
  const res = await middleware(req);
  assert.equal(res.status, 307);
  assert.ok(res.headers.get("location")?.includes("/jadwal-saya"));
});

test("middleware: redirects admin from /jadwal-saya to /dashboard", async () => {
  const cookie = await makeSessionCookie("admin");
  const req = makeRequest("/jadwal-saya", cookie);
  const res = await middleware(req);
  assert.equal(res.status, 307);
  assert.ok(res.headers.get("location")?.includes("/dashboard"));
});

test("middleware: allows Petugas to access /jadwal-saya", async () => {
  const cookie = await makeSessionCookie("petugas");
  const req = makeRequest("/jadwal-saya", cookie);
  const res = await middleware(req);
  assert.equal(res.status, 200);
});

test("middleware: allows admin to access /dashboard", async () => {
  const cookie = await makeSessionCookie("admin");
  const req = makeRequest("/dashboard", cookie);
  const res = await middleware(req);
  assert.equal(res.status, 200);
});
