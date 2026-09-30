import type { drive_v3 } from "googleapis";
import { drive, sheets } from "@/lib/google/client";
import { DomainError, isDomainError } from "@/lib/error-codes";
import { BRANCH_HEADERS, BRANCH_SHEET_NAMES, headerRange } from "@/lib/google/sheet-schema";
import { getTemplateConfig, type TemplateConfig } from "@/lib/google/registry";
import { assertBranchSpreadsheetSchema } from "@/lib/google/template-verify";
import { assertBridgeConfigured, bridgeCopyFile } from "@/lib/google/drive-bridge";

// Branch provisioning (PLAN/Db refactor-plan.md Step 3.2, SHEETS-SCHEMA.md §1 "Alur Provisioning
// Cabang Baru"): reserve a registry row, create the branch folder, copy the template, verify the
// copy's headers, record the IDs. `spreadsheets.create` is not called anywhere it is what failed
// with a Drive storage quota error in the first place.

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

/** Only the Drive calls this module makes, so tests can pass a fake (see test/provisioning.test.ts). */
export type DriveFilesApi = Pick<drive_v3.Drive, "files">;

export type ProvisionDeps = {
  drive?: DriveFilesApi;
  /** Reads TEMPLATES; injectable so tests do not need the Registry. */
  templateConfig?: () => Promise<TemplateConfig>;
  /** Header check run on the copy before it is reported as usable; injectable for tests. */
  verify?: (spreadsheetId: string) => Promise<void>;
  /**
   * Creates the branch spreadsheet from the template. Defaults to the Apps Script Drive bridge,
   * because the service account has zero Drive storage and `files.copy` is refused for it
   * (PLAN/Db refactor-plan.md Step 0b). Injectable so tests run without a bridge.
   */
  copyTemplate?: (input: { templateSpreadsheetId: string; folderId: string; name: string }) => Promise<string>;
};

function resolveDeps(deps: ProvisionDeps) {
  const driveApi = deps.drive ?? drive;
  return {
    drive: driveApi,
    templateConfig: deps.templateConfig ?? (() => requireTemplateConfig(driveApi)),
    verify: deps.verify ?? ((spreadsheetId: string) => assertBranchSpreadsheetSchema(spreadsheetId)),
    copyTemplate:
      deps.copyTemplate ??
      (async (input: { templateSpreadsheetId: string; folderId: string; name: string }) =>
        (await bridgeCopyFile(input)).fileId),
  };
}

