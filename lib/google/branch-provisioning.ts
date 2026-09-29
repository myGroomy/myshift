import { DomainError } from "@/lib/error-codes";
import { replaceRowById } from "@/lib/google/sheets-data";
import { REGISTRY_SHEETS, registrySheetRange } from "@/lib/google/sheet-schema";
import { provisionBranchDrive } from "@/lib/google/provisioning";
import type { Branch } from "@/lib/google/registry";

// Provisioning untuk cabang yang barisnya SUDAH ada di `Daftar_Cabang` (status `pending`/`failed`) —
// langkah 3-6 dari alur row-first di API-CONTRACT §3. Satu implementasi untuk dua pemanggil:
//   - `POST /api/branches/:id/retry-provision`
//   - `pnpm provision:branch -- --id=CBG001` (CLI, untuk cabang yang gagal saat setup dan tidak mau
//     lewat HTTP)
//
// Baris tidak pernah dihapus di sini: berbeda dari pembuatan cabang baru (yang rollback), retry
// harus mempertahankan ID dan folder yang sudah ada.

const BRANCH_RANGE = registrySheetRange(REGISTRY_SHEETS.branches);

export type ProvisionExistingResult = {
  branchId: string;
  spreadsheetId: string;
  folderId: string;
  status: "ready";
};

export async function provisionExistingBranch(branch: Branch): Promise<ProvisionExistingResult> {
  // Reprovisioning cabang `ready` akan menimpa spreadsheet yang mungkin sudah berisi jadwal nyata;
  // risiko itu lebih besar daripada errornya.
  if (branch.provisionStatus === "ready") {
    throw new DomainError(
      "VALIDATION_ERROR",
      "Cabang ini sudah ter-provision. Provisioning ulang tidak diizinkan.",
    );
  }
  if (!branch.nama.trim()) {
    throw new DomainError("VALIDATION_ERROR", `Baris ${branch.branchId} tidak punya Nama_Cabang.`);
  }

  // Folder dan salinan yang sudah tercatat dipakai ulang (Step 3.2 idempotensi) supaya retry tidak
  // membuat folder kedua atau salinan kedua, yang berarti membakar kuota Drive tanpa alasan.
  const provisioned = await provisionBranchDrive(branch.branchId, branch.nama, {
    existingFolderId: branch.folderId,
    existingSpreadsheetId: branch.spreadsheetId,
  });

  const saved = await replaceRowById(
    process.env.REGISTRY_SPREADSHEET_ID!,
    REGISTRY_SHEETS.branches,
    BRANCH_RANGE,
    branch.branchId,
    [
      branch.branchId,
      branch.nama,
      provisioned.spreadsheetId,
      provisioned.folderId,
      "ready",
      branch.aktif ? "TRUE" : "FALSE",
    ],
  );
  if (!saved) {
    throw new DomainError("NOT_FOUND", `Baris ${branch.branchId} hilang saat provisioning.`);
  }

  return {
    branchId: branch.branchId,
    spreadsheetId: provisioned.spreadsheetId,
    folderId: provisioned.folderId,
    status: "ready",
  };
}
