import { handleRouteError, ok } from "@/lib/api-response";
import { adminSession, isResponse } from "@/lib/route-auth";
import { requiredText } from "@/lib/domain/master-validation";
import { getBranches } from "@/lib/google/registry";
import { appendRow } from "@/lib/google/sheets-data";
import { createBranchSpreadsheet } from "@/lib/google/provisioning";
import { REGISTRY_SHEETS, maskSpreadsheetId, registrySheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  // The Google spreadsheet ID stays server-side; the UI only needs to know it exists.
  return ok(
    (await getBranches()).map((branch) => ({
      ...branch,
      spreadsheetId: maskSpreadsheetId(branch.spreadsheetId),
      spreadsheetConfigured: Boolean(branch.spreadsheetId),
    }))
  );
}

export async function POST(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const body = await request.json();
    const name = requiredText(body.name, "name");
    const branches = await getBranches();
    const branchId = nextSequentialId(branches.map((branch) => branch.branchId), ID_PREFIX.branch);

    // Provision BEFORE writing the registry row: a branch without Spreadsheet_ID makes every
    // branch-scoped endpoint fail, and that broken state used to be committed silently (H-5).
    const spreadsheetId = await createBranchSpreadsheet(branchId, name);
    await appendRow(process.env.REGISTRY_SPREADSHEET_ID!, registrySheetRange(REGISTRY_SHEETS.branches), [
      branchId,
      name,
      spreadsheetId,
      "TRUE",
    ]);

    return ok({ branchId, name, spreadsheetId: maskSpreadsheetId(spreadsheetId), spreadsheetConfigured: true, aktif: true }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Data cabang tidak valid");
  }
}
