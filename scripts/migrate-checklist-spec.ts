import { config } from "dotenv";
import { sheets } from "@/lib/google/client";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { getBranches } from "@/lib/google/registry";
import {
  migrateLegacyChecklistLogs,
  migrateLegacyChecklistRows,
  nextSopCategoryId,
  type LegacyChecklistLog,
  type LegacyChecklistRow,
  type LegacyShift,
} from "@/lib/domain/checklist-migration";
import { BRANCH_HEADERS } from "@/lib/google/sheet-schema";
import { readRows } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { nextSequentialId } from "@/lib/ids";
import { blockingDiffs, describeDiffs, verifyBranchSpreadsheet } from "@/lib/google/template-verify";

config({ path: ".env.local" });

const LEGACY_TEMPLATE = "Checklist_Template";
const LEGACY_LOG = "Checklist_Log";
const TEMPLATE_ARCHIVE = "Checklist_Template_Legacy";
const LOG_ARCHIVE = "Checklist_Log_Legacy";
const DEFAULT_INCIDENT_CATEGORIES = [
  "Mesin Rusak",
  "Komplain Customer",
  "Barang Rusak",
  "Stok Habis",
  "Kesalahan Order",
  "Kebersihan",
  "Keamanan",
  "Karyawan Berhalangan",
  "Lainnya",
];

function arg(name: string) {
  const match = process.argv.slice(2).find((value) => value.startsWith(`--${name}=`));
  return match?.slice(name.length + 3)?.trim();
}

async function getTitles(spreadsheetId: string) {
  const result = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties(title,sheetId)" });
  return (result.data.sheets ?? []).map((sheet) => ({
    title: sheet.properties?.title ?? "",
    sheetId: sheet.properties?.sheetId,
  }));
}

