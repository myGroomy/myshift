import { branchSpreadsheet } from "@/lib/google/branch-data";
import { appendRow, readRows, replaceRow, replaceRowById } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import { DomainError } from "@/lib/error-codes";

export type ScheduleRecord = {
  rowNumber: number;
  scheduleId: string;
  employeeId: string;
  shiftId: string;
  date: string;
  status: string;
  startedAt: string;
  updatedVia: string;
  reportGeneratedAt: string;
  reportToken: string;
};

export type SwapRecord = {
  rowNumber: number;
  swapId: string;
  scheduleId: string;
  requestedBy: string;
  requestedWith: string;
  reason: string;
  status: string;
  approvedBy: string;
  rejectReason: string;
};

export type IzinRecord = {
  rowNumber: number;
  izinId: string;
  employeeId: string;
  scheduleId: string;
  categoryId: string;
  note: string;
  status: string;
  approvedBy: string;
  rejectReason: string;
};

export type CategoryRecord = {
  rowNumber: number;
  id: string;
  label: string;
  aktif: boolean;
};

export type SopCategoryRecord = {
  rowNumber: number;
  categoryId: string;
  name: string;
  order: number;
  active: boolean;
};

export type ChecklistPointRecord = {
  rowNumber: number;
  pointId: string;
  categoryId: string;
  description: string;
  completionType: "centang" | "centang_foto" | "angka" | "teks" | "pilihan";
  unit: string;
  min: string;
  max: string;
  options: string[];
  appliesAllShifts: boolean;
  shiftIds: string[];
  order: number;
  active: boolean;
};

export type ChecklistLogRecord = {
  rowNumber: number;
  logId: string;
  scheduleId: string;
  pointId: string;
  value: string;
  photoUrl: string;
  checkedBy: string;
  checkedAt: string;
};

export type ShiftReportAuditRecord = {
  rowNumber: number;
  auditId: string;
  scheduleId: string;
  section: string;
  recordId: string;
  field: string;
  oldValue: string;
  newValue: string;
  actorId: string;
  changedAt: string;
};

export type HandoverTemplateRecord = {
  rowNumber: number;
  fieldId: string;
  label: string;
  isRequired: boolean;
  order: number;
};

export type HandoverLogRecord = {
  rowNumber: number;
  logId: string;
  scheduleId: string;
  fieldId: string;
  isi: string;
  createdBy: string;
  createdAt: string;
};

export type IncidentCategoryRecord = {
  rowNumber: number;
  id: string;
  label: string;
  aktif: boolean;
};

export type IncidentRecord = {
  rowNumber: number;
  incidentId: string;
  categoryId: string;
  deskripsi: string;
  severity: string;
  fotoUrl: string;
  status: string;
  resolvedBy: string;
  resolvedAt: string;
  createdBy: string;
  createdAt: string;
};

function toBool(value: string | undefined, fallback: boolean) {
  const text = (value ?? "").trim().toUpperCase();
  if (!text) return fallback;
  return text === "TRUE";
}

export async function loadSchedules(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Schedules"));
  return {
    spreadsheetId,
    records: rows.map(({ rowNumber, values }): ScheduleRecord => ({
      rowNumber,
      scheduleId: values[0] ?? "",
      employeeId: values[1] ?? "",
      shiftId: values[2] ?? "",
      date: values[3] ?? "",
      status: values[4] ?? "scheduled",
      startedAt: values[5] ?? "",
      updatedVia: values[6] ?? "",
      reportGeneratedAt: values[7] ?? "",
      reportToken: values[8] ?? "",
    })),
  };
}

export async function loadSwaps(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Shift_Swaps"));
  return {
    spreadsheetId,
    records: rows.map(({ rowNumber, values }): SwapRecord => ({
      rowNumber,
      swapId: values[0] ?? "",
      scheduleId: values[1] ?? "",
      requestedBy: values[2] ?? "",
      requestedWith: values[3] ?? "",
      reason: values[4] ?? "",
      status: values[5] ?? "pending",
      approvedBy: values[6] ?? "",
      rejectReason: values[7] ?? "",
    })),
  };
}

