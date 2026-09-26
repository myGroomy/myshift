import { getBranches } from "@/lib/google/registry";
import { requireSpreadsheetId } from "@/lib/google/sheets-data";

export async function branchSpreadsheet(branchId: string) {
  const branch = (await getBranches()).find((entry) => entry.branchId === branchId && entry.aktif);
  if (!branch) throw new Error("Cabang tidak ditemukan atau tidak aktif");
  return { branch, spreadsheetId: requireSpreadsheetId(branchId, branch.spreadsheetId) };
}
