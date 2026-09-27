import { fail, handleRouteError, ok } from "@/lib/api-response";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { branchManagerSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import { optionalBoolean, optionalText } from "@/lib/domain/master-validation";
import { deleteRowById, readRows, replaceRowById } from "@/lib/google/sheets-data";
import { BRANCH_HEADERS, branchSheetRange, padRow } from "@/lib/google/sheet-schema";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await branchManagerSession(request);
  if (isResponse(auth)) return auth;
  const { id: itemId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const body = await request.json();
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, branchSheetRange("Checklist_Template"));
    const row = rows.find((entry) => entry.values[0] === itemId);
    if (!row) return fail("NOT_FOUND", "Item tidak ditemukan");

    const values = padRow(row.values, BRANCH_HEADERS.Checklist_Template.length);
    values[0] = itemId;
    values[2] = optionalText(body.description, "description", values[2] ?? "");
    values[3] = optionalBoolean(body.requiresPhoto, "requiresPhoto", (values[3] ?? "TRUE").toUpperCase() === "TRUE")
      ? "TRUE"
      : "FALSE";
    if (body.active !== undefined) {
      values[5] = optionalBoolean(body.active, "active", true) ? "TRUE" : "FALSE";
    }

    await replaceRowById(spreadsheetId, "Checklist_Template", branchSheetRange("Checklist_Template"), itemId, values);
    return ok({ itemId });
  } catch (error) {
    return handleRouteError(error, "Gagal mengupdate template checklist");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await branchManagerSession(request);
  if (isResponse(auth)) return auth;
  const { id: itemId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const deleted = await deleteRowById(spreadsheetId, "Checklist_Template", branchSheetRange("Checklist_Template"), itemId);
    if (!deleted) return fail("NOT_FOUND", "Item tidak ditemukan");
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error, "Gagal menghapus template checklist");
  }
}
