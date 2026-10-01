import { sheets } from "@/lib/google/client";
import { checklistPointComplete, checklistNumericWarning } from "@/lib/domain/checklist-spec-validation";
import type {
  Branch,
  Employee,
} from "@/lib/google/registry";
import type {
  ChecklistLogRecord,
  ChecklistPointRecord,
  HandoverLogRecord,
  HandoverTemplateRecord,
  ScheduleRecord,
  ShiftReportAuditRecord,
  SopCategoryRecord,
} from "@/lib/google/ops-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";

export type ShiftReportData = {
  schedules: ScheduleRecord[];
  points: ChecklistPointRecord[];
  categories: SopCategoryRecord[];
  checklistLogs: ChecklistLogRecord[];
  handoverTemplates: HandoverTemplateRecord[];
  handoverLogs: HandoverLogRecord[];
  audits: ShiftReportAuditRecord[];
  shifts: string[][];
};

function toBool(value: string | undefined, fallback: boolean): boolean {
  const normalized = (value ?? "").trim().toUpperCase();
  return normalized ? normalized === "TRUE" : fallback;
}

function rowsAt(range: { values?: unknown[][] | null } | undefined): string[][] {
  return (range?.values ?? []).slice(1).map((row) => row.map((value) => String(value ?? "")));
}

export async function loadShiftReportData(spreadsheetId: string): Promise<ShiftReportData> {
  const sheetNames = [
    "Schedules",
    "Checklist_Point",
    "SOP_Kategori",
    "Checklist_Log",
    "Handover_Template",
    "Handover_Log",
    "Shift_Report_Audit",
    "Shifts",
  ] as const;
  const result = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: sheetNames.map((name) => branchSheetRange(name)),
  });
  const ranges = result.data.valueRanges ?? [];
  const rows = sheetNames.map((_, index) => rowsAt(ranges[index]));
  const [schedules, pointRows, categoryRows, checklistRows, templateRows, handoverRows, auditRows, shifts] = rows;

  return {
    schedules: schedules.map((values, index) => ({
      rowNumber: index + 2,
      scheduleId: values[0] ?? "",
      employeeId: values[1] ?? "",
      employeeNameSnapshot: values[2] ?? "",
      shiftId: values[3] ?? "",
      shiftNameSnapshot: values[4] ?? "",
      shiftStartSnapshot: values[5] ?? "",
      shiftEndSnapshot: values[6] ?? "",
      date: values[7] ?? "",
      status: values[8] ?? "scheduled",
      startedAt: values[9] ?? "",
      updatedVia: values[10] ?? "",
      reportGeneratedAt: values[11] ?? "",
      reportToken: values[12] ?? "",
      createdBy: values[13] ?? "",
      createdAt: values[14] ?? "",
      updatedAt: values[15] ?? "",
    })),
    points: pointRows.map((values, index) => ({
      rowNumber: index + 2,
      pointId: values[0] ?? "",
      categoryId: values[1] ?? "",
      description: values[2] ?? "",
      completionType: (values[3] ?? "centang") as ChecklistPointRecord["completionType"],
      unit: values[4] ?? "",
      min: values[5] ?? "",
      max: values[6] ?? "",
      options: (values[7] ?? "").split(",").map((value) => value.trim()).filter(Boolean),
      appliesAllShifts: toBool(values[8], false),
      shiftIds: (values[9] ?? "").split(",").map((value) => value.trim()).filter(Boolean),
      order: Number(values[10] ?? "0") || 0,
      active: toBool(values[11], true),
      createdAt: values[12] ?? "",
      updatedAt: values[13] ?? "",
    })),
    categories: categoryRows.map((values, index) => ({
      rowNumber: index + 2,
      categoryId: values[0] ?? "",
      name: values[1] ?? "",
      order: Number(values[2] ?? "0") || 0,
      active: toBool(values[3], true),
      createdAt: values[4] ?? "",
      updatedAt: values[5] ?? "",
    })),
    checklistLogs: checklistRows.map((values, index) => ({
      rowNumber: index + 2,
      logId: values[0] ?? "",
      scheduleId: values[1] ?? "",
      pointId: values[2] ?? "",
      pointPublicIdSnapshot: values[3] ?? "",
      categoryNameSnapshot: values[4] ?? "",
      descriptionSnapshot: values[5] ?? "",
      completionTypeSnapshot: values[6] ?? "",
      unitSnapshot: values[7] ?? "",
      minSnapshot: values[8] ?? "",
      maxSnapshot: values[9] ?? "",
      optionsSnapshot: values[10] ?? "",
      isRequiredSnapshot: toBool(values[11], false),
      value: values[12] ?? "",
      photoUrl: values[13] ?? "",
      checkedBy: values[14] ?? "",
      checkedAt: values[15] ?? "",
    })),
    handoverTemplates: templateRows.map((values, index) => ({
      rowNumber: index + 2,
      fieldId: values[0] ?? "",
      label: values[1] ?? "",
      isRequired: toBool(values[2], false),
      order: Number(values[3] ?? "0") || 0,
      active: toBool(values[4], true),
      createdAt: values[5] ?? "",
      updatedAt: values[6] ?? "",
    })),
    handoverLogs: handoverRows.map((values, index) => ({
      rowNumber: index + 2,
      logId: values[0] ?? "",
      scheduleId: values[1] ?? "",
      fieldId: values[2] ?? "",
      fieldPublicIdSnapshot: values[3] ?? "",
      labelSnapshot: values[4] ?? "",
      isRequiredSnapshot: toBool(values[5], false),
      isi: values[6] ?? "",
      createdBy: values[7] ?? "",
      createdAt: values[8] ?? "",
      updatedAt: values[9] ?? "",
    })),
    audits: auditRows.map((values, index) => ({
      rowNumber: index + 2,
      auditId: values[0] ?? "",
      scheduleId: values[1] ?? "",
      section: values[2] ?? "",
      recordId: values[3] ?? "",
      field: values[4] ?? "",
      oldValue: values[5] ?? "",
      newValue: values[6] ?? "",
      actorId: values[7] ?? "",
      actorNameSnapshot: values[8] ?? "",
      changedAt: values[9] ?? "",
    })),
    shifts,
  };
}

