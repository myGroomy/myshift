import { fail, handleRouteError, ok } from "@/lib/api-response";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { adminSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import { optionalBoolean, optionalText } from "@/lib/domain/master-validation";
import { deleteRowById, readRows, replaceRowById } from "@/lib/google/sheets-data";
import { BRANCH_HEADERS, branchSheetRange, padRow } from "@/lib/google/sheet-schema";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id: fieldId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const body = await request.json();
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, branchSheetRange("Handover_Template"));
    const row = rows.find((entry) => entry.values[0] === fieldId);
    if (!row) return fail("NOT_FOUND", "Field tidak ditemukan");

    const values = padRow(row.values, BRANCH_HEADERS.Handover_Template.length);
    values[0] = fieldId;
    values[1] = optionalText(body.label, "label", values[1] ?? "");
    values[2] = optionalBoolean(body.isRequired, "isRequired", (values[2] ?? "FALSE").toUpperCase() === "TRUE")
      ? "TRUE"
      : "FALSE";

    await replaceRowById(spreadsheetId, "Handover_Template", branchSheetRange("Handover_Template"), fieldId, values);
    return ok({ fieldId });
  } catch (error) {
    return handleRouteError(error, "Gagal mengupdate template handover");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id: fieldId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const deleted = await deleteRowById(spreadsheetId, "Handover_Template", branchSheetRange("Handover_Template"), fieldId);
    if (!deleted) return fail("NOT_FOUND", "Field tidak ditemukan");
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error, "Gagal menghapus template handover");
  }
}
