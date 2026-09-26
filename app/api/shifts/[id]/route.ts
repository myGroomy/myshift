import { ok, fail } from "@/lib/api-response";
import { adminSession, isResponse } from "@/lib/route-auth";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { deleteRow, readRows, replaceRow } from "@/lib/google/sheets-data";
import { requiredText, validTime } from "@/lib/domain/master-validation";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

async function findShift(branchId: string, id: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const row = (await readRows(spreadsheetId, "Shifts!A:D")).find((entry) => entry.values[0] === id);
  return { spreadsheetId, row };
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const body = await request.json();
    const branchId = requiredText(body.branchId, "branchId");
    const { spreadsheetId, row } = await findShift(branchId, id);
    if (!row) return fail("NOT_FOUND", "Shift tidak ditemukan", 404);
    const values = [...row.values];
    if (body.name !== undefined) values[1] = requiredText(body.name, "name");
    if (body.startTime !== undefined) values[2] = validTime(body.startTime, "startTime");
    if (body.endTime !== undefined) values[3] = validTime(body.endTime, "endTime");
    await replaceRow(spreadsheetId, "Shifts", row.rowNumber, values);
    return ok({ shiftId: id, branchId, name: values[1], startTime: values[2], endTime: values[3] });
  } catch (error) {
    return fail("INVALID_REQUEST", error instanceof Error ? error.message : "Shift tidak valid", 400);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  const branchId = request.nextUrl.searchParams.get("branchId");
  if (!branchId) return fail("INVALID_REQUEST", "branchId wajib diisi", 400);
  try {
    const { spreadsheetId, row } = await findShift(branchId, id);
    if (!row) return fail("NOT_FOUND", "Shift tidak ditemukan", 404);
    await deleteRow(spreadsheetId, "Shifts", row.rowNumber);
    return ok({ shiftId: id, deleted: true });
  } catch (error) {
    return fail("SHEETS_SETUP_REQUIRED", error instanceof Error ? error.message : "Spreadsheet cabang belum siap", 503);
  }
}
