import { ok, fail } from "@/lib/api-response";
import { getEmployees } from "@/lib/google/registry";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { appendRow, readRows } from "@/lib/google/sheets-data";
import { nextScheduleId } from "@/lib/ids";
import { requiredText } from "@/lib/domain/master-validation";
import { scheduleDate, timeOverlaps } from "@/lib/domain/schedule-validation";
import { adminSession, isResponse, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Schedule = { scheduleId: string; employeeId: string; shiftId: string; date: string; status: string; startedAt: string; conflictWarning: boolean };

async function entries(branchId: string): Promise<Schedule[]> {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const [scheduleRows, shiftRows] = await Promise.all([readRows(spreadsheetId, "Schedules!A:G"), readRows(spreadsheetId, "Shifts!A:D")]);
  const shifts = new Map(shiftRows.map(({ values }) => [values[0], { start: values[2], end: values[3] }]));
  const parsed = scheduleRows.map(({ values }) => ({ scheduleId: values[0] ?? "", employeeId: values[1] ?? "", shiftId: values[2] ?? "", date: values[3] ?? "", status: values[4] ?? "scheduled", startedAt: values[5] ?? "", conflictWarning: false }));
  return parsed.map((entry) => ({ ...entry, conflictWarning: parsed.some((other) => other.scheduleId !== entry.scheduleId && other.employeeId === entry.employeeId && other.date === entry.date && shifts.get(other.shiftId) && shifts.get(entry.shiftId) && timeOverlaps(shifts.get(other.shiftId)!.start, shifts.get(other.shiftId)!.end, shifts.get(entry.shiftId)!.start, shifts.get(entry.shiftId)!.end)) }));
}

export async function GET(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const requestedBranch = request.nextUrl.searchParams.get("branchId");
  const branchId = auth.role === "admin" ? requestedBranch : auth.activeBranchId;
  if (!branchId || (auth.role !== "admin" && !auth.branches.some((branch) => branch.branchId === branchId))) return fail("FORBIDDEN", "Cabang tidak tersedia untuk user ini", 403);
  try {
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");
    let result = await entries(branchId);
    if (startDate) result = result.filter((entry) => entry.date >= startDate);
    if (endDate) result = result.filter((entry) => entry.date <= endDate);
    if (auth.role === "karyawan") result = result.filter((entry) => entry.employeeId === auth.employeeId);
    return ok(result);
  } catch (error) {
    return fail("SHEETS_SETUP_REQUIRED", error instanceof Error ? error.message : "Spreadsheet cabang belum siap", 503);
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
    const employees = await getEmployees();
    const employee = employees.find((entry) => entry.employeeId === employeeId && entry.aktif);
    if (!employee) return fail("INVALID_REQUEST", "Karyawan tidak ditemukan atau nonaktif", 400);
    const branchId = requiredText(body.branchId, "branchId");
    if (employee.cabangAktif !== branchId && !employee.cabangTerafiliasi.includes(branchId)) return fail("INVALID_REQUEST", "Karyawan tidak terafiliasi dengan cabang ini", 400);
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const [scheduleRows, shiftRows] = await Promise.all([readRows(spreadsheetId, "Schedules!A:G"), readRows(spreadsheetId, "Shifts!A:D")]);
    const shift = shiftRows.find(({ values }) => values[0] === shiftId);
    if (!shift) return fail("INVALID_REQUEST", "Shift tidak ditemukan", 400);
    const scheduleId = nextScheduleId(scheduleRows.map(({ values }) => values[0] ?? ""), date);
    const conflictWarning = scheduleRows.some(({ values }) => values[1] === employeeId && values[3] === date && shiftRows.some(({ values: other }) => other[0] === values[2] && timeOverlaps(other[2], other[3], shift.values[2], shift.values[3])));
    await appendRow(spreadsheetId, "Schedules!A:G", [scheduleId, employeeId, shiftId, date, "scheduled", "", "myshift"]);
    return ok({ scheduleId, employeeId, shiftId, date, status: "scheduled", startedAt: "", conflictWarning }, { status: 201 });
  } catch (error) {
    return fail("INVALID_REQUEST", error instanceof Error ? error.message : "Jadwal tidak valid", 400);
  }
}
