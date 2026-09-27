import { handleRouteError, ok } from "@/lib/api-response";
import { requiredText } from "@/lib/domain/master-validation";
import { loadCategories } from "@/lib/google/ops-data";
import { appendRow } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import { adminSession, isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { records } = await loadCategories(branchId);
    return ok(records.map(({ rowNumber: _row, ...category }) => category));
  } catch (error) {
    return handleRouteError(error, "Gagal memuat kategori izin");
  }
}

export async function POST(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const body = await request.json();
    const label = requiredText(body.label, "label");
    const branchId = resolveBranchId(auth, body.branchId ?? request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId, records } = await loadCategories(branchId);
    const id = nextSequentialId(records.map((record) => record.id), ID_PREFIX.category);
    await appendRow(spreadsheetId, branchSheetRange("Kategori_Izin"), [id, label, "TRUE"]);
    return ok({ id, label, aktif: true }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Kategori tidak valid");
  }
}
