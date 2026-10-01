import { fail, handleRouteError, ok } from "@/lib/api-response";
import { assertScheduleAccess } from "@/lib/domain/ops-validation";
import { checklistPointComplete, createReportToken } from "@/lib/domain/checklist-spec-validation";
import { nowIso } from "@/lib/domain/date";
import { branchSpreadsheetFrom } from "@/lib/google/branch-data";
import { getShiftReportRegistryData } from "@/lib/google/registry";
import { loadShiftReportData, buildShiftReport } from "@/lib/google/shift-report";
import { saveScheduleReportFields } from "@/lib/google/ops-data";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

async function locateSchedule(request: NextRequest, scheduleId: string) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
  const { branch, employees } = await getShiftReportRegistryData(branchId);
  if (!branch) return fail("NOT_FOUND", "Cabang tidak ditemukan atau tidak aktif");

  const { spreadsheetId } = branchSpreadsheetFrom(branch);
  const data = await loadShiftReportData(spreadsheetId);
  const schedule = data.schedules.find((entry) => entry.scheduleId === scheduleId);
  if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan");
  assertScheduleAccess({
    role: auth.role,
    scheduleEmployeeId: schedule.employeeId,
    actorId: auth.employeeId,
  });

  return { auth, branch, branchId, data, employees, schedule, spreadsheetId };
}

export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const located = await locateSchedule(request, id);
    if (located instanceof Response) return located;
    const report = buildShiftReport(located.branch, located.employees, located.data, located.schedule);
    return ok(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "Gagal memuat preview laporan shift");
  }
}

export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const located = await locateSchedule(request, id);
    if (located instanceof Response) return located;
    const { branch, branchId, data, employees, schedule, spreadsheetId } = located;
    let reportSchedule = schedule;

    if (!schedule.reportGeneratedAt) {
      const applicable = data.points.filter(
        (point) => point.active && (point.appliesAllShifts || point.shiftIds.includes(schedule.shiftId)),
      );
      const checklistValues = new Map(
        data.checklistLogs
          .filter((log) => log.scheduleId === id)
          .map((log) => [log.pointId, log]),
      );
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

      const handoverValues = new Map(
        data.handoverLogs
          .filter((entry) => entry.scheduleId === id)
          .map((entry) => [entry.fieldId, entry.isi]),
      );
      const missingHandover = data.handoverTemplates
        .filter((field) => field.active && field.isRequired && !(handoverValues.get(field.fieldId) ?? "").trim())
        .map((field) => field.fieldId);
      if (missingHandover.length) {
        return fail("REQUIRED_FIELD_MISSING", "Field handover wajib belum diisi", {
          data: { fields: missingHandover },
        });
      }

      const reportGeneratedAt = nowIso();
      const reportToken = createReportToken(branchId, id);
      await saveScheduleReportFields(
        spreadsheetId,
        schedule.rowNumber,
        reportGeneratedAt,
        reportToken,
      );
      reportSchedule = { ...schedule, reportGeneratedAt, reportToken };
    }

    const report = buildShiftReport(branch, employees, data, reportSchedule);
    return ok(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error, "Gagal membuat laporan shift");
  }
}