async function ensureMigration(branchId: string, apply: boolean) {
  const { spreadsheetId } = await branchSpreadsheet(branchId);
  const titles = await getTitles(spreadsheetId);
  const titleSet = new Set(titles.map((sheet) => sheet.title));
  const oldTemplateSource = titleSet.has(TEMPLATE_ARCHIVE) ? TEMPLATE_ARCHIVE : LEGACY_TEMPLATE;
  const oldLogSource = titleSet.has(LOG_ARCHIVE) ? LOG_ARCHIVE : LEGACY_LOG;
  const legacyLogHeader = titleSet.has(LEGACY_LOG)
    ? (await sheets.spreadsheets.values.get({ spreadsheetId, range: `${LEGACY_LOG}!A1:G1` })).data.values?.[0]?.map(String) ?? []
    : [];
  const checklistLogIsLegacy = titleSet.has(LEGACY_LOG)
    && (legacyLogHeader[2] === "Item_ID" || legacyLogHeader.length < 7);
  const scheduleHeader = (await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Schedules!A1:I1",
  })).data.values?.[0]?.map(String) ?? [];
  const legacyScheduleHeader = BRANCH_HEADERS.Schedules.slice(0, 7);
  if (
    scheduleHeader.length > 0 &&
    scheduleHeader.join("|") !== legacyScheduleHeader.join("|") &&
    scheduleHeader.join("|") !== BRANCH_HEADERS.Schedules.join("|")
  ) {
    throw new Error(`${branchId}: header Schedules tidak dikenal; migrasi dibatalkan.`);
  }
  if (titleSet.has("Checklist_Point")) {
    const header = (await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Checklist_Point!A1:L1",
    })).data.values?.[0]?.map(String) ?? [];
    if (header.length > 0 && header.join("|") !== BRANCH_HEADERS.Checklist_Point.join("|")) {
      throw new Error(`${branchId}: header Checklist_Point tidak dikenal; migrasi dibatalkan.`);
    }
  }
  if (titleSet.has("SOP_Kategori")) {
    const header = (await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "SOP_Kategori!A1:D1",
    })).data.values?.[0]?.map(String) ?? [];
    if (header.length > 0 && header.join("|") !== BRANCH_HEADERS.SOP_Kategori.join("|")) {
      throw new Error(`${branchId}: header SOP_Kategori tidak dikenal; migrasi dibatalkan.`);
    }
  }
  const hasLegacyTemplate = titleSet.has(oldTemplateSource);
  const hasLegacyLog = titleSet.has(oldLogSource);
  const legacyTemplateRows = hasLegacyTemplate
    ? await readRows(spreadsheetId, `${oldTemplateSource}!A:F`)
    : [];
  const legacyLogRows = hasLegacyLog
    ? await readRows(spreadsheetId, `${oldLogSource}!A:F`)
    : [];
  const shiftsRows = await readRows(spreadsheetId, "Shifts!A:D");
  const pointRows = titleSet.has("Checklist_Point")
    ? await readRows(spreadsheetId, branchSheetRange("Checklist_Point"))
    : [];
  const logRows = titleSet.has("Checklist_Log") && !checklistLogIsLegacy
    ? await readRows(spreadsheetId, branchSheetRange("Checklist_Log"))
    : [];
  const categoryRows = titleSet.has("SOP_Kategori")
    ? await readRows(spreadsheetId, branchSheetRange("SOP_Kategori"))
    : [];
  const incidentCategoryRows = titleSet.has("Kategori_Incident")
    ? await readRows(spreadsheetId, branchSheetRange("Kategori_Incident"))
    : [];
  const incidentRows = titleSet.has("Incidents")
    ? await readRows(spreadsheetId, branchSheetRange("Incidents"))
    : [];

  const legacyItems: LegacyChecklistRow[] = legacyTemplateRows.map(({ values }) => ({
    itemId: values[0] ?? "",
    type: values[1] ?? "",
    description: values[2] ?? "",
    requiresPhoto: (values[3] ?? "FALSE").toUpperCase() === "TRUE",
    order: Number(values[4] ?? "0") || 0,
    active: (values[5] ?? "TRUE").toUpperCase() === "TRUE",
  }));
  const legacyLogs: LegacyChecklistLog[] = legacyLogRows.map(({ values }) => ({
    logId: values[0] ?? "",
    scheduleId: values[1] ?? "",
    itemId: values[2] ?? "",
    checkedBy: values[3] ?? "",
    checkedAt: values[4] ?? "",
    photoUrl: values[5] ?? "",
  }));
  const shifts: LegacyShift[] = shiftsRows.map(({ values }) => ({
    shiftId: values[0] ?? "",
    name: values[1] ?? "",
  }));
  const existingCategoryIds = categoryRows.map((row) => row.values[0] ?? "");
  const categoryId = existingCategoryIds[0] || nextSopCategoryId(existingCategoryIds);
  const existingIncidentCategoryIds = incidentCategoryRows.map((row) => row.values[0] ?? "");
  const incidentCategoryValues = incidentCategoryRows.length
    ? incidentCategoryRows.map((row) => row.values)
    : DEFAULT_INCIDENT_CATEGORIES.map((label) => {
        const id = nextSequentialId(existingIncidentCategoryIds, "KIC-");
        existingIncidentCategoryIds.push(id);
        return [id, label, "TRUE"];
      });
  const pointMigration = pointRows.length
    ? []
    : migrateLegacyChecklistRows({ items: legacyItems, shifts, categoryId });
  const logMigration = logRows.length ? [] : migrateLegacyChecklistLogs({ logs: legacyLogs });
  const requests: Array<Record<string, unknown>> = [];

  if (!titleSet.has("Checklist_Point")) {
    if (titleSet.has(LEGACY_TEMPLATE) && !titleSet.has(TEMPLATE_ARCHIVE)) {
      const sheetId = titles.find((sheet) => sheet.title === LEGACY_TEMPLATE)?.sheetId;
      if (sheetId !== undefined) requests.push({
        updateSheetProperties: { properties: { sheetId, title: TEMPLATE_ARCHIVE }, fields: "title" },
      });
    }
    requests.push({ addSheet: { properties: { title: "Checklist_Point" } } });
  }
  if (!titleSet.has("Checklist_Log") || checklistLogIsLegacy) {
    if (checklistLogIsLegacy && !titleSet.has(LOG_ARCHIVE)) {
      const sheetId = titles.find((sheet) => sheet.title === LEGACY_LOG)?.sheetId;
      if (sheetId !== undefined) requests.push({
        updateSheetProperties: { properties: { sheetId, title: LOG_ARCHIVE }, fields: "title" },
      });
    } else if (checklistLogIsLegacy) {
      throw new Error(`Keduanya ada: ${LEGACY_LOG} lama dan ${LOG_ARCHIVE}; periksa migrasi manual sebelum lanjut.`);
    }
    requests.push({ addSheet: { properties: { title: "Checklist_Log" } } });
  }
  if (!titleSet.has("SOP_Kategori")) requests.push({ addSheet: { properties: { title: "SOP_Kategori" } } });
  if (!titleSet.has("Shift_Report_Audit")) requests.push({ addSheet: { properties: { title: "Shift_Report_Audit" } } });
  if (!titleSet.has("Kategori_Incident")) requests.push({ addSheet: { properties: { title: "Kategori_Incident" } } });
  if (!titleSet.has("Incidents")) requests.push({ addSheet: { properties: { title: "Incidents" } } });

  for (const [sheetName, dataRows, width] of [
    ["Kategori_Incident", incidentCategoryRows, 3],
    ["Incidents", incidentRows, 10],
  ] as const) {
    if (!titleSet.has(sheetName)) continue;
    const header = (await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:${String.fromCharCode(64 + width)}1`,
    })).data.values?.[0]?.map(String) ?? [];
    if (
      header.length > 0 &&
      header.join("|") !== BRANCH_HEADERS[sheetName].join("|")
    ) {
      throw new Error(`${branchId}: header ${sheetName} sudah ada tetapi tidak sesuai; perlu ditinjau manual.`);
    }
    if (dataRows.length > 0 && header.length === 0) {
      throw new Error(`${branchId}: ${sheetName} berisi data tanpa header; perlu ditinjau manual.`);
    }
  }

  const summary = {
    branchId,
    spreadsheetId,
    legacyChecklistPoints: legacyItems.length,
    legacyChecklistLogs: legacyLogs.length,
    newPointsToWrite: pointMigration.length,
    newLogsToWrite: logMigration.length,
    incidentCategoriesToWrite: incidentCategoryRows.length ? 0 : incidentCategoryValues.length,
    archiveOldTemplate: titleSet.has(LEGACY_TEMPLATE) && !titleSet.has(TEMPLATE_ARCHIVE),
    archiveOldLogs: titleSet.has(LEGACY_LOG) && !titleSet.has(LOG_ARCHIVE),
    createNewSheets: requests.filter((request) => "addSheet" in request).map((request) =>
      (request.addSheet as { properties: { title: string } }).properties.title),
  };
  console.log(`${apply ? "APPLY" : "PREVIEW"} ${JSON.stringify(summary)}`);
  if (!apply) return;

  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: requests as never[] },
    });
  }
  const hasDefaultCategory = categoryRows.length > 0;
  const categoryValues = hasDefaultCategory
    ? categoryRows.map((row) => row.values)
    : [[categoryId, "Umum", "1", "TRUE"]];
  const pointValues = pointRows.length ? pointRows.map((row) => row.values) : pointMigration;
  const logValues = logRows.length ? logRows.map((row) => row.values) : logMigration;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: "SOP_Kategori!A1:D", values: [[...BRANCH_HEADERS.SOP_Kategori], ...categoryValues] },
        { range: "Checklist_Point!A1:L", values: [[...BRANCH_HEADERS.Checklist_Point], ...pointValues] },
        { range: "Checklist_Log!A1:G", values: [[...BRANCH_HEADERS.Checklist_Log], ...logValues] },
        { range: "Shift_Report_Audit!A1:I", values: [[...BRANCH_HEADERS.Shift_Report_Audit]] },
        { range: "Kategori_Incident!A1:C", values: [[...BRANCH_HEADERS.Kategori_Incident], ...incidentCategoryValues] },
        { range: "Incidents!A1:J", values: [[...BRANCH_HEADERS.Incidents]] },
        { range: "Schedules!H1:I1", values: [["Report_Generated_At", "Report_Token"]] },
      ],
    },
  });
  const diffs = blockingDiffs(await verifyBranchSpreadsheet(spreadsheetId));
  if (diffs.length > 0) {
    throw new Error(`${branchId}: migrasi selesai sebagian, header belum sesuai: ${describeDiffs(diffs)}`);
  }
}

async function main() {
  const selected = arg("branch");
  const apply = process.argv.includes("--apply");
  const branches = (await getBranches()).filter((branch) =>
    branch.aktif && branch.provisionStatus === "ready" && (!selected || branch.branchId === selected),
  );
  if (selected && !branches.some((branch) => branch.branchId === selected)) {
    throw new Error(`Cabang ${selected} tidak ditemukan, nonaktif, atau belum ready.`);
  }
  if (!branches.length) {
    console.log("Tidak ada cabang ready untuk dimigrasikan.");
    return;
  }
  for (const branch of branches) await ensureMigration(branch.branchId, apply);
  if (!apply) console.log("Preview saja; tambahkan --apply untuk menulis. Data lama akan tetap disimpan di sheet arsip.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
