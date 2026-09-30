import { fail, handleRouteError, ok } from "@/lib/api-response";
import { assertScheduleAccess } from "@/lib/domain/ops-validation";
import { checklistPointComplete, createReportToken } from "@/lib/domain/checklist-spec-validation";
import { nowIso } from "@/lib/domain/date";
import { loadChecklistLogs, loadChecklistPoints, loadHandoverLogs, loadHandoverTemplates, loadSchedules, saveSchedule } from "@/lib/google/ops-data";
import { buildShiftReport } from "@/lib/google/shift-report";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

async function locateSchedule(request: NextRequest, scheduleId: string) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
  const { records } = await loadSchedules(branchId);
  const schedule = records.find((entry) => entry.scheduleId === scheduleId);
  if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan");
  assertScheduleAccess({ role: auth.role, scheduleEmployeeId: schedule.employeeId, actorId: auth.employeeId });
  return { auth, branchId, schedule };
}

export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const located = await locateSchedule(request, id);
    if (located instanceof Response) return located;
    const report = await buildShiftReport(located.branchId, id);
    return report
      ? ok(report, { headers: { "Cache-Control": "no-store" } })
      : fail("NOT_FOUND", "Jadwal tidak ditemukan");
  } catch (error) {
    return handleRouteError(error, "Gagal memuat preview laporan shift");
  }
}

export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const located = await locateSchedule(request, id);
    if (located instanceof Response) return located;
    const { branchId, schedule } = located;
    if (!schedule.reportGeneratedAt) {
      const [{ records: points }, { records: checklistLogs }, { records: handoverTemplates }, { records: handoverLogs }] =
        await Promise.all([
          loadChecklistPoints(branchId),
          loadChecklistLogs(branchId, id),
          loadHandoverTemplates(branchId),
          loadHandoverLogs(branchId, id),
        ]);
      const applicable = points.filter(
        (point) => point.active && (point.appliesAllShifts || point.shiftIds.includes(schedule.shiftId)),
      );
      const checklistValues = new Map(checklistLogs.map((log) => [log.pointId, log]));
      const missingPoints = applicable
        .filter((point) => {
          const log = checklistValues.get(point.pointId);
          return !checklistPointComplete(point, log?.value ?? "", log?.photoUrl ?? "");
        })
        .map((point) => point.pointId);
      if (missingPoints.length) {
        return fail("CHECKLIST_INCOMPLETE", `${missingPoints.length} checklist point belum selesai`, {
          data: { fields: missingPoints },
        });
      }
      const handoverValues = new Map(handoverLogs.map((entry) => [entry.fieldId, entry.isi]));
      const missingHandover = handoverTemplates
        .filter((field) => field.isRequired && !(handoverValues.get(field.fieldId) ?? "").trim())
        .map((field) => field.fieldId);
      if (missingHandover.length) {
        return fail("REQUIRED_FIELD_MISSING", "Field handover wajib belum diisi", {
          data: { fields: missingHandover },
        });
      }
      const { spreadsheetId } = await loadSchedules(branchId);
      await saveSchedule(spreadsheetId, {
        ...schedule,
        reportGeneratedAt: nowIso(),
        reportToken: createReportToken(branchId, id),
      });
    }
    const report = await buildShiftReport(branchId, id);
    return report
      ? ok(report, { headers: { "Cache-Control": "no-store" } })
      : fail("NOT_FOUND", "Jadwal tidak ditemukan");
  } catch (error) {
    return handleRouteError(error, "Gagal membuat laporan shift");
  }
}
