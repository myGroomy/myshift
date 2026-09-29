/**
 * End-to-end check for the Apps Script Drive bridge (gas/README.md) — the counterpart of
 * `pnpm spike:drive`, which exercises the *service account* path instead.
 *
 * Runs the exact sequence provisioning uses, inside the configured MYSHIFT parent folder, then
 * deletes everything it created:
 *
 *   1. service account creates a temp branch-like folder (folders cost no storage quota)
 *   2. bridge `copyFile` of the template into it
 *   3. bridge `copyFile` again with the same name — must return the *same* fileId (idempotency,
 *      which is what makes a retry after a timeout safe)
 *   4. bridge `uploadFile` of a small photo
 *   5. read both back through the service account (proving the app can keep writing their Sheets)
 *   6. delete everything
 *
 *   pnpm check:bridge
 *
 * Exit code 0 = provisioning would work right now. 1 = something failed (message printed verbatim).
 */
import { config } from "dotenv";
import { drive } from "@/lib/google/client";
import { assertBridgeConfigured, bridgeCopyFile, bridgeUploadFile } from "@/lib/google/drive-bridge";
import { getTemplateConfig } from "@/lib/google/registry";
import { maskSpreadsheetId } from "@/lib/google/sheet-schema";

config({ path: ".env.local" });

const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const FOLDER_MIME = "application/vnd.google-apps.folder";

type Step = { name: string; ok: boolean; detail: string };
const results: Step[] = [];

function describe(error: unknown): string {
  const candidate = error as { message?: string; code?: number | string; errors?: Array<{ reason?: string }> };
  const reason = candidate?.errors?.[0]?.reason;
  return [candidate?.code, reason, candidate?.message].filter(Boolean).join(" | ") || String(error);
}

async function step(name: string, run: () => Promise<string>): Promise<string> {
  try {
    const detail = await run();
    results.push({ name, ok: true, detail });
    console.log(`  OK    ${name}: ${detail}`);
    return detail.split(" ")[0] ?? "";
  } catch (error) {
    const detail = describe(error);
    results.push({ name, ok: false, detail });
    console.log(`  FAIL  ${name}: ${detail}`);
    // Bridge errors carry the actionable payload (bridge code, a body sample, the page text of an
    // HTML error page). Without this, "PROVISION_FAILED" alone is a dead end.
    const data = (error as { data?: unknown })?.data;
    if (data) console.log(`        detail: ${JSON.stringify(data).slice(0, 300)}`);
    throw error instanceof Error ? error : new Error(detail);
  }
}

async function main() {
  const config_ = assertBridgeConfigured();
  const { templateSpreadsheetId, parentFolderId } = await getTemplateConfig();

  console.log(`Bridge URL  : ${config_.url}`);
  console.log(`Template    : ${maskSpreadsheetId(templateSpreadsheetId)}`);
  console.log(`Folder induk: ${parentFolderId || "(kosong)"}`);
  if (!parentFolderId) throw new Error("TEMPLATES.Parent_Folder_ID kosong — isi sheet TEMPLATES dulu.");
  if (!templateSpreadsheetId) throw new Error("TEMPLATES.Template_Spreadsheet_ID kosong.");

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const folderName = `MYSHIFT-BRIDGE-TEST ${stamp}`.slice(0, 60);
  const sheetName = folderName;
  const photoName = `MYSHIFT-BRIDGE-TEST-${stamp}.txt`;
  const orphans: string[] = [];

  try {
    console.log("\nBridge check:");
    await step("service account creates the branch folder", async () => {
      const created = await drive.files.create({
        supportsAllDrives: true,
        fields: "id",
        requestBody: { name: folderName, mimeType: FOLDER_MIME, parents: [parentFolderId] },
      });
      if (!created.data.id) throw new Error("Drive tidak mengembalikan ID folder");
      orphans.push(created.data.id);
      return `${created.data.id} (folder)`;
    });

    const firstCopy = await step("bridge copies the template", async () => {
      const result = await bridgeCopyFile({
        templateSpreadsheetId,
        folderId: orphans[0],
        name: sheetName,
      });
      orphans.push(result.fileId);
      return `${result.fileId} (reused=${result.reused})`;
    });
    const copyId = firstCopy.split(" ")[0];

    await step("bridge copy is idempotent by name (same fileId)", async () => {
      const again = await bridgeCopyFile({ templateSpreadsheetId, folderId: orphans[0], name: sheetName });
      if (again.fileId !== copyId) throw new Error(`fileId beda: ${again.fileId} vs ${copyId}`);
      return `${again.fileId} (reused=${again.reused})`;
    });

    const photoId = await step("bridge uploads a small photo", async () => {
      const result = await bridgeUploadFile({
        folderId: orphans[0],
        name: photoName,
        mimeType: "text/plain",
        buffer: Buffer.from("myshift bridge check\n"),
      });
      orphans.push(result.fileId);
      return `${result.fileId} (reused=${result.reused})`;
    });

    await step("service account can read both results", async () => {
      const [sheet, photo] = await Promise.all([
        drive.files.get({ fileId: copyId, fields: "id,name,mimeType", supportsAllDrives: true }),
        drive.files.get({ fileId: photoId.split(" ")[0], fields: "id,name,mimeType,size", supportsAllDrives: true }),
      ]);
      if (sheet.data.mimeType !== GOOGLE_SHEET_MIME) throw new Error(`copy bukan Google Sheet: ${sheet.data.mimeType}`);
      if (photo.data.name !== photoName) throw new Error(`nama foto berubah: ${photo.data.name}`);
      return `sheet="${sheet.data.name}" foto="${photo.data.name}" size=${photo.data.size ?? "?"}`;
    });
  } finally {
    console.log("\nCleanup:");
    for (const fileId of [...orphans].reverse()) {
      try {
        await drive.files.delete({ fileId, supportsAllDrives: true });
        console.log(`  OK    deleted ${fileId}`);
      } catch (error) {
        console.log(`  FAIL  delete ${fileId}: ${describe(error)}`);
      }
    }
  }

  const failed = results.filter((entry) => !entry.ok);
  console.log(`\n${failed.length === 0 ? "BRIDGE PASSED" : `BRIDGE FAILED (${failed.length} step)`}`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

