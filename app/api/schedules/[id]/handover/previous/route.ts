import { fail, handleRouteError, ok } from "@/lib/api-response";
import { assertScheduleOwner } from "@/lib/domain/ops-validation";
import { loadHandoverLogs, loadHandoverTemplates, loadSchedules } from "@/lib/google/ops-data";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const { id: scheduleId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { records: schedules } = await loadSchedules(branchId);
    const schedule = schedules.find((entry) => entry.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan");
    if (auth.role === "karyawan") assertScheduleOwner(schedule.employeeId, auth.employeeId);

    const previous = schedules
      .filter(
        (entry) =>
          entry.employeeId === schedule.employeeId &&
          entry.date < schedule.date &&
          entry.scheduleId !== scheduleId
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (!previous) return ok(null);

    const [{ records: templates }, { records: logs }] = await Promise.all([
      loadHandoverTemplates(branchId),
      loadHandoverLogs(branchId, previous.scheduleId),
    ]);
    const existingFields = new Map(logs.map((log) => [log.fieldId, log.isi]));

    return ok({
      scheduleId: previous.scheduleId,
      fields: [...templates]
        .sort((a, b) => a.order - b.order)
        .map((template) => ({
          fieldId: template.fieldId,
          label: template.label,
          isRequired: template.isRequired,
          value: existingFields.get(template.fieldId) ?? "",
        })),
    });
  } catch (error) {
    return handleRouteError(error, "Gagal memuat handover sebelumnya");
  }
}
