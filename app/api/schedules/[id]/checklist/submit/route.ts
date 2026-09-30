import { fail, handleRouteError, ok } from "@/lib/api-response";
import { assertScheduleAccess } from "@/lib/domain/ops-validation";
import { checklistPointComplete } from "@/lib/domain/checklist-spec-validation";
import { nowIso } from "@/lib/domain/date";
import { evaluateShiftClosure, SHIFT_STATUS } from "@/lib/domain/shift-lifecycle";
import {
  loadChecklistLogs,
  loadChecklistPoints,
  loadHandoverLogs,
  loadHandoverTemplates,
  loadSchedules,
  saveSchedule,
} from "@/lib/google/ops-data";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

// Submitting the checklist is what closes the shift (scheduled|started -> completed).
// Closing requires 100% checklist AND every required handover field, validated here the
// disabled button in the UI is not a control (AGENTS.md §5). Idempotent on re-submit.
export async function POST(request: NextRequest, context: Context) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const { id: scheduleId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId, records: schedules } = await loadSchedules(branchId);
    const schedule = schedules.find((entry) => entry.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan");
    assertScheduleAccess({ role: auth.role, scheduleEmployeeId: schedule.employeeId, actorId: auth.employeeId });

    const [{ records: points }, { records: logs }, { records: handoverTemplates }, { records: handoverLogs }] =
      await Promise.all([
        loadChecklistPoints(branchId),
        loadChecklistLogs(branchId, scheduleId),
        loadHandoverTemplates(branchId),
        loadHandoverLogs(branchId, scheduleId),
      ]);

    const closure = evaluateShiftClosure({
      activeChecklistItemIds: points
        .filter((point) => point.active && (point.appliesAllShifts || point.shiftIds.includes(schedule.shiftId)))
        .map((point) => point.pointId),
      checkedChecklistItemIds: points
        .filter((point) => {
          const log = logs.find((entry) => entry.pointId === point.pointId);
          return point.active
            && (point.appliesAllShifts || point.shiftIds.includes(schedule.shiftId))
            && checklistPointComplete(point, log?.value ?? "", log?.photoUrl ?? "");
        })
        .map((point) => point.pointId),
      requiredHandoverFieldIds: handoverTemplates.filter((field) => field.isRequired).map((field) => field.fieldId),
      filledHandoverFieldIds: handoverLogs.filter((log) => log.isi.trim()).map((log) => log.fieldId),
    });

    if (!closure.canClose && closure.blocker) {
      const message =
        closure.blocker.code === "CHECKLIST_INCOMPLETE"
          ? `${closure.blocker.fields.length} item belum dicentang`
          : `Field handover wajib belum diisi: ${closure.blocker.fields.join(", ")}`;
      return fail(closure.blocker.code, message, { data: { fields: closure.blocker.fields } });
    }

    if (schedule.status === SHIFT_STATUS.completed) {
      return ok({ submitted: true, status: SHIFT_STATUS.completed, alreadyClosed: true });
    }

    await saveSchedule(spreadsheetId, {
      ...schedule,
      status: SHIFT_STATUS.completed,
      startedAt: schedule.startedAt || nowIso(),
      updatedVia: "myshift",
    });

    return ok({ submitted: true, status: SHIFT_STATUS.completed });
  } catch (error) {
    return handleRouteError(error, "Gagal submit checklist");
  }
}