export async function loadIzin(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Izin"));
  return {
    spreadsheetId,
    records: rows.map(({ rowNumber, values }): IzinRecord => ({
      rowNumber,
      izinId: values[0] ?? "",
      employeeId: values[1] ?? "",
      scheduleId: values[2] ?? "",
      categoryId: values[3] ?? "",
      note: values[4] ?? "",
      status: values[5] ?? "pending",
      approvedBy: values[6] ?? "",
      rejectReason: values[7] ?? "",
    })),
  };
}

export async function loadCategories(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Kategori_Izin"));
  return {
    spreadsheetId,
    records: rows.map(({ rowNumber, values }): CategoryRecord => ({
      rowNumber,
      id: values[0] ?? "",
      label: values[1] ?? "",
      aktif: toBool(values[2], true),
    })),
  };
}

export async function loadSopCategories(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("SOP_Kategori"));
  const records: SopCategoryRecord[] = rows.map(({ rowNumber, values }): SopCategoryRecord => ({
    rowNumber,
    categoryId: values[0] ?? "",
    name: values[1] ?? "",
    order: Number(values[2] ?? "0") || 0,
    active: toBool(values[3], true),
  }));
  return { spreadsheetId, records };
}

export async function loadChecklistPoints(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Checklist_Point"));
  const records: ChecklistPointRecord[] = rows.map(({ rowNumber, values }): ChecklistPointRecord => ({
    rowNumber,
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
  }));
  return { spreadsheetId, records };
}

export async function loadChecklistLogs(branchId: string, scheduleId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Checklist_Log"));
  const records: ChecklistLogRecord[] = rows.map(({ rowNumber, values }): ChecklistLogRecord => ({
    rowNumber,
    logId: values[0] ?? "",
    scheduleId: values[1] ?? "",
    pointId: values[2] ?? "",
    value: values[3] ?? "",
    photoUrl: values[4] ?? "",
    checkedBy: values[5] ?? "",
    checkedAt: values[6] ?? "",
  }));
  const latestByPoint = new Map<string, ChecklistLogRecord>();
  for (const record of records.filter((entry) => entry.scheduleId === scheduleId)) {
    latestByPoint.set(record.pointId, record);
  }
  return { spreadsheetId, records: [...latestByPoint.values()] };
}

export async function loadShiftReportAudits(branchId: string, scheduleId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Shift_Report_Audit"));
  const records: ShiftReportAuditRecord[] = rows.map(({ rowNumber, values }) => ({
    rowNumber,
    auditId: values[0] ?? "",
    scheduleId: values[1] ?? "",
    section: values[2] ?? "",
    recordId: values[3] ?? "",
    field: values[4] ?? "",
    oldValue: values[5] ?? "",
    newValue: values[6] ?? "",
    actorId: values[7] ?? "",
    changedAt: values[8] ?? "",
  }));
  return { spreadsheetId, records: records.filter((record) => record.scheduleId === scheduleId) };
}

export async function loadHandoverTemplates(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Handover_Template"));
  const records: HandoverTemplateRecord[] = rows.map(({ rowNumber, values }): HandoverTemplateRecord => ({
    rowNumber,
    fieldId: values[0] ?? "",
    label: values[1] ?? "",
    isRequired: toBool(values[2], false),
    order: Number(values[3] ?? "0") || 0,
  }));
  return { spreadsheetId, records };
}

export async function loadHandoverLogs(branchId: string, scheduleId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Handover_Log"));
  const records: HandoverLogRecord[] = rows.map(({ rowNumber, values }): HandoverLogRecord => ({
    rowNumber,
    logId: values[0] ?? "",
    scheduleId: values[1] ?? "",
    fieldId: values[2] ?? "",
    isi: values[3] ?? "",
    createdBy: values[4] ?? "",
    createdAt: values[5] ?? "",
  }));
  return { spreadsheetId, records: records.filter((record) => record.scheduleId === scheduleId) };
}

