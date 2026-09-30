import { fail, handleRouteError, ok } from "@/lib/api-response";
import { assertScheduleAccess } from "@/lib/domain/ops-validation";
import { checklistPointComplete, checklistNumericWarning, validateChecklistValue } from "@/lib/domain/checklist-spec-validation";
import { nowIso } from "@/lib/domain/date";
import { optionalUrl, requiredText } from "@/lib/domain/master-validation";
import {
  appendShiftReportAudit,
  loadChecklistLogs,
  loadChecklistPoints,
  loadSchedules,
  loadSopCategories,
  saveChecklistLog,
} from "@/lib/google/ops-data";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

function appliesToShift(point: { appliesAllShifts: boolean; shiftIds: string[] }, shiftId: string) {
  return point.appliesAllShifts || point.shiftIds.includes(shiftId);
}

export async function GET(request: NextRequest, context: Context) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const { id: scheduleId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { records: schedules } = await loadSchedules(branchId);
    const schedule = schedules.find((entry) => entry.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan");
    assertScheduleAccess({ role: auth.role, scheduleEmployeeId: schedule.employeeId, actorId: auth.employeeId });

    const [{ records: points }, { records: categories }, { records: logs }] = await Promise.all([
      loadChecklistPoints(branchId),
      loadSopCategories(branchId),
      loadChecklistLogs(branchId, scheduleId),
    ]);
    const currentPoints = points
      .filter((point) => point.active && appliesToShift(point, schedule.shiftId))
      .sort((a, b) => a.order - b.order);
    const logByPoint = new Map(logs.map((log) => [log.pointId, log]));
    const categoryById = new Map(categories.map((category) => [category.categoryId, category]));
    const items = currentPoints.map((point) => {
      const log = logByPoint.get(point.pointId);
      const value = log?.value ?? "";
      const photoUrl = log?.photoUrl ?? "";
      const { rowNumber: _rowNumber, ...publicPoint } = point;
      return {
        ...publicPoint,
        value,
        photoUrl,
        checked: checklistPointComplete(point, value, photoUrl),
        warning: checklistNumericWarning(point, value),
      };
    });
    const groups = categories
      .filter((category) => category.active && currentPoints.some((point) => point.categoryId === category.categoryId))
      .sort((a, b) => a.order - b.order)
      .map((category) => ({
        categoryId: category.categoryId,
        categoryName: categoryById.get(category.categoryId)?.name ?? category.name,
        items: items.filter((item) => item.categoryId === category.categoryId),
      }));
    return ok({ groups, items, completed: items.filter((item) => item.checked).length, total: items.length });
  } catch (error) {
    return handleRouteError(error, "Gagal memuat checklist");
  }
}

export async function POST(request: NextRequest, context: Context) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const { id: scheduleId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { records: schedules } = await loadSchedules(branchId);
    const schedule = schedules.find((entry) => entry.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan");
    assertScheduleAccess({ role: auth.role, scheduleEmployeeId: schedule.employeeId, actorId: auth.employeeId });

    const body = await request.json();
    const pointId = requiredText(body.pointId, "pointId");
    const value = typeof body.value === "string" ? body.value : "";
    const photoUrl = optionalUrl(body.photoUrl, "photoUrl");
    const { spreadsheetId, records: points } = await loadChecklistPoints(branchId);
    const point = points.find((entry) => entry.pointId === pointId && entry.active);
    if (!point || !appliesToShift(point, schedule.shiftId)) {
      return fail("NOT_FOUND", "Checklist point tidak ditemukan untuk shift ini");
    }
    const normalized = validateChecklistValue(point, value, photoUrl);
    const { records: logs } = await loadChecklistLogs(branchId, scheduleId);
    const previous = logs.find((log) => log.pointId === pointId);
    const changedAt = nowIso();
    await saveChecklistLog({
      spreadsheetId,
      scheduleId,
      pointId,
      value: normalized.value,
      photoUrl: normalized.photoUrl,
      checkedBy: auth.employeeId,
      checkedAt: changedAt,
    });
    if (schedule.reportGeneratedAt && previous?.value !== normalized.value) {
      await appendShiftReportAudit({
        spreadsheetId,
        scheduleId,
        section: "checklist",
        recordId: pointId,
        field: "Nilai",
        oldValue: previous?.value ?? "",
        newValue: normalized.value,
        actorId: auth.employeeId,
        changedAt,
      });
    }
    if (schedule.reportGeneratedAt && previous?.photoUrl !== normalized.photoUrl) {
      await appendShiftReportAudit({
        spreadsheetId,
        scheduleId,
        section: "checklist",
        recordId: pointId,
        field: "Foto_URL",
        oldValue: previous?.photoUrl ?? "",
        newValue: normalized.photoUrl,
        actorId: auth.employeeId,
        changedAt,
      });
    }
    return ok({
      pointId,
      value: normalized.value,
      photoUrl: normalized.photoUrl,
      checked: checklistPointComplete(point, normalized.value, normalized.photoUrl),
      warning: checklistNumericWarning(point, normalized.value),
    });
  } catch (error) {
    return handleRouteError(error, "Gagal menyimpan checklist");
  }
}
