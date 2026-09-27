import { fail, ok } from "@/lib/api-response";
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
    const schedule = schedules.find((s) => s.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan", 404);
    if (auth.role === "karyawan") assertScheduleOwner(schedule.employeeId, auth.employeeId);

    const scheduleDate = schedule.date;
    const employeeId = schedule.employeeId;

    const prevSchedule = schedules
      .filter((s) => s.employeeId === employeeId && s.date < scheduleDate && s.scheduleId !== scheduleId)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (!prevSchedule) return ok(null);

    const { records: templates } = await loadHandoverTemplates(branchId);
    const { records: logs } = await loadHandoverLogs(branchId, prevSchedule.scheduleId);
    const existingFields = logs.reduce<Record<string, string>>((acc, l) => {
      acc[l.fieldId] = l.isi;
      return acc;
    }, {});

    const fields = templates
      .sort((a, b) => a.order - b.order)
      .map((t) => ({
        fieldId: t.fieldId,
        label: t.label,
        isRequired: t.isRequired,
        value: existingFields[t.fieldId] ?? "",
      }));

    return ok({ scheduleId: prevSchedule.scheduleId, fields });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat handover sebelumnya";
    const code = message.includes("Cabang") ? "FORBIDDEN" : "INTERNAL_ERROR";
    return fail(code, message, code === "FORBIDDEN" ? 403 : 500);
  }
}
