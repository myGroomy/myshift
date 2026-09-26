import { fail, ok } from "@/lib/api-response";
import { partnerScheduleOnDate } from "@/lib/domain/ops-validation";
import { loadSchedules, loadSwaps, saveSchedule, saveSwap } from "@/lib/google/ops-data";
import { adminSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import type { NextRequest } from "next/server";
import type { ScheduleRecord } from "@/lib/google/ops-data";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const [{ spreadsheetId, records: swaps }, { records: schedules }] = await Promise.all([loadSwaps(branchId), loadSchedules(branchId)]);
    const swap = swaps.find((entry) => entry.swapId === id);
    if (!swap) return fail("NOT_FOUND", "Pengajuan swap tidak ditemukan", 404);
    if (swap.status !== "pending") return fail("INVALID_REQUEST", "Pengajuan sudah diproses", 400);
    const requester = schedules.find((entry): entry is ScheduleRecord => entry.scheduleId === swap.scheduleId);
    if (!requester) return fail("NOT_FOUND", "Jadwal pemohon tidak ditemukan", 404);
    const partner = partnerScheduleOnDate(schedules, swap.requestedWith, requester.date, requester.scheduleId);
    if (!partner) return fail("INVALID_REQUEST", "Jadwal partner tidak lagi cocok", 400);
    const requesterEmployeeId = requester.employeeId;
    await saveSchedule(spreadsheetId, { ...requester, employeeId: partner.employeeId, updatedVia: "myshift" } as ScheduleRecord);
    await saveSchedule(spreadsheetId, { ...partner, employeeId: requesterEmployeeId, updatedVia: "myshift" } as ScheduleRecord);
    const updated = { ...swap, status: "approved", approvedBy: auth.employeeId, rejectReason: "" };
    await saveSwap(spreadsheetId, updated);
    const { rowNumber: _row, ...data } = updated;
    return ok(data);
  } catch (error) {
    return fail("INVALID_REQUEST", error instanceof Error ? error.message : "Gagal approve swap", 400);
  }
}