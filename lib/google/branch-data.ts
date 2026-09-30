import { getBranches, type Branch, type ProvisionStatus } from "@/lib/google/registry";
import { requireSpreadsheetId } from "@/lib/google/sheets-data";
import { DomainError } from "@/lib/error-codes";
import type { ErrorCode } from "@/lib/error-codes";

// The single entry point every branch-scoped module uses to find its spreadsheet and Drive folder
// (PLAN/Db refactor-plan.md Step 3.1). The IDs live in `Daftar_Cabang` nothing here is
// hardcoded and nothing comes from a per-branch env var, so a branch is moved to a different
// spreadsheet by editing the Registry, not by redeploying.
//
// Caching: deliberately none. One registry read per request is cheap next to the branch-sheet
// reads that follow, and the PRD lets admins edit `Daftar_Cabang` in the spreadsheet itself a
// cache would serve the stale Spreadsheet_ID for the length of its TTL right when someone is
// repairing a broken branch.

export type BranchLookup = {
  branch: Branch;
  spreadsheetId: string;
  folderId: string;
  status: ProvisionStatus;
};

export type BranchUnavailable = { code: ErrorCode; reason: string };

// Pure, so the Step 4 acceptance rule ("pending/failed/nonaktif ditolak") is unit-testable
// without touching Sheets.
export function branchUnavailable(branch: Branch): BranchUnavailable | null {
  if (!branch.aktif) {
    return { code: "NOT_FOUND", reason: "Cabang tidak ditemukan atau tidak aktif" };
  }
  if (branch.provisionStatus !== "ready") {
    return {
      code: "SHEETS_SETUP_REQUIRED",
      reason:
        `Provision_Status cabang ${branch.branchId} masih "${branch.provisionStatus}" ` +
        "selesaikan lewat POST /api/branches/:id/retry-provision",
    };
  }
  return null;
}

export function isBranchUsable(branch: Branch): boolean {
  return branchUnavailable(branch) === null;
}

// For aggregate endpoints (dashboard, laporan) that iterate branches: one half-provisioned branch
// must not blank out the whole report. Skipped branches are logged so the gap is visible in the
// server log instead of silently thinning the numbers (API-CONTRACT §10).
export function usableBranches(branches: Branch[]): Branch[] {
  return branches.filter((branch) => {
    const unavailable = branchUnavailable(branch);
    if (!unavailable) return true;
    console.error(`[myshift] cabang ${branch.branchId} dilewati: ${unavailable.reason}`);
    return false;
  });
}

// Resolve without a second registry read when the caller already has the branch list
// (dashboard/laporan iterate branches and used to re-read the registry per branch).
export function branchSpreadsheetFrom(branch: Branch): BranchLookup {
  const unavailable = branchUnavailable(branch);
  if (unavailable) throw new DomainError(unavailable.code, unavailable.reason);
  return {
    branch,
    // Throws SHEETS_SETUP_REQUIRED if a `ready` row somehow has no spreadsheet ID.
    spreadsheetId: requireSpreadsheetId(branch.branchId, branch.spreadsheetId),
    folderId: branch.folderId,
    status: branch.provisionStatus,
  };
}

export async function branchSpreadsheet(branchId: string): Promise<BranchLookup> {
  const branch = (await getBranches()).find((entry) => entry.branchId === branchId);
  if (!branch) throw new DomainError("NOT_FOUND", "Cabang tidak ditemukan atau tidak aktif");
  return branchSpreadsheetFrom(branch);
}