export async function loadIncidentCategories(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Kategori_Incident"));
  return {
    spreadsheetId,
    records: rows.map(({ rowNumber, values }): IncidentCategoryRecord => ({
      rowNumber,
      id: values[0] ?? "",
      label: values[1] ?? "",
      aktif: toBool(values[2], true),
    })),
  };
}

export async function loadIncidents(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Incidents"));
  return {
    spreadsheetId,
    records: rows.map(({ rowNumber, values }): IncidentRecord => ({
      rowNumber,
      incidentId: values[0] ?? "",
      categoryId: values[1] ?? "",
      deskripsi: values[2] ?? "",
      severity: values[3] ?? "low",
      fotoUrl: values[4] ?? "",
      status: values[5] ?? "open",
      resolvedBy: values[6] ?? "",
      resolvedAt: values[7] ?? "",
      createdBy: values[8] ?? "",
      createdAt: values[9] ?? "",
    })),
  };
}
export async function saveChecklistLog(input: {
  spreadsheetId: string;
  scheduleId: string;
  pointId: string;
  value: string;
  checkedBy: string;
  checkedAt: string;
  photoUrl: string;
}): Promise<void> {
  const rows = await readRows(input.spreadsheetId, branchSheetRange("Checklist_Log"));
  const existing = rows.find(
    (row) => row.values[1] === input.scheduleId && row.values[2] === input.pointId
  );

  if (existing) {
    await replaceRow(input.spreadsheetId, "Checklist_Log", existing.rowNumber, [
      existing.values[0] ?? "",
      input.scheduleId,
      input.pointId,
      input.value,
      input.photoUrl,
      input.checkedBy,
      input.checkedAt,
    ]);
    return;
  }

  const logId = nextSequentialId(rows.map((row) => row.values[0] ?? ""), ID_PREFIX.checklistLog);
  await appendRow(input.spreadsheetId, branchSheetRange("Checklist_Log"), [
    logId,
    input.scheduleId,
    input.pointId,
    input.value,
    input.photoUrl,
    input.checkedBy,
    input.checkedAt,
  ]);
}

export async function appendShiftReportAudit(input: Omit<ShiftReportAuditRecord, "rowNumber" | "auditId"> & {
  spreadsheetId: string;
}) {
  const rows = await readRows(input.spreadsheetId, branchSheetRange("Shift_Report_Audit"));
  const auditId = nextSequentialId(rows.map((row) => row.values[0] ?? ""), ID_PREFIX.shiftReportAudit);
  await appendRow(input.spreadsheetId, branchSheetRange("Shift_Report_Audit"), [
    auditId,
    input.scheduleId,
    input.section,
    input.recordId,
    input.field,
    input.oldValue,
    input.newValue,
    input.actorId,
    input.changedAt,
  ]);
}

