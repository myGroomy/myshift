// Imports PLAN/templates/MYSHIFT-Template-Cabang.xlsx into Drive as a real Google Sheet and
// registers it as the branch template (PLAN/SHEETS-SCHEMA.md §2).
//
// Why an import and not an upload: a raw `.xlsx` upload stays a binary Excel file, and
// `drive.files.copy` cannot turn it into a Google Sheet — every per-branch `files.copy` would
// hand the app a binary file that the Sheets API cannot read. The conversion has to happen once,
// here, so the template that provisioning copies is a Sheet. The mimeType assertion below is the
// check that catches a silent regression back to a raw `.xlsx`.
//
// Idempotent: re-running reuses the Sheet already in the folder instead of piling up copies.
// `--force` re-imports from the `.xlsx` and leaves the previous import in place for inspection.
//
// Run: pnpm template:import -- [--source=<driveFileId>] [--parent=<folderId>] [--force]
import { Readable } from "node:stream";
import { config } from "dotenv";
import type { drive_v3 } from "googleapis";
import { drive } from "../lib/google/client";
import { writeBranchHeaders } from "../lib/google/provisioning";
import { assertBridgeConfigured, bridgeImportFile } from "../lib/google/drive-bridge";
import { getTemplateConfig } from "../lib/google/registry";

config({ path: ".env.local" });

const SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const TEMPLATE_NAME = "MYSHIFT-Template-Cabang";

type ImportFileParams = drive_v3.Params$Resource$Files$Create & {
  uploadType: "import";
  importAs: string;
};

/** The `.xlsx` in Drive that `pnpm template:branch` output was uploaded to. */
const DEFAULT_SOURCE_ID = "1YZjY_6FkS26tfYZC99XrHwPZ2Gnuihp5";

function arg(name: string): string | undefined {
  const match = process.argv.slice(2).find((value) => value.startsWith(`--${name}=`));
  return match?.slice(name.length + 3);
}

const force = process.argv.includes("--force");
const sourceId = arg("source") ?? DEFAULT_SOURCE_ID;

// Parent folder comes from the TEMPLATES sheet (the single source of truth, SHEETS-SCHEMA §1);
// `--parent=` only overrides it. Requiring the flag used to make this step fail with a manual
// instruction even when the registry was already filled in.
async function resolveParentFolder(): Promise<string> {
  const flag = arg("parent")?.trim();
  if (flag) return flag;
  const { parentFolderId } = await getTemplateConfig();
  if (parentFolderId) return parentFolderId;
  throw new Error(
    "Folder induk belum diisi di sheet TEMPLATES. Isi TEMPLATES.Parent_Folder_ID " +
      "(PLAN/SHEETS-SCHEMA.md §2 langkah 4) atau jalankan dengan --parent=<folderId>."
  );
}

async function findExistingTemplate(parentId: string): Promise<string | null> {
  const listed = await drive.files.list({
    q: `'${parentId}' in parents and name = '${TEMPLATE_NAME}' and trashed = false`,
    fields: "files(id,name,mimeType)",
    corpora: "allDrives",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    pageSize: 20,
  });
  const sheet = (listed.data.files ?? []).find((file) => file.mimeType === SHEET_MIME);
  return sheet?.id ?? null;
}

async function importFromXlsx(sourceId: string, name: string, parentId: string): Promise<string> {
  // Default path: the Apps Script bridge converts the .xlsx, because the service account has zero
  // Drive storage and a `files.create` from it is refused with 403 (PLAN/Db refactor-plan.md
  // Step 0b). `--via=service-account` forces the old path, for an account that *does* have storage —
  // it is never used implicitly.
  if (!process.argv.includes("--via=service-account")) {
    assertBridgeConfigured();
    const imported = await bridgeImportFile({ sourceFileId: sourceId, parentFolderId: parentId, name });
    return imported.fileId;
  }

  const source = await drive.files.get(
    { fileId: sourceId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" },
  );
  const body = Buffer.from(source.data as ArrayBuffer);
  if (body.byteLength === 0) {
    throw new Error(`File sumber ${sourceId} kosong atau tidak bisa dibaca.`);
  }

  // `uploadType: "import"` + `importAs` is what converts the uploaded bytes into a Google Sheet.
  // googleapis' generated Drive v3 types omit both query params, so widen them here rather than
  // casting the whole call to `any` — everything else stays type-checked.
  const params: ImportFileParams = {
    uploadType: "import",
    importAs: SHEET_MIME,
    requestBody: { name, parents: [parentId] },
    // gaxios pipes each multipart part, so the bytes go over as a stream.
    media: { mimeType: XLSX_MIME, body: Readable.from(body) },
    fields: "id,name,mimeType",
    supportsAllDrives: true,
  };
  const created = await drive.files.create(params);
  if (!created.data.id) throw new Error("Drive tidak mengembalikan ID untuk template hasil import.");
  return created.data.id;
}

async function main() {
  const parentId = await resolveParentFolder();

  const reused = force ? null : await findExistingTemplate(parentId);
  const templateId = reused ?? (await importFromXlsx(sourceId, TEMPLATE_NAME, parentId));

  const meta = await drive.files.get({
    fileId: templateId,
    fields: "id,name,mimeType,parents",
    supportsAllDrives: true,
  });
  if (meta.data.mimeType !== SHEET_MIME) {
    throw new Error(
      `Template bukan Google Sheet (mimeType=${meta.data.mimeType}). ` +
        "Provisioning akan gagal saat reads — jalankan ulang tanpa --force."
    );
  }
  if (!meta.data.parents?.includes(parentId)) {
    throw new Error(
      `Template tidak berada di folder induk yang diharapkan. parents=${JSON.stringify(meta.data.parents)}`
    );
  }

  // Same call the app makes on every branch, so the import is verified end to end: missing sheets
  // get created and headers get rewritten to whatever sheet-schema.ts currently pins.
  await writeBranchHeaders(templateId);

  console.log(`${reused ? "Dipakai ulang" : "Di-import"} : ${meta.data.name}`);
  console.log(`  Template_Spreadsheet_ID = ${templateId}`);
  console.log(`  Parent_Folder_ID       = ${parentId}`);
  console.log("\nLangkah berikutnya (PLAN/SHEETS-SCHEMA.md §2):");
  console.log("  1. Bagikan template di atas ke service account sebagai Editor");
  console.log("  2. Tulis kedua ID ke sheet TEMPLATES pada Registry");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
