import { branchSpreadsheet } from "@/lib/google/branch-data";
import { readRows, replaceRow, appendRow } from "@/lib/google/sheets-data";

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

export async function loadSchedules(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, "Schedules!A:G");
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
  const rows = await readRows(spreadsheetId, "Shift_Swaps!A:H");
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
  const rows = await readRows(spreadsheetId, "Izin!A:H");
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
  const rows = await readRows(spreadsheetId, "Kategori_Izin!A:C");
  return {
    spreadsheetId,
    records: rows.map(({ rowNumber, values }): CategoryRecord => ({
      rowNumber,
      id: values[0] ?? "",
      label: values[1] ?? "",
      aktif: (values[2] ?? "TRUE").toUpperCase() === "TRUE",
    })),
  };
}

export async function loadChecklistTemplates(branchId: string, type?: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, "Checklist_Template!A:G");
  const records: ChecklistTemplateRecord[] = rows.map(({ rowNumber, values }): ChecklistTemplateRecord => ({
    rowNumber,
    itemId: values[0] ?? "",
    type: values[1] ?? "",
    description: values[2] ?? "",
    requiresPhoto: (values[3] ?? "FALSE").toUpperCase() === "TRUE",
    order: Number(values[4] ?? "0") || 0,
    active: (values[5] ?? "TRUE").toUpperCase() === "TRUE",
  }));
  return { spreadsheetId, records: type ? records.filter((r) => r.type === type) : records };
}

export async function loadChecklistLogs(branchId: string, scheduleId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, "Checklist_Log!A:F");
  const records: ChecklistLogRecord[] = rows.map(({ rowNumber, values }): ChecklistLogRecord => ({
    rowNumber,
    logId: values[0] ?? "",
    scheduleId: values[1] ?? "",
    itemId: values[2] ?? "",
    checkedBy: values[3] ?? "",
    checkedAt: values[4] ?? "",
    photoUrl: values[5] ?? "",
  }));
  return { spreadsheetId, records: records.filter((r) => r.scheduleId === scheduleId) };
}

export async function loadHandoverTemplates(branchId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, "Handover_Template!A:D");
  const records: HandoverTemplateRecord[] = rows.map(({ rowNumber, values }): HandoverTemplateRecord => ({
    rowNumber,
    fieldId: values[0] ?? "",
    label: values[1] ?? "",
    isRequired: (values[2] ?? "FALSE").toUpperCase() === "TRUE",
    order: Number(values[3] ?? "0") || 0,
  }));
  return { spreadsheetId, records };
}

export async function loadHandoverLogs(branchId: string, scheduleId: string) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const rows = await readRows(spreadsheetId, "Handover_Log!A:F");
  const records: HandoverLogRecord[] = rows.map(({ rowNumber, values }): HandoverLogRecord => ({
    rowNumber,
    logId: values[0] ?? "",
    scheduleId: values[1] ?? "",
    fieldId: values[2] ?? "",
    isi: values[3] ?? "",
    createdBy: values[4] ?? "",
    createdAt: values[5] ?? "",
  }));
  return { spreadsheetId, records: records.filter((r) => r.scheduleId === scheduleId) };
}

export async function appendChecklistLog(spreadsheetId: string, values: string[]) {
  await appendRow(spreadsheetId, "Checklist_Log!A:F", values);
}

export async function appendHandoverLog(spreadsheetId: string, values: string[]) {
  await appendRow(spreadsheetId, "Handover_Log!A:F", values);
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

export async function saveSchedule(spreadsheetId: string, record: ScheduleRecord) {
  await replaceRow(spreadsheetId, "Schedules", record.rowNumber, scheduleValues(record));
}

export async function saveSwap(spreadsheetId: string, record: SwapRecord) {
  await replaceRow(spreadsheetId, "Shift_Swaps", record.rowNumber, swapValues(record));
}

export async function saveIzin(spreadsheetId: string, record: IzinRecord) {
  await replaceRow(spreadsheetId, "Izin", record.rowNumber, izinValues(record));
}