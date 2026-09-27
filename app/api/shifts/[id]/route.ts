import { fail, handleRouteError, ok } from "@/lib/api-response";
import { adminSession, isResponse } from "@/lib/route-auth";
import { optionalText, requiredText, validTime } from "@/lib/domain/master-validation";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { deleteRowById, readRows, replaceRowById } from "@/lib/google/sheets-data";
import { BRANCH_HEADERS, branchSheetRange, padRow } from "@/lib/google/sheet-schema";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const body = await request.json();
    const branchId = requiredText(body.branchId, "branchId");
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, branchSheetRange("Shifts"));
    const row = rows.find((entry) => entry.values[0] === id);
    if (!row) return fail("NOT_FOUND", "Shift tidak ditemukan");

    const values = padRow(row.values, BRANCH_HEADERS.Shifts.length);
    values[0] = id;
    values[1] = optionalText(body.name, "name", values[1] ?? "");
    if (body.startTime !== undefined) values[2] = validTime(body.startTime, "startTime");
    if (body.endTime !== undefined) values[3] = validTime(body.endTime, "endTime");

    await replaceRowById(spreadsheetId, "Shifts", branchSheetRange("Shifts"), id, values);
    return ok({ shiftId: id, branchId, name: values[1], startTime: values[2], endTime: values[3] });
  } catch (error) {
    return handleRouteError(error, "Shift tidak valid");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const branchId = requiredText(request.nextUrl.searchParams.get("branchId"), "branchId");
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const deleted = await deleteRowById(spreadsheetId, "Shifts", branchSheetRange("Shifts"), id);
    if (!deleted) return fail("NOT_FOUND", "Shift tidak ditemukan");
    return ok({ shiftId: id, deleted: true });
  } catch (error) {
    return handleRouteError(error, "Gagal menghapus shift");
  }
}
