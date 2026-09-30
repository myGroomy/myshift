import { fail, handleRouteError, ok } from "@/lib/api-response";
import { loadIncidentCategories } from "@/lib/google/ops-data";
import { replaceRowById } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { adminSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

// Soft delete: Kategori_Incident rows are referenced by Incidents history, so they are deactivated.
export async function DELETE(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId, records } = await loadIncidentCategories(branchId);
    const record = records.find((entry) => entry.id === id);
    if (!record) return fail("NOT_FOUND", "Kategori tidak ditemukan");

    const saved = await replaceRowById(spreadsheetId, "Kategori_Incident", branchSheetRange("Kategori_Incident"), id, [
      record.id,
      record.label,
      "FALSE",
    ]);
    if (!saved) return fail("NOT_FOUND", "Kategori tidak ditemukan");

    return ok({ id, deleted: true });
  } catch (error) {
    return handleRouteError(error, "Gagal menghapus kategori");
  }
}
