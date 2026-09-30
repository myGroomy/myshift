/**
 * Step 0b spike does the service account actually have Drive *write* storage?
 *
 * Background: `spreadsheets.create` failed with a quota error, so branch provisioning moved to
 * "copy the template". That only helps if the service account can still create folders, copy
 * files, and upload bytes. This script exercises exactly those three calls once, inside the
 * configured `Parent_Folder_ID`, and deletes everything it creates.
 *
 * It never writes to the Registry (no Sheets writes) only reads TEMPLATES to find out where to
 * work. Every artifact is named `MYSHIFT-SPIKE-<timestamp>` so a leftover is obvious.
 *
 *   pnpm exec tsx scripts/spike-drive-writes.ts            # run + clean up
 *   pnpm exec tsx scripts/spike-drive-writes.ts --keep     # leave artifacts for inspection
 *
 * Exit code 0 = all three Drive writes work. 1 = at least one failed (message printed verbatim —
 * `storageQuotaExceeded` means stop and talk to the user, per PLAN/Db refactor-plan.md Step 0b).
 */
import { Readable } from "node:stream";
import { config } from "dotenv";
import { drive } from "@/lib/google/client";
import { getTemplateConfig } from "@/lib/google/registry";
import { maskSpreadsheetId } from "@/lib/google/sheet-schema";

config({ path: ".env.local" });

const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const FOLDER_MIME = "application/vnd.google-apps.folder";

const keep = process.argv.includes("--keep");

type StepResult = { name: string; ok: boolean; detail: string };

const results: StepResult[] = [];

function describe(error: unknown): string {
  const candidate = error as { message?: string; code?: number | string; errors?: Array<{ reason?: string }> };
  const reason = candidate?.errors?.[0]?.reason;
  return [candidate?.code, reason, candidate?.message].filter(Boolean).join(" | ") || String(error);
}

async function step(name: string, run: () => Promise<string>): Promise<string | null> {
  try {
    const detail = await run();
    results.push({ name, ok: true, detail });
    console.log(`  OK    ${name}: ${detail}`);
    return detail.split(" ")[0] ?? null;
  } catch (error) {
    results.push({ name, ok: false, detail: describe(error) });
    console.log(`  FAIL  ${name}: ${describe(error)}`);
    return null;
  }
}

