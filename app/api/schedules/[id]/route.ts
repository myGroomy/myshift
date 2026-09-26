import { ok, fail } from "@/lib/api-response";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { readRows, replaceRow, deleteRow } from "@/lib/google/sheets-data";
import { scheduleDate } from "@/lib/domain/schedule-validation";
import { adminSession, isResponse } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

async function find(branchId: string, id: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const row = (await readRows(spreadsheetId, "Schedules!A:G")).find((entry) => entry.values[0] === id);
  return { spreadsheetId, row };
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const body = await request.json();
    const branchId = String(body.branchId ?? request.nextUrl.searchParams.get("branchId") ?? "");
    const { spreadsheetId, row } = await find(branchId, id);
    if (!row) return fail("NOT_FOUND", "Jadwal tidak ditemukan", 404);
    const values = [...row.values];
    if (body.employeeId !== undefined) values[1] = String(body.employeeId);
    if (body.shiftId !== undefined) values[2] = String(body.shiftId);
    if (body.date !== undefined) values[3] = scheduleDate(body.date);
    await replaceRow(spreadsheetId, "Schedules", row.rowNumber, values);
    return ok({ scheduleId: id, employeeId: values[1], shiftId: values[2], date: values[3], status: values[4] ?? "scheduled" });
  } catch (error) {
    return fail("INVALID_REQUEST", error instanceof Error ? error.message : "Jadwal tidak valid", 400);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  const branchId = request.nextUrl.searchParams.get("branchId");
  if (!branchId) return fail("INVALID_REQUEST", "branchId wajib diisi", 400);
  try {
    const { spreadsheetId, row } = await find(branchId, id);
    if (!row) return fail("NOT_FOUND", "Jadwal tidak ditemukan", 404);
    await deleteRow(spreadsheetId, "Schedules", row.rowNumber);
    return ok({ scheduleId: id, deleted: true });
  } catch (error) {
    return fail("SHEETS_SETUP_REQUIRED", error instanceof Error ? error.message : "Spreadsheet cabang belum siap", 503);
  }
}
