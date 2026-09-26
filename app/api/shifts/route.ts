import { ok, fail } from "@/lib/api-response";
import { adminSession, isResponse } from "@/lib/route-auth";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { appendRow, readRows } from "@/lib/google/sheets-data";
import { nextSequentialId } from "@/lib/ids";
import { requiredText, validTime } from "@/lib/domain/master-validation";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const branchId = request.nextUrl.searchParams.get("branchId");
  if (!branchId) return fail("INVALID_REQUEST", "branchId wajib diisi", 400);
  try {
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, "Shifts!A:D");
    return ok(rows.map(({ values }) => ({ shiftId: values[0], name: values[1], startTime: values[2], endTime: values[3], branchId })));
  } catch (error) {
    return fail("SHEETS_SETUP_REQUIRED", error instanceof Error ? error.message : "Spreadsheet cabang belum siap", 503);
  }
}

export async function POST(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const body = await request.json();
    const branchId = requiredText(body.branchId, "branchId");
    const name = requiredText(body.name, "name");
    const startTime = validTime(body.startTime, "startTime");
    const endTime = validTime(body.endTime, "endTime");
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, "Shifts!A:D");
    const shiftId = nextSequentialId(rows.map(({ values }) => values[0] ?? ""), "SFT-", 3);
    await appendRow(spreadsheetId, "Shifts!A:D", [shiftId, name, startTime, endTime]);
    return ok({ shiftId, branchId, name, startTime, endTime }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error && error.message.includes("Spreadsheet") ? "SHEETS_SETUP_REQUIRED" : "INVALID_REQUEST", error instanceof Error ? error.message : "Shift tidak valid", 400);
  }
}
