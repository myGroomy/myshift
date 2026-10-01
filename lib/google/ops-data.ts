import { branchSpreadsheet } from "@/lib/google/branch-data";
import { sheets } from "@/lib/google/client";
import { appendRow, readRows, replaceRow, replaceRowById } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import { DomainError } from "@/lib/error-codes";

export type ScheduleRecord = {
  rowNumber: number;
  scheduleId: string;
  employeeId: string;
  employeeNameSnapshot: string;
  shiftId: string;
  shiftNameSnapshot: string;
  shiftStartSnapshot: string;
  shiftEndSnapshot: string;
  date: string;
  status: string;
  startedAt: string;
  updatedVia: string;
  reportGeneratedAt: string;
  reportToken: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SwapRecord = {
  rowNumber: number;
  swapId: string;
  scheduleId: string;
  targetScheduleId: string;
  requestedBy: string;
  requestedWith: string;
  reason: string;
  status: string;
  approvedBy: string;
  decidedAt: string;
  rejectReason: string;
  createdAt: string;
  updatedAt: string;
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
  decidedAt: string;
  rejectReason: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryRecord = {
  rowNumber: number;
  id: string;
  label: string;
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SopCategoryRecord = {
  rowNumber: number;
  categoryId: string;
  name: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
};

export type ChecklistLogRecord = {
  rowNumber: number;
  logId: string;
  scheduleId: string;
  pointId: string;
  pointPublicIdSnapshot: string;
  categoryNameSnapshot: string;
  descriptionSnapshot: string;
  completionTypeSnapshot: string;
  unitSnapshot: string;
  minSnapshot: string;
  maxSnapshot: string;
  optionsSnapshot: string;
  isRequiredSnapshot: boolean;
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
  actorNameSnapshot: string;
  changedAt: string;
};

export type HandoverTemplateRecord = {
  rowNumber: number;
  fieldId: string;
  label: string;
  isRequired: boolean;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HandoverLogRecord = {
  rowNumber: number;
  logId: string;
  scheduleId: string;
  fieldId: string;
  fieldPublicIdSnapshot: string;
  labelSnapshot: string;
  isRequiredSnapshot: boolean;
  isi: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type IncidentCategoryRecord = {
  rowNumber: number;
  id: string;
  label: string;
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
};

export type IncidentRecord = {
  rowNumber: number;
  incidentId: string;
  categoryId: string;
  scheduleId: string;
  deskripsi: string;
  severity: string;
  fotoUrl: string;
  status: string;
  resolvedBy: string;
  resolvedAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ShiftReportRecord = {
  rowNumber: number;
  reportId: string;
  scheduleId: string;
  generatedBy: string;
  generatedAt: string;
  publicTokenHash: string;
  publicAccessRevokedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ShiftReportSnapshotRecord = {
  rowNumber: number;
  snapshotId: string;
  reportId: string;
  revision: number;
  snapshotData: string;
  createdBy: string;
  createdAt: string;
};

export type FileAssetRecord = {
  rowNumber: number;
  assetId: string;
  provider: string;
  providerFileId: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  uploadedBy: string;
  createdAt: string;
};

export type IncidentAttachmentRecord = {
  rowNumber: number;
  incidentId: string;
  assetId: string;
};

export type SchemaMigrationRecord = {
  rowNumber: number;
  version: string;
  appliedAt: string;
  checksum: string;
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
      targetScheduleId: values[2] ?? "",
      requestedBy: values[3] ?? "",
      requestedWith: values[4] ?? "",
      reason: values[5] ?? "",
      status: values[6] ?? "pending",
      approvedBy: values[7] ?? "",
      decidedAt: values[8] ?? "",
      rejectReason: values[9] ?? "",
      createdAt: values[10] ?? "",
      updatedAt: values[11] ?? "",
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
      decidedAt: values[7] ?? "",
      rejectReason: values[8] ?? "",
      createdAt: values[9] ?? "",
      updatedAt: values[10] ?? "",
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
      createdAt: values[3] ?? "",
      updatedAt: values[4] ?? "",
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
    createdAt: values[4] ?? "",
    updatedAt: values[5] ?? "",
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
    createdAt: values[12] ?? "",
    updatedAt: values[13] ?? "",
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
    actorNameSnapshot: values[8] ?? "",
    changedAt: values[9] ?? "",
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
    active: toBool(values[4], true),
    createdAt: values[5] ?? "",
    updatedAt: values[6] ?? "",
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
    fieldPublicIdSnapshot: values[3] ?? "",
    labelSnapshot: values[4] ?? "",
    isRequiredSnapshot: toBool(values[5], false),
    isi: values[6] ?? "",
    createdBy: values[7] ?? "",
    createdAt: values[8] ?? "",
    updatedAt: values[9] ?? "",
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
      createdAt: values[3] ?? "",
      updatedAt: values[4] ?? "",
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
      scheduleId: values[2] ?? "",
      deskripsi: values[3] ?? "",
      severity: values[4] ?? "low",
      fotoUrl: values[5] ?? "",
      status: values[6] ?? "open",
      resolvedBy: values[7] ?? "",
      resolvedAt: values[8] ?? "",
      createdBy: values[9] ?? "",
      createdAt: values[10] ?? "",
      updatedAt: values[11] ?? "",
    })),
  };
}

export async function loadShiftReports(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Shift_Reports"));
  return {
    spreadsheetId,
    records: rows.map(({ rowNumber, values }): ShiftReportRecord => ({
      rowNumber,
      reportId: values[0] ?? "",
      scheduleId: values[1] ?? "",
      generatedBy: values[2] ?? "",
      generatedAt: values[3] ?? "",
      publicTokenHash: values[4] ?? "",
      publicAccessRevokedAt: values[5] ?? "",
      createdAt: values[6] ?? "",
      updatedAt: values[7] ?? "",
    })),
  };
}

export async function loadShiftReportSnapshots(branchId: string, reportId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Shift_Report_Snapshots"));
  const records: ShiftReportSnapshotRecord[] = rows.map(({ rowNumber, values }): ShiftReportSnapshotRecord => ({
    rowNumber,
    snapshotId: values[0] ?? "",
    reportId: values[1] ?? "",
    revision: Number(values[2] ?? "0") || 0,
    snapshotData: values[3] ?? "",
    createdBy: values[4] ?? "",
    createdAt: values[5] ?? "",
  }));
  return { spreadsheetId, records: records.filter((record) => record.reportId === reportId) };
}

export async function loadFileAssets(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("File_Assets"));
  return {
    spreadsheetId,
    records: rows.map(({ rowNumber, values }): FileAssetRecord => ({
      rowNumber,
      assetId: values[0] ?? "",
      provider: values[1] ?? "",
      providerFileId: values[2] ?? "",
      storagePath: values[3] ?? "",
      mimeType: values[4] ?? "",
      sizeBytes: Number(values[5] ?? "0") || 0,
      checksum: values[6] ?? "",
      uploadedBy: values[7] ?? "",
      createdAt: values[8] ?? "",
    })),
  };
}

export async function loadIncidentAttachments(branchId: string, incidentId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Incident_Attachments"));
  const records: IncidentAttachmentRecord[] = rows.map(({ rowNumber, values }): IncidentAttachmentRecord => ({
    rowNumber,
    incidentId: values[0] ?? "",
    assetId: values[1] ?? "",
  }));
  return { spreadsheetId, records: records.filter((record) => record.incidentId === incidentId) };
}

export async function loadSchemaMigrations(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Schema_Migrations"));
  return {
    spreadsheetId,
    records: rows.map(({ rowNumber, values }): SchemaMigrationRecord => ({
      rowNumber,
      version: values[0] ?? "",
      appliedAt: values[1] ?? "",
      checksum: values[2] ?? "",
    })),
  };
}
export async function saveChecklistLog(input: {
  spreadsheetId: string;
  scheduleId: string;
  pointId: string;
  pointPublicIdSnapshot: string;
  categoryNameSnapshot: string;
  descriptionSnapshot: string;
  completionTypeSnapshot: string;
  unitSnapshot: string;
  minSnapshot: string;
  maxSnapshot: string;
  optionsSnapshot: string;
  isRequiredSnapshot: boolean;
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
      input.pointPublicIdSnapshot,
      input.categoryNameSnapshot,
      input.descriptionSnapshot,
      input.completionTypeSnapshot,
      input.unitSnapshot,
      input.minSnapshot,
      input.maxSnapshot,
      input.optionsSnapshot,
      input.isRequiredSnapshot ? "TRUE" : "FALSE",
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
    input.pointPublicIdSnapshot,
    input.categoryNameSnapshot,
    input.descriptionSnapshot,
    input.completionTypeSnapshot,
    input.unitSnapshot,
    input.minSnapshot,
    input.maxSnapshot,
    input.optionsSnapshot,
    input.isRequiredSnapshot ? "TRUE" : "FALSE",
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
    input.actorNameSnapshot,
    input.changedAt,
  ]);
}

// Idempotent upsert keyed on (Schedule_ID, Field_ID): re-submitting a handover rewrites the
// existing rows instead of appending a second set (contract §12 idempotency).
export async function saveHandoverLogs(input: {
  spreadsheetId: string;
  scheduleId: string;
  entries: { fieldId: string; value: string }[];
  fieldPublicIdSnapshot: string;
  labelSnapshot: string;
  isRequiredSnapshot: boolean;
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
      const previous = existing.values[6] ?? "";
      await replaceRow(input.spreadsheetId, "Handover_Log", existing.rowNumber, [
        existing.values[0] ?? "",
        input.scheduleId,
        entry.fieldId,
        input.fieldPublicIdSnapshot,
        input.labelSnapshot,
        input.isRequiredSnapshot ? "TRUE" : "FALSE",
        entry.value,
        input.createdBy,
        input.createdAt,
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
          actorNameSnapshot: input.createdBy,
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
      input.fieldPublicIdSnapshot,
      input.labelSnapshot,
      input.isRequiredSnapshot ? "TRUE" : "FALSE",
      entry.value,
      input.createdBy,
      input.createdAt,
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
        actorNameSnapshot: input.createdBy,
        changedAt: input.createdAt,
      });
    }
  }
}

