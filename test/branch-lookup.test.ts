import test from "node:test";
import assert from "node:assert/strict";
import {
  branchSpreadsheetFrom,
  branchUnavailable,
  isBranchUsable,
  usableBranches,
  type BranchLookup,
} from "@/lib/google/branch-data";
import type { Branch } from "@/lib/google/registry";
import { isDomainError } from "@/lib/error-codes";

// PLAN/Db refactor-plan.md Step 3.1 + Step 4: every module that needs a branch spreadsheet goes
// through one lookup, and a branch that is not `ready` (or is inactive) must be rejected with a
// clear error instead of being handed half-configured IDs.

const ready: Branch = {
  branchId: "CBG001",
  nama: "Mochikin Pusat",
  spreadsheetId: "1AbCdEfGhIjKlMnOp",
  folderId: "1FolderIdForTheBranch",
  provisionStatus: "ready",
  aktif: true,
  timezone: "Asia/Jakarta",
  createdAt: "2026-09-30T00:00:00Z",
  updatedAt: "2026-09-30T00:00:00Z",
};

const withStatus = (provisionStatus: Branch["provisionStatus"], overrides: Partial<Branch> = {}): Branch => ({
  ...ready,
  provisionStatus,
  ...overrides,
});

test("a ready, active branch resolves to its spreadsheet, folder and status", () => {
  const lookup: BranchLookup = branchSpreadsheetFrom(ready);
  assert.equal(lookup.spreadsheetId, ready.spreadsheetId);
  assert.equal(lookup.folderId, ready.folderId);
  assert.equal(lookup.status, "ready");
  assert.equal(lookup.branch.branchId, "CBG001");
});

test("pending and failed branches are rejected with SHEETS_SETUP_REQUIRED", () => {
  for (const status of ["pending", "failed"] as const) {
    const unavailable = branchUnavailable(withStatus(status));
    assert.ok(unavailable, `${status} must be rejected`);
    assert.equal(unavailable.code, "SHEETS_SETUP_REQUIRED");
    assert.match(unavailable.reason, new RegExp(status));

    assert.throws(
      () => branchSpreadsheetFrom(withStatus(status)),
      (error: unknown) => {
        assert.ok(isDomainError(error));
        assert.equal(error.code, "SHEETS_SETUP_REQUIRED");
        assert.equal(error.status, 503);
        return true;
      },
    );
  }
});

test("an inactive branch reads as not found, even when it is fully provisioned", () => {
  const unavailable = branchUnavailable({ ...ready, aktif: false });
  assert.equal(unavailable?.code, "NOT_FOUND");
  assert.throws(() => branchSpreadsheetFrom({ ...ready, aktif: false }), /tidak aktif|tidak ditemukan/);
});

test("a failed branch is rejected before its stale spreadsheet ID is even looked at", () => {
  // A row can carry an ID from a previous attempt; status wins, so the app never silently uses a
  // spreadsheet the Registry says is not usable.
  const unavailable = branchUnavailable(withStatus("failed", { spreadsheetId: "1StaleSpreadsheetId" }));
  assert.equal(unavailable?.code, "SHEETS_SETUP_REQUIRED");
});

test("isBranchUsable mirrors branchUnavailable", () => {
  assert.equal(isBranchUsable(ready), true);
  assert.equal(isBranchUsable(withStatus("pending")), false);
  assert.equal(isBranchUsable({ ...ready, aktif: false }), false);
});

test("usableBranches filters out unusable branches and keeps the rest in order", () => {
  const branches = [
    ready,
    withStatus("pending", { branchId: "CBG002" }),
    { ...ready, branchId: "CBG003", aktif: false },
    withStatus("ready", { branchId: "CBG004" }),
  ];

  assert.deepEqual(
    usableBranches(branches).map((branch) => branch.branchId),
    ["CBG001", "CBG004"],
  );
});
