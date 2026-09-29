import { handleRouteError, ok } from "@/lib/api-response";
import { adminSession, isResponse } from "@/lib/route-auth";
import { requiredText } from "@/lib/domain/master-validation";
import { getBranches } from "@/lib/google/registry";
import { appendRow, deleteRowById, replaceRowById } from "@/lib/google/sheets-data";
import { provisionBranchDrive } from "@/lib/google/provisioning";
import { REGISTRY_SHEETS, maskSpreadsheetId, registrySheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import type { NextRequest } from "next/server";

const REGISTRY_ID = () => process.env.REGISTRY_SPREADSHEET_ID!;
const BRANCH_RANGE = registrySheetRange(REGISTRY_SHEETS.branches);

export async function GET(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  // The Google spreadsheet ID stays server-side; the UI only needs to know it exists.
  // `spreadsheetConfigured` is derived from Provision_Status, not a bare non-empty ID, so a row
  // that was reserved but never finished provisioning does not look green (API-CONTRACT §3).
  return ok(
    (await getBranches()).map((branch) => ({
      branchId: branch.branchId,
      nama: branch.nama,
      spreadsheetId: maskSpreadsheetId(branch.spreadsheetId),
      spreadsheetConfigured: branch.provisionStatus === "ready" && Boolean(branch.spreadsheetId),
      folderConfigured: Boolean(branch.folderId),
      provisionStatus: branch.provisionStatus,
      aktif: branch.aktif,
    })),
  );
}

export async function POST(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const registryId = REGISTRY_ID();

  let branchId = "";
  let rowWritten = false;
  let folderId = "";

  try {
    const body = await request.json();
    const name = requiredText(body.name, "name");
    const branches = await getBranches();
    branchId = nextSequentialId(branches.map((branch) => branch.branchId), ID_PREFIX.branch);

    // Row-first (API-CONTRACT §3): reserve the ID with a pending row before calling Drive, so a
    // Drive failure cannot silently consume a branch ID, then finish or roll the row back.
    await appendRow(registryId, BRANCH_RANGE, [branchId, name, "", "", "pending", "TRUE"]);
    rowWritten = true;

    const provisioned = await provisionBranchDrive(branchId, name);
    folderId = provisioned.folderId;

    const saved = await replaceRowById(
      registryId,
      REGISTRY_SHEETS.branches,
      BRANCH_RANGE,
      branchId,
      [branchId, name, provisioned.spreadsheetId, provisioned.folderId, "ready", "TRUE"],
    );
    if (!saved) throw new Error(`Baris ${branchId} hilang saat provisioning`);

    return ok(
      {
        branchId,
        name,
        spreadsheetId: maskSpreadsheetId(provisioned.spreadsheetId),
        spreadsheetConfigured: true,
        folderConfigured: true,
        provisionStatus: "ready",
        aktif: true,
      },
      { status: 201 },
    );
  } catch (error) {
    // Mark failed first, then delete, so if the delete itself fails the row is at least visible
    // as broken in the admin list instead of looking like a branch that is merely pending.
    if (rowWritten && branchId) {
      await markFailedThenDelete(registryId, branchId, folderId);
    }
    return handleRouteError(error, "Data cabang tidak valid");
  }
}

async function markFailedThenDelete(registryId: string, branchId: string, folderId: string) {
  try {
    await replaceRowById(registryId, REGISTRY_SHEETS.branches, BRANCH_RANGE, branchId, [
      branchId,
      "",
      "",
      folderId,
      "failed",
      "FALSE",
    ]);
  } catch {
    // Best-effort; the delete below is what actually clears the row.
  }
  try {
    await deleteRowById(registryId, REGISTRY_SHEETS.branches, BRANCH_RANGE, branchId);
  } catch {
    // Nothing further we can do — a leftover row is recoverable via the admin UI.
  }
}
