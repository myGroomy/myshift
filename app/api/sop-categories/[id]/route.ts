import { fail, handleRouteError, ok } from "@/lib/api-response";
import { normalizeSopCategory } from "@/lib/domain/checklist-spec-validation";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { loadChecklistPoints } from "@/lib/google/ops-data";
import { readRows, replaceRowById } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { adminSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

async function saveCategory(request: NextRequest, id: string, active?: boolean) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, branchSheetRange("SOP_Kategori"));
    const row = rows.find((entry) => entry.values[0] === id);
    if (!row) return fail("NOT_FOUND", "Kategori SOP tidak ditemukan");
    const current = {
      name: row.values[1] ?? "",
      order: Number(row.values[2] ?? "0") || 0,
      active: (row.values[3] ?? "TRUE").toUpperCase() === "TRUE",
    };
    const body = request.method === "PATCH" ? await request.json() : {};
    const input = normalizeSopCategory({ ...current, ...body, ...(active === undefined ? {} : { active }) });
    if (!input.active) {
      const { records: points } = await loadChecklistPoints(branchId);
      if (points.some((point) => point.categoryId === id && point.active)) {
        return fail("VALIDATION_ERROR", "Nonaktifkan atau pindahkan checklist point aktif sebelum menonaktifkan SOP");
      }
    }
    const saved = await replaceRowById(spreadsheetId, "SOP_Kategori", branchSheetRange("SOP_Kategori"), id, [
      id,
      input.name,
      String(input.order),
      input.active ? "TRUE" : "FALSE",
    ]);
    if (!saved) return fail("NOT_FOUND", "Kategori SOP tidak ditemukan");
    return ok({ categoryId: id, ...input });
  } catch (error) {
    return handleRouteError(error, "Gagal mengubah kategori SOP");
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  return saveCategory(request, id);
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id } = await context.params;
  return saveCategory(request, id, false);
}
