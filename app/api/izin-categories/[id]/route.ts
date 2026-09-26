import { fail, ok } from "@/lib/api-response";
import { loadCategories } from "@/lib/google/ops-data";
import { replaceRow } from "@/lib/google/sheets-data";
import { adminSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId, records } = await loadCategories(branchId);
    const record = records.find((entry) => entry.id === id);
    if (!record) return fail("NOT_FOUND", "Kategori tidak ditemukan", 404);
    await replaceRow(spreadsheetId, "Kategori_Izin", record.rowNumber, [record.id, record.label, "FALSE"]);
    return ok({ id, deleted: true });
  } catch (error) {
    return fail("SHEETS_SETUP_REQUIRED", error instanceof Error ? error.message : "Gagal menghapus kategori", 400);
  }
}