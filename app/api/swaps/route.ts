import { fail, handleRouteError, ok } from "@/lib/api-response";
import { requiredText } from "@/lib/domain/master-validation";
import { eligiblePartnerIds } from "@/lib/domain/ops-validation";
import { loadSchedules, loadSwaps } from "@/lib/google/ops-data";
import { appendRow } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
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
    if (auth.role === "petugas") {
      result = result.filter(
        (swap) => swap.requestedBy === auth.employeeId || swap.requestedWith === auth.employeeId
      );
    }
    return ok(result);
  } catch (error) {
    return handleRouteError(error, "Gagal memuat pengajuan swap");
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

    const [{ spreadsheetId, records: schedules }, { records: swaps }] = await Promise.all([
      loadSchedules(branchId),
      loadSwaps(branchId),
    ]);
    const schedule = schedules.find((entry) => entry.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan");
    if (schedule.employeeId !== auth.employeeId) {
      return fail("FORBIDDEN", "Hanya pemilik jadwal yang boleh ajukan swap");
    }
    if (schedule.status !== "scheduled") {
      return fail("VALIDATION_ERROR", "Hanya jadwal yang belum dimulai yang bisa ditukar");
    }
    if (swaps.some((swap) => swap.scheduleId === scheduleId && swap.status === "pending")) {
      return fail("DUPLICATE_SUBMIT", "Sudah ada pengajuan swap pending untuk jadwal ini");
    }

    const partners = eligiblePartnerIds({
      requesterEmployeeId: auth.employeeId,
      requesterScheduleId: scheduleId,
      requesterDate: schedule.date,
      schedules,
      pendingSwapScheduleIds: swaps.filter((swap) => swap.status === "pending").map((swap) => swap.scheduleId),
    });
    if (!partners.includes(requestedWithEmployeeId)) {
      return fail("VALIDATION_ERROR", "Partner tukar tidak cocok", { data: { fields: ["requestedWithEmployeeId"] } });
    }

    const swapId = nextSequentialId(swaps.map((swap) => swap.swapId), ID_PREFIX.swap);
    await appendRow(spreadsheetId, branchSheetRange("Shift_Swaps"), [
      swapId,
      scheduleId,
      auth.employeeId,
      requestedWithEmployeeId,
      reason,
      "pending",
      "",
      "",
    ]);

    return ok(
      {
        swapId,
        scheduleId,
        requestedBy: auth.employeeId,
        requestedWith: requestedWithEmployeeId,
        reason,
        status: "pending",
        approvedBy: "",
        rejectReason: "",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, "Pengajuan swap tidak valid");
  }
}
