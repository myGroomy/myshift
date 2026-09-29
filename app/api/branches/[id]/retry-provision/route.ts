import { fail, handleRouteError, ok } from "@/lib/api-response";
import { adminSession, isResponse } from "@/lib/route-auth";
import { getBranchRows } from "@/lib/google/registry";
import { replaceRowById } from "@/lib/google/sheets-data";
import { provisionBranchDrive } from "@/lib/google/provisioning";
import { REGISTRY_SHEETS, maskSpreadsheetId, registrySheetRange } from "@/lib/google/sheet-schema";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

// Same budget as POST /api/branches: the copy runs through the Apps Script Drive bridge.
export const maxDuration = 60;

// Re-runs steps 3-5 of the row-first flow in API-CONTRACT §3 for a branch that never finished
// provisioning. The registry row is never deleted here — the branch already exists as far as the
// app is concerned, and dropping it would lose the ID history and any folder already created.
export async function POST(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  const registryId = process.env.REGISTRY_SPREADSHEET_ID!;
  const range = registrySheetRange(REGISTRY_SHEETS.branches);

  try {
    const row = (await getBranchRows()).find((entry) => entry.branch.branchId === id);
    if (!row) return fail("NOT_FOUND", "Cabang tidak ditemukan");
    // Re-provisioning a ready branch would overwrite a spreadsheet that may already hold real
    // schedules, which is riskier than the error it would fix.
    if (row.branch.provisionStatus === "ready") {
      return fail(
        "VALIDATION_ERROR",
        "Cabang ini sudah ter-provision. Provisioning ulang tidak diizinkan.",
      );
    }

    const provisioned = await provisionBranchDrive(
      row.branch.branchId,
      row.branch.nama,
      {
        // Both IDs come from the row so a retry is idempotent: the folder (and the checklist photos
        // inside it) is kept, and an existing copy that still matches the schema is reused instead
        // of making a second one (PLAN/Db refactor-plan.md Step 3.2).
        existingFolderId: row.branch.folderId,
        existingSpreadsheetId: row.branch.spreadsheetId,
      },
    );

    const saved = await replaceRowById(registryId, REGISTRY_SHEETS.branches, range, id, [
      row.branch.branchId,
      row.branch.nama,
      provisioned.spreadsheetId,
      provisioned.folderId,
      "ready",
      row.branch.aktif ? "TRUE" : "FALSE",
    ]);
    if (!saved) return fail("NOT_FOUND", "Cabang tidak ditemukan");

    return ok({
      branchId: id,
      spreadsheetId: maskSpreadsheetId(provisioned.spreadsheetId),
      folderConfigured: true,
      provisionStatus: "ready",
    });
  } catch (error) {
    return handleRouteError(error, "Provisioning cabang gagal");
  }
}
