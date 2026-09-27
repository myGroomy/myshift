import { handleRouteError, ok } from "@/lib/api-response";
import { adminSession, isResponse } from "@/lib/route-auth";
import { requiredText, validTime } from "@/lib/domain/master-validation";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { appendRow, readRows } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = requiredText(request.nextUrl.searchParams.get("branchId"), "branchId");
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, branchSheetRange("Shifts"));
    return ok(
      rows.map(({ values }) => ({
        shiftId: values[0] ?? "",
        name: values[1] ?? "",
        startTime: values[2] ?? "",
        endTime: values[3] ?? "",
        branchId,
      }))
    );
  } catch (error) {
    return handleRouteError(error, "Gagal memuat shift");
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
    const rows = await readRows(spreadsheetId, branchSheetRange("Shifts"));
    const shiftId = nextSequentialId(rows.map(({ values }) => values[0] ?? ""), ID_PREFIX.shift);
    await appendRow(spreadsheetId, branchSheetRange("Shifts"), [shiftId, name, startTime, endTime]);

    return ok({ shiftId, branchId, name, startTime, endTime }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Shift tidak valid");
  }
}
