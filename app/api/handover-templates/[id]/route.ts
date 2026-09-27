import { fail, ok } from "@/lib/api-response";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { adminSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import { readRows, replaceRow, deleteRow } from "@/lib/google/sheets-data";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id: fieldId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const body = await request.json() as { label?: string; isRequired?: boolean };
    const { label, isRequired } = body;

    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, "Handover_Template!A:D");
    const row = rows.find((r) => r.values[0] === fieldId);
    if (!row) return fail("NOT_FOUND", "Field tidak ditemukan", 404);

    const newLabel = label ?? row.values[1] ?? "";
    const newRequired = isRequired !== undefined ? (isRequired ? "TRUE" : "FALSE") : (row.values[2] ?? "FALSE");
    await replaceRow(spreadsheetId, "Handover_Template", row.rowNumber, [fieldId, newLabel, newRequired, row.values[3] ?? "0"]);

    return ok({ fieldId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengupdate template";
    const code = message.includes("Cabang") ? "FORBIDDEN" : "INTERNAL_ERROR";
    return fail(code, message, code === "FORBIDDEN" ? 403 : 500);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id: fieldId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, "Handover_Template!A:D");
    const row = rows.find((r) => r.values[0] === fieldId);
    if (!row) return fail("NOT_FOUND", "Field tidak ditemukan", 404);

    await deleteRow(spreadsheetId, "Handover_Template", row.rowNumber);

    return ok({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus template";
    const code = message.includes("Cabang") ? "FORBIDDEN" : "INTERNAL_ERROR";
    return fail(code, message, code === "FORBIDDEN" ? 403 : 500);
  }
}
