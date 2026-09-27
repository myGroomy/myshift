import { getBranches, type Branch } from "@/lib/google/registry";
import { requireSpreadsheetId } from "@/lib/google/sheets-data";
import { DomainError } from "@/lib/error-codes";

// Resolve without a second registry read when the caller already has the branch list
// (dashboard/laporan iterate branches and used to re-read the registry per branch).
export function branchSpreadsheetFrom(branch: Branch) {
  if (!branch.aktif) throw new DomainError("NOT_FOUND", "Cabang tidak ditemukan atau tidak aktif");
  return { branch, spreadsheetId: requireSpreadsheetId(branch.branchId, branch.spreadsheetId) };
}

export async function branchSpreadsheet(branchId: string) {
  const branch = (await getBranches()).find((entry) => entry.branchId === branchId);
  if (!branch) throw new DomainError("NOT_FOUND", "Cabang tidak ditemukan atau tidak aktif");
  return branchSpreadsheetFrom(branch);
}
