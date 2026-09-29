import { drive, sheets } from "@/lib/google/client";
import { DomainError, isDomainError } from "@/lib/error-codes";
import { BRANCH_HEADERS, BRANCH_SHEET_NAMES, headerRange } from "@/lib/google/sheet-schema";
import { getTemplateConfig } from "@/lib/google/registry";

// POST /api/branches must return a usable branch. SHEETS-SCHEMA §1 says Spreadsheet_ID is
// filled automatically when a branch is provisioned, so provisioning happens here instead
// of writing a half-configured row the rest of the app cannot use.

const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";

// Drive rejects these characters in a file/folder name and caps the name at 60 characters.
const DRIVE_ILLEGAL = /[/?*:<>|]/g;
export const DRIVE_NAME_MAX = 60;

// Shared by branch folders and checklist photos so every name we hand to Drive is sanitized the
// same way. Sanitize first, then add whatever suffix the caller needs, then truncate to the cap.
export function driveSafeName(name: string): string {
  return name.replace(DRIVE_ILLEGAL, "-").replace(/\s+/g, " ").trim();
}

export function branchFolderName(branchId: string, nama: string): string {
  return `${driveSafeName(nama)} (${branchId})`.slice(0, DRIVE_NAME_MAX);
}

// Reads TEMPLATES and validates it is usable, so a misconfigured template fails here with a
// setup message instead of producing per-branch files the Sheets API cannot read.
export async function requireTemplateConfig(): Promise<{ templateSpreadsheetId: string; parentFolderId: string }> {
  const config = await getTemplateConfig();
  if (!config.templateSpreadsheetId || !config.parentFolderId) {
    throw new DomainError(
      "SHEETS_SETUP_REQUIRED",
      "Provisioning cabang belum dikonfigurasi. Isi Template_Spreadsheet_ID dan Parent_Folder_ID di sheet TEMPLATES.",
    );
  }

  // The template must be a Google-native Sheet. The generator also emits an .xlsx of the same
  // shape, and copying that would produce per-branch binary files the Sheets API cannot read
  // at all — every later schedule write would fail with a confusing "not found". Check the
  // mimeType up front and say so plainly instead.
  const template = await drive.files.get({
    fileId: config.templateSpreadsheetId,
    fields: "id,mimeType,name",
    supportsAllDrives: true,
  });
  if (template.data.mimeType !== GOOGLE_SHEET_MIME) {
    throw new DomainError(
      "SHEETS_SETUP_REQUIRED",
      `Template_Spreadsheet_ID menunjuk ke "${template.data.name ?? config.templateSpreadsheetId}" (${template.data.mimeType ?? "tipe tidak dikenal"}), bukan Google Spreadsheet. Jalankan \`pnpm template:import\` lalu perbarui nilainya.`,
    );
  }
  return config;
}

export type BranchProvisionResult = { spreadsheetId: string; folderId: string };

// Steps 3-4 of the row-first flow in API-CONTRACT §3: make the branch's own Drive folder, then
// copy the template into it. Returns the IDs so the caller can write them onto the registry row.
// Drive objects created before a later failure are reported via `orphans` on the thrown error.
export async function provisionBranchDrive(
  branchId: string,
  nama: string,
  existingFolderId = "",
): Promise<BranchProvisionResult> {
  const { templateSpreadsheetId, parentFolderId } = await requireTemplateConfig();
  const orphans: string[] = [];

  let folderId = existingFolderId.trim();
  if (folderId) {
    // Reuse the folder so a retry keeps existing checklist photos (API-CONTRACT §3).
    try {
      await drive.files.get({ fileId: folderId, fields: "id", supportsAllDrives: true });
    } catch {
      folderId = "";
    }
  }

  if (!folderId) {
    const created = await drive.files.create({
      supportsAllDrives: true,
      fields: "id",
      requestBody: {
        name: branchFolderName(branchId, nama),
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      },
    });
    if (!created.data.id) {
      throw new DomainError("PROVISION_FAILED", "Google tidak mengembalikan ID folder untuk cabang baru.");
    }
    folderId = created.data.id;
    orphans.push(folderId);
  }

  try {
    const copy = await drive.files.copy({
      fileId: templateSpreadsheetId,
      supportsAllDrives: true,
      fields: "id",
      requestBody: { name: `MYSHIFT ${branchId}`, parents: [folderId] },
    });
    if (!copy.data.id) {
      throw new Error("Drive tidak mengembalikan spreadsheet ID");
    }
    orphans.push(copy.data.id);
    await writeBranchHeaders(copy.data.id);
    return { spreadsheetId: copy.data.id, folderId };
  } catch (error) {
    // Only Drive writes belong here; a SHEETS_SETUP_REQUIRED from header writing is a config
    // problem, not a quota/permission one, and already reports what to fix.
    if (isDomainError(error)) throw error;
    throw new DomainError(
      "PROVISION_FAILED",
      `Gagal menyiapkan spreadsheet untuk ${branchId}.`,
      { data: { orphans } },
    );
  }
}

// Ensures all required sheets exist and headers are correct.
// The template should already have these, but this acts as a safety net.
// Exported so scripts/import-branch-template.ts rewrites headers with the same code path.
export async function writeBranchHeaders(spreadsheetId: string): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
  const existing = new Set(
    (meta.data.sheets ?? [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t)),
  );
  const missing = BRANCH_SHEET_NAMES.filter((name) => !existing.has(name));
  if (missing.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) },
    });
  }

  // Write canonical headers (idempotent — overwrites with correct values)
  await Promise.all(
    BRANCH_SHEET_NAMES.map((name) => {
      const headers = BRANCH_HEADERS[name];
      return sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange(name, headers.length),
        valueInputOption: "RAW",
        requestBody: { values: [[...headers]] },
      });
    }),
  );
}
