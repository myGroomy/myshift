import { sheets } from "@/lib/google/client";
import { DomainError } from "@/lib/error-codes";

export type SheetRow = { rowNumber: number; values: string[] };

// ---------------------------------------------------------------------------
// Retry helper handles transient Google Sheets errors (429, 500, 503, ECONNRESET).
// Attempts up to MAX_ATTEMPTS with exponential backoff before re-throwing.
// ---------------------------------------------------------------------------
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 300;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status =
        (err as { code?: number })?.code ??
        (err as { status?: number })?.status;
      // Retry only on transient errors: rate-limit (429), server errors (500/503), network reset
      const isTransient =
        status === 429 ||
        status === 500 ||
        status === 503 ||
        (err instanceof Error && /ECONNRESET|ETIMEDOUT/i.test(err.message));
      if (!isTransient || attempt === MAX_ATTEMPTS) throw err;
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1); // 300 ms, 600 ms
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function readRows(spreadsheetId: string, range: string): Promise<SheetRow[]> {
  return withRetry(async () => {
    try {
      const result = await sheets.spreadsheets.values.get({ spreadsheetId, range });
      const rows = result.data.values ?? [];
      const parsed = rows.slice(1).map((values, index) => ({
        rowNumber: index + 2,
        values: values.map(String),
      }));
      return parsed;
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        (err as { cause?: { message?: string } })?.cause?.message ||
        "";
      if (/Unable to parse range/i.test(msg)) {
        return [];
      }
      throw err;
    }
  });
}

export async function appendRow(spreadsheetId: string, range: string, values: string[]) {
  return withRetry(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] },
    })
  );
}

export async function replaceRow(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  values: string[]
) {
  return withRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [values] },
    })
  );
}

export async function deleteRow(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number
) {
  return withRetry(async () => {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });
    const sheet = metadata.data.sheets?.find(
      (entry) => entry.properties?.title === sheetName
    );
    const sheetId = sheet?.properties?.sheetId;
    if (sheetId === undefined)
      throw new Error(`Sheet ${sheetName} tidak ditemukan`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });
  });
}

// Row-number based writes are only safe within a single read; prefer the *ById helpers
// below for writes, since a row added/removed in between would otherwise shift the target.
export async function readRowById(
  spreadsheetId: string,
  range: string,
  id: string
): Promise<SheetRow | undefined> {
  const rows = await readRows(spreadsheetId, range);
  return rows.find((row) => (row.values[0] ?? "").trim() === id);
}

export async function replaceRowById(
  spreadsheetId: string,
  sheetName: string,
  range: string,
  id: string,
  values: string[]
): Promise<boolean> {
  const row = await readRowById(spreadsheetId, range, id);
  if (!row) return false;
  await replaceRow(spreadsheetId, sheetName, row.rowNumber, values);
  return true;
}

export async function deleteRowById(
  spreadsheetId: string,
  sheetName: string,
  range: string,
  id: string
): Promise<boolean> {
  const row = await readRowById(spreadsheetId, range, id);
  if (!row) return false;
  await deleteRow(spreadsheetId, sheetName, row.rowNumber);
  return true;
}

export function requireSpreadsheetId(branchId: string, spreadsheetId?: string) {
  if (!spreadsheetId)
    throw new DomainError("SHEETS_SETUP_REQUIRED", `Spreadsheet cabang ${branchId} belum dikonfigurasi`);
  return spreadsheetId;
}