// Idempotent upsert keyed on (Schedule_ID, Field_ID): re-submitting a handover rewrites the
// existing rows instead of appending a second set (contract §12 idempotency).
export async function saveHandoverLogs(input: {
  spreadsheetId: string;
  scheduleId: string;
  entries: { fieldId: string; value: string }[];
  createdBy: string;
  createdAt: string;
  auditAfterReport?: boolean;
}): Promise<void> {
  const rows = await readRows(input.spreadsheetId, branchSheetRange("Handover_Log"));
  const existingByField = new Map(
    rows.filter((row) => row.values[1] === input.scheduleId).map((row) => [row.values[2] ?? "", row])
  );
  const usedIds = rows.map((row) => row.values[0] ?? "");

  for (const entry of input.entries) {
    const existing = existingByField.get(entry.fieldId);
    if (existing) {
      const previous = existing.values[3] ?? "";
      await replaceRow(input.spreadsheetId, "Handover_Log", existing.rowNumber, [
        existing.values[0] ?? "",
        input.scheduleId,
        entry.fieldId,
        entry.value,
        input.createdBy,
        input.createdAt,
      ]);
      if (input.auditAfterReport && previous !== entry.value) {
        await appendShiftReportAudit({
          spreadsheetId: input.spreadsheetId,
          scheduleId: input.scheduleId,
          section: "handover",
          recordId: entry.fieldId,
          field: "Isi",
          oldValue: previous,
          newValue: entry.value,
          actorId: input.createdBy,
          changedAt: input.createdAt,
        });
      }
      continue;
    }

    const logId = nextSequentialId(usedIds, ID_PREFIX.handoverLog);
    usedIds.push(logId);
    await appendRow(input.spreadsheetId, branchSheetRange("Handover_Log"), [
      logId,
      input.scheduleId,
      entry.fieldId,
      entry.value,
      input.createdBy,
      input.createdAt,
    ]);
    if (input.auditAfterReport && entry.value) {
      await appendShiftReportAudit({
        spreadsheetId: input.spreadsheetId,
        scheduleId: input.scheduleId,
        section: "handover",
        recordId: entry.fieldId,
        field: "Isi",
        oldValue: "",
        newValue: entry.value,
        actorId: input.createdBy,
        changedAt: input.createdAt,
      });
    }
  }
}

export function scheduleValues(record: ScheduleRecord) {
  return [
    record.scheduleId,
    record.employeeId,
    record.shiftId,
    record.date,
    record.status,
    record.startedAt,
    record.updatedVia || "myshift",
    record.reportGeneratedAt,
    record.reportToken,
  ];
}

export function swapValues(record: SwapRecord) {
  return [record.swapId, record.scheduleId, record.requestedBy, record.requestedWith, record.reason, record.status, record.approvedBy, record.rejectReason];
}

export function izinValues(record: IzinRecord) {
  return [record.izinId, record.employeeId, record.scheduleId, record.categoryId, record.note, record.status, record.approvedBy, record.rejectReason];
}

function assertSaved(saved: boolean, message: string) {
  if (!saved) throw new DomainError("NOT_FOUND", message);
}

// Writes resolve the target row by ID at write time — a row number read earlier can be
// stale after a concurrent insert/delete and would overwrite the wrong row (audit M-9).
export async function saveSchedule(spreadsheetId: string, record: ScheduleRecord) {
  assertSaved(
    await replaceRowById(spreadsheetId, "Schedules", branchSheetRange("Schedules"), record.scheduleId, scheduleValues(record)),
    "Jadwal tidak ditemukan"
  );
}

export async function saveSwap(spreadsheetId: string, record: SwapRecord) {
  assertSaved(
    await replaceRowById(spreadsheetId, "Shift_Swaps", branchSheetRange("Shift_Swaps"), record.swapId, swapValues(record)),
    "Pengajuan swap tidak ditemukan"
  );
}

export async function saveIzin(spreadsheetId: string, record: IzinRecord) {
  assertSaved(
    await replaceRowById(spreadsheetId, "Izin", branchSheetRange("Izin"), record.izinId, izinValues(record)),
    "Pengajuan izin tidak ditemukan"
  );
}

export function incidentValues(record: IncidentRecord) {
  return [
    record.incidentId,
    record.categoryId,
    record.deskripsi,
    record.severity,
    record.fotoUrl,
    record.status,
    record.resolvedBy,
    record.resolvedAt,
    record.createdBy,
    record.createdAt,
  ];
}

export async function saveIncident(spreadsheetId: string, record: IncidentRecord) {
  assertSaved(
    await replaceRowById(spreadsheetId, "Incidents", branchSheetRange("Incidents"), record.incidentId, incidentValues(record)),
    "Incident tidak ditemukan"
  );
}