export function buildShiftReport(
  branch: Branch,
  employees: Employee[],
  data: ShiftReportData,
  schedule: ScheduleRecord,
) {
  const employeeById = new Map(employees.map((employee) => [employee.employeeId, employee.nama]));
  const categoryById = new Map(data.categories.map((category) => [category.categoryId, category.name]));
  const shift = data.shifts.find((row) => row[0] === schedule.shiftId);
  const applicablePoints = data.points
    .filter((point) => point.active && (point.appliesAllShifts || point.shiftIds.includes(schedule.shiftId)))
    .sort((a, b) => a.order - b.order);
  const checklistLogs = data.checklistLogs.filter((log) => log.scheduleId === schedule.scheduleId);
  const logByPoint = new Map(checklistLogs.map((log) => [log.pointId, log]));
  const checklist = applicablePoints.map((point) => {
    const log = logByPoint.get(point.pointId);
    const value = log?.value ?? "";
    const photoUrl = log?.photoUrl ?? "";
    return {
      pointId: point.pointId,
      categoryId: point.categoryId,
      categoryName: categoryById.get(point.categoryId) ?? "SOP",
      description: point.description,
      completionType: point.completionType,
      value,
      photoUrl,
      checked: checklistPointComplete(point, value, photoUrl),
      warning: checklistNumericWarning(point, value),
      checkedBy: log ? employeeById.get(log.checkedBy) ?? log.checkedBy : "",
      checkedAt: log?.checkedAt ?? "",
    };
  });
  const handoverLogs = data.handoverLogs.filter((log) => log.scheduleId === schedule.scheduleId);
  const handoverLogByField = new Map(handoverLogs.map((log) => [log.fieldId, log]));
  const handover = data.handoverTemplates
    .filter((field) => field.active)
    .sort((a, b) => a.order - b.order)
    .map((field) => {
      const log = handoverLogByField.get(field.fieldId);
      return {
        fieldId: field.fieldId,
        label: field.label,
        isRequired: field.isRequired,
        value: log?.isi ?? "",
        createdBy: log ? employeeById.get(log.createdBy) ?? log.createdBy : "",
        createdAt: log?.createdAt ?? "",
      };
    });
  const checklistCompleted = checklist.filter((item) => item.checked).length;
  const handoverComplete = handover.every((field) => !field.isRequired || Boolean(field.value.trim()));
  const labelByRecord = new Map<string, string>([
    ...checklist.map((item) => [item.pointId, item.description] as const),
    ...handover.map((field) => [field.fieldId, field.label] as const),
  ]);
  const auditHistory = data.audits
    .filter((audit) => audit.scheduleId === schedule.scheduleId)
    .sort((a, b) => a.changedAt.localeCompare(b.changedAt))
    .map((audit) => ({
      auditId: audit.auditId,
      section: audit.section,
      recordLabel: labelByRecord.get(audit.recordId) ?? audit.recordId,
      field: audit.field,
      oldValue: audit.oldValue,
      newValue: audit.newValue,
      actorName: employeeById.get(audit.actorId) ?? audit.actorId,
      changedAt: audit.changedAt,
    }));
  return {
    scheduleId: schedule.scheduleId,
    branchId: branch.branchId,
    branchName: branch.nama,
    date: schedule.date,
    shiftName: shift?.[1] ?? schedule.shiftNameSnapshot ?? schedule.shiftId,
    employeeName: employeeById.get(schedule.employeeId) ?? schedule.employeeNameSnapshot ?? schedule.employeeId,
    status: schedule.status,
    startedAt: schedule.startedAt,
    reportGeneratedAt: schedule.reportGeneratedAt,
    reportToken: schedule.reportToken,
    checklist: {
      items: checklist,
      completed: checklistCompleted,
      total: checklist.length,
      complete: checklist.every((item) => item.checked),
    },
    handover: { fields: handover, complete: handoverComplete },
    auditHistory,
  };
}
