import { handleRouteError, ok } from "@/lib/api-response";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { branchManagerSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import { requiredText, optionalBoolean } from "@/lib/domain/master-validation";
import { validChecklistType } from "@/lib/domain/checklist-handover-validation";
import { appendRow, readRows } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import type { NextRequest } from "next/server";

// Contract §8: Admin + Kepala Cabang, scoped to the caller's own branch.
export async function GET(request: NextRequest) {
  const auth = await branchManagerSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, branchSheetRange("Checklist_Template"));

    // readRows() already drops the header row — slicing again used to hide the first item.
    const records = rows.map((row) => ({
      itemId: row.values[0] ?? "",
      type: row.values[1] ?? "",
      description: row.values[2] ?? "",
      requiresPhoto: (row.values[3] ?? "FALSE").toUpperCase() === "TRUE",
      order: Number(row.values[4] ?? "0") || 0,
      active: (row.values[5] ?? "TRUE").toUpperCase() === "TRUE",
    }));

    return ok(records);
  } catch (error) {
    return handleRouteError(error, "Gagal memuat template checklist");
  }
}

export async function POST(request: NextRequest) {
  const auth = await branchManagerSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const body = await request.json();
    const type = validChecklistType(body.type);
    const description = requiredText(body.description, "description");
    const requiresPhoto = optionalBoolean(body.requiresPhoto, "requiresPhoto", false);

    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, branchSheetRange("Checklist_Template"));
    const itemId = nextSequentialId(rows.map((row) => row.values[0] ?? ""), ID_PREFIX.checklistItem);
    await appendRow(spreadsheetId, branchSheetRange("Checklist_Template"), [
      itemId,
      type,
      description,
      requiresPhoto ? "TRUE" : "FALSE",
      "0",
      "TRUE",
    ]);

    return ok({ itemId, type, description, requiresPhoto }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Gagal membuat template checklist");
  }
}
