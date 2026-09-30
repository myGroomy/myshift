import { fail, handleRouteError, ok } from "@/lib/api-response";
import { getEmployees } from "@/lib/google/registry";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { appendRow, readRows } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { nextScheduleId } from "@/lib/ids";
import { requiredText } from "@/lib/domain/master-validation";
import { scheduleDate, timeOverlaps } from "@/lib/domain/schedule-validation";
import { adminSession, isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import { DomainError } from "@/lib/error-codes";
import type { NextRequest } from "next/server";

import { projectSchedules, EnrichedSchedule } from "@/lib/google/schedules-data";

async function entries(spreadsheetId: string): Promise<EnrichedSchedule[]> {
  const [scheduleRows, shiftRows] = await Promise.all([
    readRows(spreadsheetId, branchSheetRange("Schedules")),
    readRows(spreadsheetId, branchSheetRange("Shifts")),
  ]);

  const rawSchedules = scheduleRows.map(({ values }) => ({
    scheduleId: values[0] ?? "",
    employeeId: values[1] ?? "",
    shiftId: values[2] ?? "",
    date: values[3] ?? "",
    status: values[4] ?? "scheduled",
    startedAt: values[5] ?? "",
  }));

  const rawShifts = shiftRows.map(({ values }) => ({
    shiftId: values[0] ?? "",
    shiftName: values[1] ?? "",
    startTime: values[2] ?? "",
    endTime: values[3] ?? "",
  }));

  return projectSchedules(rawSchedules, rawShifts);
}

export async function GET(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId } = await branchSpreadsheet(branchId);

    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");
    let result = await entries(spreadsheetId);
    if (startDate) result = result.filter((entry) => entry.date >= startDate);
    if (endDate) result = result.filter((entry) => entry.date <= endDate);
    if (auth.role === "karyawan") result = result.filter((entry) => entry.employeeId === auth.employeeId);
    return ok(result);
  } catch (error) {
    return handleRouteError(error, "Gagal memuat jadwal");
  }
}

export async function POST(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const body = await request.json();
    const employeeId = requiredText(body.employeeId, "employeeId");
    const shiftId = requiredText(body.shiftId, "shiftId");
    const date = scheduleDate(body.date);
    const branchId = requiredText(body.branchId, "branchId");

    const employees = await getEmployees();
    const employee = employees.find((entry) => entry.employeeId === employeeId && entry.aktif);
    if (!employee) {
      throw new DomainError("VALIDATION_ERROR", "Karyawan tidak ditemukan atau nonaktif", {
        data: { fields: ["employeeId"] },
      });
    }
    if (employee.cabangAktif !== branchId && !employee.cabangTerafiliasi.includes(branchId)) {
      throw new DomainError("VALIDATION_ERROR", "Karyawan tidak terafiliasi dengan cabang ini", {
        data: { fields: ["branchId"] },
      });
    }

    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const [scheduleRows, shiftRows] = await Promise.all([
      readRows(spreadsheetId, branchSheetRange("Schedules")),
      readRows(spreadsheetId, branchSheetRange("Shifts")),
    ]);

    const shift = shiftRows.find(({ values }) => values[0] === shiftId);
    if (!shift) {
      throw new DomainError("VALIDATION_ERROR", "Shift tidak ditemukan", { data: { fields: ["shiftId"] } });
    }

    // Double-tap / retry guard: the same employee+shift+date must not be appended twice
    // (contract §12 the UI also disables the button, the backend must hold the line).
    const duplicate = scheduleRows.some(
      ({ values }) => values[1] === employeeId && values[2] === shiftId && values[3] === date
    );
    if (duplicate) {
      return fail("DUPLICATE_SUBMIT", "Jadwal karyawan ini pada tanggal tersebut sudah ada");
    }

    const scheduleId = nextScheduleId(scheduleRows.map(({ values }) => values[0] ?? ""), date);
    const conflictWarning = scheduleRows.some(
      ({ values }) =>
        values[1] === employeeId &&
        values[3] === date &&
        shiftRows.some(({ values: other }) =>
          other[0] === values[2] && timeOverlaps(other[2], other[3], shift.values[2], shift.values[3])
        )
    );

    await appendRow(spreadsheetId, branchSheetRange("Schedules"), [
      scheduleId,
      employeeId,
      shiftId,
      date,
      "scheduled",
      "",
      "myshift",
    ]);

    return ok(
      { scheduleId, employeeId, shiftId, date, status: "scheduled", startedAt: "", conflictWarning },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, "Jadwal tidak valid");
  }
}
