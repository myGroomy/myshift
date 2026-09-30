import { handleRouteError, ok } from "@/lib/api-response";
import { normalizeSopCategory } from "@/lib/domain/checklist-spec-validation";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { loadSopCategories } from "@/lib/google/ops-data";
import { appendRow, readRows } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import { adminSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { records } = await loadSopCategories(branchId);
    return ok(records.map(({ rowNumber: _rowNumber, ...category }) => category));
  } catch (error) {
    return handleRouteError(error, "Gagal memuat kategori SOP");
  }
}

export async function POST(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { name, order } = normalizeSopCategory(await request.json());
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, branchSheetRange("SOP_Kategori"));
    const categoryId = nextSequentialId(rows.map((row) => row.values[0] ?? ""), ID_PREFIX.sopCategory);
    await appendRow(spreadsheetId, branchSheetRange("SOP_Kategori"), [categoryId, name, String(order), "TRUE"]);
    return ok({ categoryId, name, order, active: true }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Gagal membuat kategori SOP");
  }
}
