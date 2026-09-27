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

export type ChecklistTemplateRecord = {
  rowNumber: number;
  itemId: string;
  type: string;
  description: string;
  requiresPhoto: boolean;
  order: number;
  active: boolean;
};

export type ChecklistLogRecord = {
  rowNumber: number;
  logId: string;
  scheduleId: string;
  itemId: string;
  checkedBy: string;
  checkedAt: string;
  photoUrl: string;
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

export async function loadChecklistTemplates(branchId: string, type?: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Checklist_Template"));
  const records: ChecklistTemplateRecord[] = rows.map(({ rowNumber, values }): ChecklistTemplateRecord => ({
    rowNumber,
    itemId: values[0] ?? "",
    type: values[1] ?? "",
    description: values[2] ?? "",
    requiresPhoto: toBool(values[3], false),
    order: Number(values[4] ?? "0") || 0,
    active: toBool(values[5], true),
  }));
  return { spreadsheetId, records: type ? records.filter((record) => record.type === type) : records };
}

export async function loadChecklistLogs(branchId: string, scheduleId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, branchSheetRange("Checklist_Log"));
  const records: ChecklistLogRecord[] = rows.map(({ rowNumber, values }): ChecklistLogRecord => ({
    rowNumber,
    logId: values[0] ?? "",
    scheduleId: values[1] ?? "",
    itemId: values[2] ?? "",
    checkedBy: values[3] ?? "",
    checkedAt: values[4] ?? "",
    photoUrl: values[5] ?? "",
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

// Idempotent: a second tap on the same item does not create a duplicate log row.
export async function appendChecklistLogIfAbsent(input: {
  spreadsheetId: string;
  scheduleId: string;
  itemId: string;
  checkedBy: string;
  checkedAt: string;
  photoUrl: string;
}): Promise<boolean> {
  const rows = await readRows(input.spreadsheetId, branchSheetRange("Checklist_Log"));
  const existing = rows.find(
    (row) => row.values[1] === input.scheduleId && row.values[2] === input.itemId
  );

  if (existing) {
    const previousPhoto = existing.values[5] ?? "";
    if (input.photoUrl && input.photoUrl !== previousPhoto) {
      await replaceRow(input.spreadsheetId, "Checklist_Log", existing.rowNumber, [
        existing.values[0] ?? "",
        input.scheduleId,
        input.itemId,
        existing.values[3] || input.checkedBy,
        existing.values[4] || input.checkedAt,
        input.photoUrl,
      ]);
    }
    return false;
  }

  const logId = nextSequentialId(rows.map((row) => row.values[0] ?? ""), ID_PREFIX.checklistLog);
  await appendRow(input.spreadsheetId, branchSheetRange("Checklist_Log"), [
    logId,
    input.scheduleId,
    input.itemId,
    input.checkedBy,
    input.checkedAt,
    input.photoUrl,
  ]);
  return true;
}

// Idempotent upsert keyed on (Schedule_ID, Field_ID): re-submitting a handover rewrites the
// existing rows instead of appending a second set (contract §12 idempotency).
export async function saveHandoverLogs(input: {
  spreadsheetId: string;
  scheduleId: string;
  entries: { fieldId: string; value: string }[];
  createdBy: string;
  createdAt: string;
}): Promise<void> {
  const rows = await readRows(input.spreadsheetId, branchSheetRange("Handover_Log"));
  const existingByField = new Map(
    rows.filter((row) => row.values[1] === input.scheduleId).map((row) => [row.values[2] ?? "", row])
  );
  const usedIds = rows.map((row) => row.values[0] ?? "");

  for (const entry of input.entries) {
    const existing = existingByField.get(entry.fieldId);
    if (existing) {
      await replaceRow(input.spreadsheetId, "Handover_Log", existing.rowNumber, [
        existing.values[0] ?? "",
        input.scheduleId,
        entry.fieldId,
        entry.value,
        input.createdBy,
        input.createdAt,
      ]);
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
  }
}

export function scheduleValues(record: ScheduleRecord) {
  return [record.scheduleId, record.employeeId, record.shiftId, record.date, record.status, record.startedAt, record.updatedVia || "myshift"];
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
