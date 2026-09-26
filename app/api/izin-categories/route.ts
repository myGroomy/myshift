import { fail, ok } from "@/lib/api-response";
import { requiredText } from "@/lib/domain/master-validation";
import { loadCategories } from "@/lib/google/ops-data";
import { appendRow } from "@/lib/google/sheets-data";
import { nextSequentialId } from "@/lib/ids";
import { adminSession, isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { records } = await loadCategories(branchId);
    return ok(records);
  } catch (error) {
    return fail("SHEETS_SETUP_REQUIRED", error instanceof Error ? error.message : "Spreadsheet cabang belum siap", 503);
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
    const id = nextSequentialId(records.map((record) => record.id), "KTG-", 3);
    await appendRow(spreadsheetId, "Kategori_Izin!A:C", [id, label, "TRUE"]);
    return ok({ id, label, aktif: true }, { status: 201 });
  } catch (error) {
    return fail("SHEETS_SETUP_REQUIRED", error instanceof Error ? error.message : "Kategori tidak valid", 400);
  }
}