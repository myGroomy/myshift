import { sheets } from "@/lib/google/client";

export type SheetRow = { rowNumber: number; values: string[] };

export async function readRows(spreadsheetId: string, range: string): Promise<SheetRow[]> {
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = result.data.values ?? [];
  return rows.slice(1).map((values, index) => ({ rowNumber: index + 2, values: values.map(String) }));
}

export async function appendRow(spreadsheetId: string, range: string, values: string[]) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

export async function replaceRow(spreadsheetId: string, sheetName: string, rowNumber: number, values: string[]) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}

export async function deleteRow(spreadsheetId: string, sheetName: string, rowNumber: number) {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
  const sheet = metadata.data.sheets?.find((entry) => entry.properties?.title === sheetName);
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId === undefined) throw new Error(`Sheet ${sheetName} tidak ditemukan`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber } } }] },
  });
}

export function requireSpreadsheetId(branchId: string, spreadsheetId?: string) {
  if (!spreadsheetId) throw new Error(`Spreadsheet cabang ${branchId} belum dikonfigurasi`);
  return spreadsheetId;
}
