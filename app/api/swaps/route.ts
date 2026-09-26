import { fail, ok } from "@/lib/api-response";
import { requiredText } from "@/lib/domain/master-validation";
import { eligiblePartnerIds } from "@/lib/domain/ops-validation";
import { loadSchedules, loadSwaps } from "@/lib/google/ops-data";
import { appendRow } from "@/lib/google/sheets-data";
import { nextSequentialId } from "@/lib/ids";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const status = request.nextUrl.searchParams.get("status");
    const { records } = await loadSwaps(branchId);
    let result = records.map(({ rowNumber: _row, ...swap }) => swap);
    if (status) result = result.filter((swap) => swap.status === status);
    if (auth.role === "karyawan") {
      result = result.filter((swap) => swap.requestedBy === auth.employeeId || swap.requestedWith === auth.employeeId);
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
    const requestedWithEmployeeId = requiredText(body.requestedWithEmployeeId, "requestedWithEmployeeId");
    const reason = requiredText(body.reason, "reason");
    const branchId = resolveBranchId(auth, body.branchId ?? request.nextUrl.searchParams.get("branchId"));
    const [{ spreadsheetId, records: schedules }, { records: swaps }] = await Promise.all([loadSchedules(branchId), loadSwaps(branchId)]);
    const schedule = schedules.find((entry) => entry.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan", 404);
    if (schedule.employeeId !== auth.employeeId) return fail("FORBIDDEN", "Hanya pemilik jadwal yang boleh ajukan swap", 403);
    if (schedule.status !== "scheduled") return fail("INVALID_REQUEST", "Hanya jadwal yang belum dimulai yang bisa ditukar", 400);
    if (swaps.some((swap) => swap.scheduleId === scheduleId && swap.status === "pending")) {
      return fail("INVALID_REQUEST", "Sudah ada pengajuan swap pending untuk jadwal ini", 400);
    }
    const partners = eligiblePartnerIds({
      requesterEmployeeId: auth.employeeId,
      requesterScheduleId: scheduleId,
      requesterDate: schedule.date,
      schedules,
      pendingSwapScheduleIds: swaps.filter((swap) => swap.status === "pending").map((swap) => swap.scheduleId),
    });
    if (!partners.includes(requestedWithEmployeeId)) return fail("INVALID_REQUEST", "Partner tukar tidak cocok", 400);
    const swapId = nextSequentialId(swaps.map((swap) => swap.swapId), "SWP-", 3);
    await appendRow(spreadsheetId, "Shift_Swaps!A:H", [swapId, scheduleId, auth.employeeId, requestedWithEmployeeId, reason, "pending", "", ""]);
    return ok({
      swapId,
      scheduleId,
      requestedBy: auth.employeeId,
      requestedWith: requestedWithEmployeeId,
      reason,
      status: "pending",
      approvedBy: "",
      rejectReason: "",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pengajuan swap tidak valid";
    return fail(message.includes("Spreadsheet") ? "SHEETS_SETUP_REQUIRED" : "INVALID_REQUEST", message, 400);
  }
}