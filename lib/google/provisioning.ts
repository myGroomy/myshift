import { drive, sheets } from "@/lib/google/client";
import { DomainError } from "@/lib/error-codes";
import { BRANCH_HEADERS, BRANCH_SHEET_NAMES, headerRange } from "@/lib/google/sheet-schema";

// POST /api/branches must return a usable branch. SHEETS-SCHEMA §1 says Spreadsheet_ID is
// filled automatically when a branch is provisioned, so provisioning happens here instead
// of writing a half-configured row the rest of the app cannot use.

async function addMissingSheets(spreadsheetId: string): Promise<void> {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
  const existing = new Set(
    (metadata.data.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title)),
  );
  const missing = BRANCH_SHEET_NAMES.filter((name) => !existing.has(name));
  if (missing.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) },
    });
  }
}

// A fresh branch spreadsheet has no data yet, so writing the canonical headers is safe and
// also repairs templates created by older versions of setup-sheets.ts.
export async function writeBranchHeaders(spreadsheetId: string): Promise<void> {
  await addMissingSheets(spreadsheetId);
  await Promise.all(
    BRANCH_SHEET_NAMES.map((name) => {
      const headers = BRANCH_HEADERS[name];
      return sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange(name, headers.length),
        valueInputOption: "RAW",
        requestBody: { values: [headerValuesFor(name)] },
      });
    }),
  );
}

function headerValuesFor(name: (typeof BRANCH_SHEET_NAMES)[number]): string[] {
  return [...BRANCH_HEADERS[name]];
}

async function copyFromTemplate(templateId: string, name: string, folderId?: string) {
  const copy = await drive.files.copy({
    fileId: templateId,
    supportsAllDrives: true,
    fields: "id",
    requestBody: { name, ...(folderId ? { parents: [folderId] } : {}) },
  });
  return copy.data.id ?? undefined;
}

async function createBlankSpreadsheet(name: string) {
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: name },
      sheets: BRANCH_SHEET_NAMES.map((title) => ({ properties: { title } })),
    },
  });
  return created.data.spreadsheetId ?? undefined;
}

export async function createBranchSpreadsheet(branchId: string, branchName: string): Promise<string> {
  const templateId = process.env.TEMPLATE_SPREADSHEET_ID?.trim();
  const folderId = process.env.MYSHIFT_FOLDER?.trim();
  const title = `MYSHIFT ${branchName} (${branchId})`;

  let spreadsheetId: string | undefined;

  if (templateId) {
    try {
      spreadsheetId = await copyFromTemplate(templateId, title, folderId);
    } catch (error) {
      console.error("[myshift] template copy failed, falling back to a blank spreadsheet:", error);
    }
  }

  if (!spreadsheetId) {
    if (!templateId && !folderId) {
      throw new DomainError(
        "SHEETS_SETUP_REQUIRED",
        "Provisioning cabang belum dikonfigurasi (TEMPLATE_SPREADSHEET_ID / MYSHIFT_FOLDER kosong).",
      );
    }
    spreadsheetId = await createBlankSpreadsheet(title);
  }

  if (!spreadsheetId) {
    throw new DomainError("SHEETS_SETUP_REQUIRED", "Google tidak mengembalikan spreadsheet ID untuk cabang baru.");
  }

  await writeBranchHeaders(spreadsheetId);
  return spreadsheetId;
}
