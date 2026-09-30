import { checklistPointComplete, checklistNumericWarning } from "@/lib/domain/checklist-spec-validation";
import { getBranches, getEmployees } from "@/lib/google/registry";
import {
  loadChecklistLogs,
  loadChecklistPoints,
  loadHandoverLogs,
  loadHandoverTemplates,
  loadSchedules,
  loadShiftReportAudits,
  loadSopCategories,
} from "@/lib/google/ops-data";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { readRows } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";

export async function buildShiftReport(branchId: string, scheduleId: string) {
  const [{ records: schedules }, branches, employees, { spreadsheetId }] =
    await Promise.all([loadSchedules(branchId), getBranches(), getEmployees(), branchSpreadsheet(branchId)]);
  const schedule = schedules.find((entry) => entry.scheduleId === scheduleId);
  if (!schedule) return null;
  const [
    { records: points },
    { records: categories },
    { records: checklistLogs },
    { records: handoverTemplates },
    { records: handoverLogs },
    { records: audits },
    shiftRows,
  ] = await Promise.all([
    loadChecklistPoints(branchId),
    loadSopCategories(branchId),
    loadChecklistLogs(branchId, scheduleId),
    loadHandoverTemplates(branchId),
    loadHandoverLogs(branchId, scheduleId),
    loadShiftReportAudits(branchId, scheduleId),
    readRows(spreadsheetId, branchSheetRange("Shifts")),
  ]);
  const employeeById = new Map(employees.map((employee) => [employee.employeeId, employee.nama]));
  const categoryById = new Map(categories.map((category) => [category.categoryId, category.name]));
  const shift = shiftRows.find((row) => row.values[0] === schedule.shiftId);
  const applicablePoints = points
    .filter((point) => point.active && (point.appliesAllShifts || point.shiftIds.includes(schedule.shiftId)))
    .sort((a, b) => a.order - b.order);
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
  const handoverLogByField = new Map(handoverLogs.map((log) => [log.fieldId, log]));
  const handover = handoverTemplates
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
  const auditHistory = audits
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
    scheduleId,
    branchId,
    branchName: branches.find((branch) => branch.branchId === branchId)?.nama ?? branchId,
    date: schedule.date,
    shiftName: shift?.values[1] ?? schedule.shiftId,
    employeeName: employeeById.get(schedule.employeeId) ?? schedule.employeeId,
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