async function reportContext(templateId: string, parentFolderId: string) {
  const parent = await drive.files.get({
    fileId: parentFolderId,
    fields: "id,name,mimeType,driveId,capabilities(canAddChildren)",
    supportsAllDrives: true,
  });
  console.log(
    `\nFolder induk: "${parent.data.name}" (driveId=${parent.data.driveId ?? "My Drive (bukan Shared Drive)"}, ` +
      `canAddChildren=${parent.data.capabilities?.canAddChildren})`,
  );

  const quota = await drive.about.get({ fields: "storageQuota" });
  const { limit, usage, usageInDrive } = quota.data.storageQuota ?? {};
  console.log(`Storage service account: limit=${limit ?? "(unlimited)"} usage=${usage ?? "?"} inDrive=${usageInDrive ?? "?"}`);

  // Whatever permissions the parent folder has are inherited by every copy, which is what lets a
  // human admin open and edit a branch spreadsheet (PRD requirement).
  const permissions = await drive.permissions.list({
    fileId: parentFolderId,
    fields: "permissions(type,role,emailAddress)",
    supportsAllDrives: true,
  });
  const users = (permissions.data.permissions ?? []).filter((entry) => entry.type === "user");
  console.log(
    `Permission folder induk: ${users.map((entry) => `${entry.emailAddress}=${entry.role}`).join(", ") || "(tidak ada user manusia)"}`,
  );

  if (templateId) {
    const template = await drive.files.get({ fileId: templateId, fields: "id,name,mimeType", supportsAllDrives: true });
    const native = template.data.mimeType === GOOGLE_SHEET_MIME;
    console.log(
      `Template: "${template.data.name}" mimeType=${template.data.mimeType}` +
        (native ? "" : "  <-- BUKAN Google Sheet; provisioning akan menolak dengan SHEETS_SETUP_REQUIRED"),
    );
  }
}
async function main() {
  const { templateSpreadsheetId, parentFolderId } = await getTemplateConfig();
  console.log("Registry TEMPLATES:");
  console.log(`  Template_Spreadsheet_ID = ${maskSpreadsheetId(templateSpreadsheetId)}`);
  console.log(`  Parent_Folder_ID        = ${parentFolderId || "(kosong)"}`);
  if (!parentFolderId) throw new Error("Parent_Folder_ID kosong isi sheet TEMPLATES dulu (SHEETS-SCHEMA §1).");

  await reportContext(templateSpreadsheetId, parentFolderId);

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  let subFolderId: string | null = null;
  let uploadId: string | null = null;
  let copyId: string | null = null;

  console.log("\nSpike Drive writes:");

  subFolderId = await step("create sub-folder in parent", async () => {
    const created = await drive.files.create({
      supportsAllDrives: true,
      fields: "id",
      requestBody: {
        name: `MYSHIFT-SPIKE-${stamp}`,
        mimeType: FOLDER_MIME,
        parents: [parentFolderId],
      },
    });
    if (!created.data.id) throw new Error("Drive tidak mengembalikan ID folder");
    return `${created.data.id} (folder)`;
  });

  if (subFolderId) {
    uploadId = await step("upload small file into sub-folder", async () => {
      const created = await drive.files.create({
        supportsAllDrives: true,
        fields: "id",
        requestBody: { name: `MYSHIFT-SPIKE-${stamp}.txt`, parents: [subFolderId!] },
        media: { mimeType: "text/plain", body: Readable.from(Buffer.from("myshift spike\n")) },
      });
      if (!created.data.id) throw new Error("Drive tidak mengembalikan ID file");
      return `${created.data.id} (txt)`;
    });
  } else {
    results.push({ name: "upload small file into sub-folder", ok: false, detail: "skipped: no sub-folder" });
    console.log("  SKIP  upload small file: sub-folder tidak jadi dibuat");
  }

  if (templateSpreadsheetId) {
    copyId = await step("files.copy of Template_Spreadsheet_ID", async () => {
      const copied = await drive.files.copy({
        fileId: templateSpreadsheetId,
        supportsAllDrives: true,
        fields: "id,name,mimeType",
        requestBody: { name: `MYSHIFT-SPIKE-${stamp}`, parents: [subFolderId ?? parentFolderId] },
      });
      if (!copied.data.id) throw new Error("Drive tidak mengembalikan ID hasil copy");
      const native = copied.data.mimeType === GOOGLE_SHEET_MIME;
      return (
        `${copied.data.id} (mimeType=${copied.data.mimeType}` +
        `${native ? "" : " BUKAN Google Sheet, hasil copy tidak bisa dibaca Sheets API"})`
      );
    });
  }

  // Decisive sub-test: Google-native formats (Sheets/Docs/Slides) do not consume Drive storage
  // quota, so the SA may still be able to create and copy them even with limit=0. If this passes,
  // the copy-template path survives; only binary uploads (checklist photos) are blocked.
  const target = subFolderId ?? parentFolderId;
  const sheetId = await step("create native Google Sheet (no media)", async () => {
    const created = await drive.files.create({
      supportsAllDrives: true,
      fields: "id,mimeType",
      requestBody: { name: `MYSHIFT-SPIKE-SHEET-${stamp}`, mimeType: GOOGLE_SHEET_MIME, parents: [target] },
    });
    if (!created.data.id) throw new Error("Drive tidak mengembalikan ID spreadsheet");
    return `${created.data.id} (mimeType=${created.data.mimeType})`;
  });

  let nativeCopyId: string | null = null;
  if (sheetId) {
    nativeCopyId = await step("files.copy of a native Google Sheet", async () => {
      const copied = await drive.files.copy({
        fileId: sheetId,
        supportsAllDrives: true,
        fields: "id,mimeType",
        requestBody: { name: `MYSHIFT-SPIKE-SHEET-COPY-${stamp}`, parents: [target] },
      });
      if (!copied.data.id) throw new Error("Drive tidak mengembalikan ID hasil copy");
      return `${copied.data.id} (mimeType=${copied.data.mimeType})`;
    });
  } else {
    results.push({ name: "files.copy of a native Google Sheet", ok: false, detail: "skipped: no native sheet" });
    console.log("  SKIP  copy native sheet: pembuatan sheet gagal");
  }

  if (!keep) {
    console.log("\nCleanup:");
    for (const [label, fileId] of [
      ["uploaded txt", uploadId],
      ["copied file", copyId],
      ["native sheet copy", nativeCopyId],
      ["native sheet", sheetId],
      ["sub-folder", subFolderId],
    ] as const) {
      if (!fileId) continue;
      await step(`delete ${label}`, async () => {
        await drive.files.delete({ fileId, supportsAllDrives: true });
        return `${fileId} deleted`;
      });
    }
  } else {
    console.log("\n--keep dipakai: artefak dibiarkan (hapus manual setelah diperiksa).");
  }

  const failed = results.filter((entry) => !entry.ok);
  console.log(`\n${failed.length === 0 ? "SPIKE PASSED" : `SPIKE FAILED (${failed.length} step gagal)`}`);
  if (failed.some((entry) => /storageQuotaExceeded/i.test(entry.detail))) {
    console.log("storageQuotaExceeded terdeteksi berhenti dan laporkan ke user (Db refactor-plan Step 0b).");
  }
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

