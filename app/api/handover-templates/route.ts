import { handleRouteError, ok } from "@/lib/api-response";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { adminSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import { optionalBoolean, requiredText } from "@/lib/domain/master-validation";
import { appendRow, readRows } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import type { NextRequest } from "next/server";

// Contract §9: handover templates are Admin-only (FULL-PRD §6.7).
export async function GET(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, branchSheetRange("Handover_Template"));

    // Header row already stripped by readRows() — do not slice a second time (audit H-6).
    const records = rows.map((row) => ({
      fieldId: row.values[0] ?? "",
      label: row.values[1] ?? "",
      isRequired: (row.values[2] ?? "FALSE").toUpperCase() === "TRUE",
      order: Number(row.values[3] ?? "0") || 0,
    }));

    return ok(records);
  } catch (error) {
    return handleRouteError(error, "Gagal memuat template handover");
  }
}

export async function POST(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const body = await request.json();
    const label = requiredText(body.label, "label");
    const isRequired = optionalBoolean(body.isRequired, "isRequired", false);

    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, branchSheetRange("Handover_Template"));
    const fieldId = nextSequentialId(rows.map((row) => row.values[0] ?? ""), ID_PREFIX.handoverField);
    await appendRow(spreadsheetId, branchSheetRange("Handover_Template"), [
      fieldId,
      label,
      isRequired ? "TRUE" : "FALSE",
      "0",
    ]);

    return ok({ fieldId, label, isRequired }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Gagal membuat template handover");
  }
}