// Reads TEMPLATES and validates it is usable, so a misconfigured template fails here with a
// setup message instead of producing per-branch files the Sheets API cannot read.
export async function requireTemplateConfig(
  driveApi: DriveFilesApi = drive,
): Promise<{ templateSpreadsheetId: string; parentFolderId: string }> {
  const config = await getTemplateConfig();
  if (!config.templateSpreadsheetId || !config.parentFolderId) {
    throw new DomainError(
      "SHEETS_SETUP_REQUIRED",
      "Provisioning cabang belum dikonfigurasi. Isi Template_Spreadsheet_ID dan Parent_Folder_ID di sheet TEMPLATES.",
    );
  }

  // The template must be a Google-native Sheet. The generator also emits an .xlsx of the same
  // shape, and copying that produces per-branch binary files the Sheets API cannot read at all —
  // every later schedule write would fail with a confusing "not found". Check the mimeType up
  // front and say so plainly instead. (It also needs real Drive storage: a copy of a binary file is
  // charged to the service account's quota, which is exactly the failure this refactor avoids.)
  const template = await driveApi.files.get({
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

export type BranchProvisionResult = {
  spreadsheetId: string;
  folderId: string;
  /** True when an existing copy was reused instead of making a second one (Step 3.2 idempotency). */
  reusedSpreadsheet: boolean;
};

export type ProvisionOptions = {
  /** Existing branch folder; reused so a retry keeps already-uploaded checklist photos. */
  existingFolderId?: string;
  /** Existing copy from an earlier attempt; reused when it still exists and matches the schema. */
  existingSpreadsheetId?: string;
  /**
   * Called as soon as each Drive object exists, so the caller can persist the IDs to the Registry
   * before anything else can fail. Without this a copy whose next step fails becomes an orphan
   * that nothing points at (Step 3.2 "catat ID hasil copy ke Registry secepat mungkin").
   */
  onDriveObject?: (ids: { folderId: string; spreadsheetId: string }) => Promise<void>;
};

async function fileExists(driveApi: DriveFilesApi, fileId: string): Promise<boolean> {
  try {
    const found = await driveApi.files.get({ fileId, fields: "id", supportsAllDrives: true });
    return Boolean(found.data.id);
  } catch {
    return false;
  }
}

// Steps 3-6 of the row-first flow in API-CONTRACT §3: make the branch's own Drive folder, copy the
// template into it, verify the copy against SHEETS-SCHEMA §2, and hand the IDs back so the caller
// can set the row to `ready`. Drive objects created before a later failure are reported via
// `orphans` on the thrown error so they can be cleaned up instead of disappearing.
//
// Idempotent by construction: an existing folder is reused, and an existing spreadsheet is reused
// when it is still readable and matches the schema so retrying a `failed` branch creates neither
// a second row nor a second copy.
export async function provisionBranchDrive(
  branchId: string,
  nama: string,
  options: ProvisionOptions = {},
  deps: ProvisionDeps = {},
): Promise<BranchProvisionResult> {
  const { drive: driveApi, templateConfig, verify, copyTemplate } = resolveDeps(deps);

  // Fail fast: the copy runs through the Apps Script bridge, so an unconfigured deployment must be
  // reported before anything is created creating the folder first would only orphan it.
  if (!deps.copyTemplate) assertBridgeConfigured();

  const { templateSpreadsheetId, parentFolderId } = await templateConfig();
  const orphans: string[] = [];
  const report = options.onDriveObject ?? (async () => {});

  let folderId = (options.existingFolderId ?? "").trim();
  if (folderId && !(await fileExists(driveApi, folderId))) folderId = "";

  if (!folderId) {
    try {
      const created = await driveApi.files.create({
        supportsAllDrives: true,
        fields: "id",
        requestBody: {
          name: branchFolderName(branchId, nama),
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentFolderId],
        },
      });
      if (!created.data.id) throw new Error("Drive tidak mengembalikan ID folder");
      folderId = created.data.id;
      orphans.push(folderId);
    } catch (error) {
      // Drive refusing the folder (no shared-drive access, revoked permission, quota) must be
      // PROVISION_FAILED, not an opaque 500 API-CONTRACT §3 promises exactly this code.
      if (isDomainError(error)) throw error;
      throw new DomainError(
        "PROVISION_FAILED",
        `Gagal membuat folder Drive untuk ${branchId}.`,
        { data: { orphans, cause: error instanceof Error ? error.message : String(error) } },
      );
    }
  }
  await report({ folderId, spreadsheetId: "" });

  let spreadsheetId = "";
  let reusedSpreadsheet = false;
  let verified = false;

  const previous = (options.existingSpreadsheetId ?? "").trim();
  if (previous && (await fileExists(driveApi, previous))) {
    try {
      await verify(previous);
      spreadsheetId = previous;
      reusedSpreadsheet = true;
      verified = true;
    } catch (error) {
      // The old copy is unusable (template drifted, or an interrupted write). A fresh copy is the
      // only way forward; the row keeps pointing at whichever copy passes verification.
      console.error(
        `[myshift] salinan lama ${previous} untuk ${branchId} tidak lolos verifikasi header, dibuat salinan baru:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (!spreadsheetId) {
    try {
      // Copy goes through the Apps Script bridge (see drive-bridge.ts): the service account has
      // zero Drive storage, so a direct `files.copy` is refused with 403 for it. The bridge is
      // idempotent by name, which is what makes retrying a half-finished attempt safe.
      const copiedId = await copyTemplate({
        templateSpreadsheetId,
        folderId,
        name: `MYSHIFT ${branchId}`,
      });
      spreadsheetId = copiedId;
      orphans.push(spreadsheetId);
    } catch (error) {
      // Only Drive/bridge writes are wrapped as PROVISION_FAILED; a setup error already says what
      // to fix (and a missing bridge config surfaces as SHEETS_SETUP_REQUIRED from the client).
      if (isDomainError(error)) throw error;
      throw new DomainError(
        "PROVISION_FAILED",
        `Gagal menyiapkan spreadsheet untuk ${branchId}.`,
        { data: { orphans } },
      );
    }
    // Record the copy immediately before verification, which is the next thing that can fail.
    await report({ folderId, spreadsheetId });
  } else {
    await report({ folderId, spreadsheetId });
  }

  // Verification gate (Step 3.2 #6): the copy must match SHEETS-SCHEMA §2 before the caller is
  // allowed to set `Provision_Status=ready`. A reused copy was already verified above.
  if (!verified) {
    try {
      await verify(spreadsheetId);
    } catch (error) {
      // Verification failures are SHEETS_SETUP_REQUIRED (fix the template). Attach the Drive IDs
      // created along the way so a failed attempt leaves visible garbage rather than a mystery.
      if (isDomainError(error) && orphans.length > 0) {
        throw new DomainError(error.code, error.message, {
          status: error.status,
          data: { ...error.data, orphans },
        });
      }
      throw error;
    }
  }

  return { spreadsheetId, folderId, reusedSpreadsheet };
}


// Creates any missing sheet and writes the canonical header row from `BRANCH_HEADERS`.
//
// TEMPLATE SETUP ONLY (scripts/import-branch-template.ts). Branch copies are *verified* against
// these headers by `assertBranchSpreadsheetSchema()`, never rewritten: silently fixing a copied
// spreadsheet would hide a drifted template, which is how data ends up in the wrong column
// (PLAN/Db refactor-plan.md Step 2 "kalau ada selisih, laporkan, jangan diperbaiki diam-diam").
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

  // Write canonical headers (idempotent overwrites with correct values)
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
