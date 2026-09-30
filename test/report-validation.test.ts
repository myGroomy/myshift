import test from "node:test";
import assert from "node:assert/strict";
import { reportBranchId } from "@/lib/domain/report-validation";
import { DomainError } from "@/lib/error-codes";
import type { SessionPayload } from "@/lib/session";

const employeeSession: SessionPayload = {
  employeeId: "EMP-001",
  nama: "Karyawan",
  role: "karyawan",
  activeBranchId: "CBG001",
  branches: [
    { branchId: "CBG001", nama: "Cabang aktif" },
    { branchId: "CBG002", nama: "Cabang lain" },
  ],
};

test("karyawan hanya melihat laporan cabang aktif, meski terafiliasi dengan cabang lain", () => {
  assert.equal(reportBranchId(employeeSession, ""), "CBG001");
  assert.equal(reportBranchId(employeeSession, "CBG001"), "CBG001");
  assert.throws(() => reportBranchId(employeeSession, "CBG002"), (error: unknown) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.code, "FORBIDDEN");
    return true;
  });
});

test("admin dapat memilih satu cabang atau seluruh cabang", () => {
  const adminSession = { ...employeeSession, role: "admin" as const };
  assert.equal(reportBranchId(adminSession, ""), null);
  assert.equal(reportBranchId(adminSession, "CBG002"), "CBG002");
});
