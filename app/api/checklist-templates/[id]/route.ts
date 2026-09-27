import { fail, ok } from "@/lib/api-response";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { adminSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import { readRows, replaceRow, deleteRow } from "@/lib/google/sheets-data";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id: itemId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const body = await request.json() as { description?: string; requiresPhoto?: boolean };
    const { description, requiresPhoto } = body;

    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, "Checklist_Template!A:G");
    const row = rows.find((r) => r.values[0] === itemId);
    if (!row) return fail("NOT_FOUND", "Item tidak ditemukan", 404);

    const newDesc = description ?? row.values[2] ?? "";
    const newPhoto = requiresPhoto !== undefined ? (requiresPhoto ? "TRUE" : "FALSE") : (row.values[3] ?? "FALSE");
    await replaceRow(spreadsheetId, "Checklist_Template", row.rowNumber, [itemId, row.values[1] ?? "", newDesc, newPhoto, row.values[4] ?? "0", row.values[5] ?? "TRUE"]);

    return ok({ itemId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengupdate template";
    const code = message.includes("Cabang") ? "FORBIDDEN" : "INTERNAL_ERROR";
    return fail(code, message, code === "FORBIDDEN" ? 403 : 500);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id: itemId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, "Checklist_Template!A:G");
    const row = rows.find((r) => r.values[0] === itemId);
    if (!row) return fail("NOT_FOUND", "Item tidak ditemukan", 404);

    await deleteRow(spreadsheetId, "Checklist_Template", row.rowNumber);

    return ok({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus template";
    const code = message.includes("Cabang") ? "FORBIDDEN" : "INTERNAL_ERROR";
    return fail(code, message, code === "FORBIDDEN" ? 403 : 500);
  }
}