export function scheduleValues(record: ScheduleRecord) {
  return [
    record.scheduleId,
    record.employeeId,
    record.employeeNameSnapshot,
    record.shiftId,
    record.shiftNameSnapshot,
    record.shiftStartSnapshot,
    record.shiftEndSnapshot,
    record.date,
    record.status,
    record.startedAt,
    record.updatedVia || "myshift",
    record.reportGeneratedAt,
    record.reportToken,
    record.createdBy,
    record.createdAt,
    record.updatedAt,
  ];
}

export function swapValues(record: SwapRecord) {
  return [
    record.swapId,
    record.scheduleId,
    record.targetScheduleId,
    record.requestedBy,
    record.requestedWith,
    record.reason,
    record.status,
    record.approvedBy,
    record.decidedAt,
    record.rejectReason,
    record.createdAt,
    record.updatedAt,
  ];
}

export function izinValues(record: IzinRecord) {
  return [
    record.izinId,
    record.employeeId,
    record.scheduleId,
    record.categoryId,
    record.note,
    record.status,
    record.approvedBy,
    record.decidedAt,
    record.rejectReason,
    record.createdAt,
    record.updatedAt,
  ];
}

function assertSaved(saved: boolean, message: string) {
  if (!saved) throw new DomainError("NOT_FOUND", message);
}

// Writes resolve the target row by ID at write time a row number read earlier can be
// stale after a concurrent insert/delete and would overwrite the wrong row (audit M-9).
export async function saveSchedule(spreadsheetId: string, record: ScheduleRecord) {
  assertSaved(
    await replaceRowById(spreadsheetId, "Schedules", branchSheetRange("Schedules"), record.scheduleId, scheduleValues(record)),
    "Jadwal tidak ditemukan"
  );
}

export async function saveScheduleReportFields(
  spreadsheetId: string,
  rowNumber: number,
  reportGeneratedAt: string,
  reportToken: string,
) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Schedules!L${rowNumber}:M${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[reportGeneratedAt, reportToken]] },
  });
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
    record.scheduleId,
    record.deskripsi,
    record.severity,
    record.fotoUrl,
    record.status,
    record.resolvedBy,
    record.resolvedAt,
    record.createdBy,
    record.createdAt,
    record.updatedAt,
  ];
}

export async function saveIncident(spreadsheetId: string, record: IncidentRecord) {
  assertSaved(
    await replaceRowById(spreadsheetId, "Incidents", branchSheetRange("Incidents"), record.incidentId, incidentValues(record)),
    "Incident tidak ditemukan"
  );
}
