import { fail, ok } from "@/lib/api-response";
import { requiredText } from "@/lib/domain/master-validation";
import { loadIzin, loadSchedules } from "@/lib/google/ops-data";
import { appendRow } from "@/lib/google/sheets-data";
import { nextSequentialId } from "@/lib/ids";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";
import type { ScheduleRecord } from "@/lib/google/ops-data";

export async function GET(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const status = request.nextUrl.searchParams.get("status");
    const { records } = await loadIzin(branchId);
    let result = records.map(({ rowNumber: _row, ...izin }) => izin);
    if (status) result = result.filter((izin) => izin.status === status);
    if (auth.role === "karyawan") {
      result = result.filter((izin) => izin.employeeId === auth.employeeId);
    }
    return ok(result);
  } catch (error) {
    return fail("SHEETS_SETUP_REQUIRED", error instanceof Error ? error.message : "Spreadsheet cabang belum siap", 503);
  }
}

export async function POST(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const body = await request.json();
    const scheduleId = requiredText(body.scheduleId, "scheduleId");
    const categoryId = requiredText(body.categoryId, "categoryId");
    const note = requiredText(body.note, "note");
    const branchId = resolveBranchId(auth, body.branchId ?? request.nextUrl.searchParams.get("branchId"));
    const [{ spreadsheetId, records: schedules }, { records: izinList }] = await Promise.all([loadSchedules(branchId), loadIzin(branchId)]);
    const schedule = schedules.find((entry): entry is ScheduleRecord => entry.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan", 404);
    if (schedule.employeeId !== auth.employeeId) return fail("FORBIDDEN", "Hanya pemilik jadwal yang bisa ajukan izin", 403);
    if (schedule.status !== "scheduled") return fail("INVALID_REQUEST", "Hanya jadwal yang belum dimulai yang bisa diajukan izinnya", 400);
    if (izinList.some((izin) => izin.scheduleId === scheduleId && izin.status === "pending")) {
      return fail("INVALID_REQUEST", "Sudah ada pengajuan izin pending untuk jadwal ini", 400);
    }
    const izinId = nextSequentialId(izinList.map((izin) => izin.izinId), "IZN-", 3);
    await appendRow(spreadsheetId, "Izin!A:H", [izinId, auth.employeeId, scheduleId, categoryId, note, "pending", "", ""]);
    return ok({
      izinId,
      employeeId: auth.employeeId,
      scheduleId,
      categoryId,
      note,
      status: "pending",
      approvedBy: "",
      rejectReason: "",
    }, { status: 201 });
  } catch (error) {
    return fail("SHEETS_SETUP_REQUIRED", error instanceof Error ? error.message : "Pengajuan izin tidak valid", 400);
  }
}