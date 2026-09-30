import test from "node:test";
import assert from "node:assert/strict";
import { resolveBranchId, isResponse } from "@/lib/route-auth";
import { DomainError } from "@/lib/error-codes";
import { NextResponse } from "next/server";

// These tests verify the route-level auth helpers that every protected API route uses.
// Seam: lib/route-auth.ts resolveBranchId + isResponse type guard.

const adminSession = {
  employeeId: "EMP-001",
  nama: "Admin",
  role: "admin" as const,
  branches: [{ branchId: "CBG001", nama: "Pusat" }],
  activeBranchId: "CBG001",
};

const staffSession = {
  employeeId: "EMP-002",
  nama: "Staff",
  role: "petugas" as const,
  branches: [
    { branchId: "CBG001", nama: "Pusat" },
    { branchId: "CBG002", nama: "Cabang 2" },
  ],
  activeBranchId: "CBG001",
};

// ---------------------------------------------------------------------------
// resolveBranchId
// ---------------------------------------------------------------------------
test("resolveBranchId: admin can use any branch", () => {
  assert.equal(resolveBranchId(adminSession, "CBG999"), "CBG999");
});

test("resolveBranchId: admin falls back to activeBranchId when no branchId", () => {
  assert.equal(resolveBranchId(adminSession), "CBG001");
  assert.equal(resolveBranchId(adminSession, ""), "CBG001");
  assert.equal(resolveBranchId(adminSession, "   "), "CBG001");
});

test("resolveBranchId: admin throws VALIDATION_ERROR when no branchId and no activeBranchId", () => {
  const noBranch = { ...adminSession, activeBranchId: "" };
  assert.throws(() => resolveBranchId(noBranch), (err: unknown) => {
    assert.ok(err instanceof DomainError);
    assert.equal(err.code, "VALIDATION_ERROR");
    return true;
  });
});

test("resolveBranchId: staff can use their own branch", () => {
  assert.equal(resolveBranchId(staffSession, "CBG002"), "CBG002");
});

test("resolveBranchId: staff falls back to activeBranchId", () => {
  assert.equal(resolveBranchId(staffSession), "CBG001");
});

test("resolveBranchId: staff cannot use a branch not in their list", () => {
  assert.throws(() => resolveBranchId(staffSession, "CBG999"), (err: unknown) => {
    assert.ok(err instanceof DomainError);
    assert.equal(err.code, "FORBIDDEN");
    return true;
  });
});

test("resolveBranchId: staff throws FORBIDDEN when no branchId and no activeBranchId", () => {
  const noBranch = { ...staffSession, activeBranchId: "" };
  assert.throws(() => resolveBranchId(noBranch), (err: unknown) => {
    assert.ok(err instanceof DomainError);
    assert.equal(err.code, "FORBIDDEN");
    return true;
  });
});

test("resolveBranchId: trims whitespace from requested branchId", () => {
  assert.equal(resolveBranchId(staffSession, "  CBG002  "), "CBG002");
});

// ---------------------------------------------------------------------------
// isResponse
// ---------------------------------------------------------------------------
test("isResponse returns true for NextResponse", () => {
  const res = NextResponse.json({ success: true });
  assert.equal(isResponse(res), true);
});

test("isResponse returns false for session payload", () => {
  assert.equal(isResponse(adminSession), false);
  assert.equal(isResponse(staffSession), false);
});
