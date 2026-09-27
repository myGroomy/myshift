import { fail, handleRouteError, ok } from "@/lib/api-response";
import { requiredText } from "@/lib/domain/master-validation";
import { eligiblePartnerIds } from "@/lib/domain/ops-validation";
import { getEmployees } from "@/lib/google/registry";
import { loadSchedules, loadSwaps } from "@/lib/google/ops-data";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const scheduleId = requiredText(request.nextUrl.searchParams.get("scheduleId"), "scheduleId");
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const [{ records: schedules }, { records: swaps }, employees] = await Promise.all([
      loadSchedules(branchId),
      loadSwaps(branchId),
      getEmployees(),
    ]);

    const schedule = schedules.find((entry) => entry.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan");
    if (auth.role === "karyawan" && schedule.employeeId !== auth.employeeId) {
      return fail("FORBIDDEN", "Hanya pemilik jadwal yang boleh melihat partner tukar");
    }

    const partnerIds = eligiblePartnerIds({
      requesterEmployeeId: schedule.employeeId,
      requesterScheduleId: schedule.scheduleId,
      requesterDate: schedule.date,
      schedules,
      pendingSwapScheduleIds: swaps.filter((swap) => swap.status === "pending").map((swap) => swap.scheduleId),
    });

    return ok(
      employees
        .filter((employee) => partnerIds.includes(employee.employeeId) && employee.aktif)
        .map((employee) => ({
          employeeId: employee.employeeId,
          name: employee.nama,
          role: employee.role,
          branchId: employee.cabangAktif,
        }))
    );
  } catch (error) {
    return handleRouteError(error, "Gagal memuat partner tukar");
  }
}
