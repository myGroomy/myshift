/**
 * Step 2 of PLAN/Db refactor-plan.md — compares the branch spreadsheet headers against
 * PLAN/SHEETS-SCHEMA.md §2 (via lib/google/sheet-schema.ts) and reports differences.
 *
 * Used twice:
 *   1. now, by hand against the template;
 *   2. as the validation provisioning runs on every copy before setting `Provision_Status=ready`
 *      (same code path: lib/google/template-verify.ts).
 *
 * Nothing is repaired by this script — a drifted template is reported so a human decides.
 *
 *   pnpm verify:template                       # checks TEMPLATES.Template_Spreadsheet_ID
 *   pnpm verify:template -- --spreadsheet=<id> # checks any spreadsheet (e.g. a branch copy)
 *
 * Exit code 1 when a required sheet or header differs (extra sheets are warnings only).
 */
import { config } from "dotenv";
import { drive } from "@/lib/google/client";
import { getTemplateConfig } from "@/lib/google/registry";
import { maskSpreadsheetId } from "@/lib/google/sheet-schema";
import { blockingDiffs, describeDiffs, verifyBranchSpreadsheet } from "@/lib/google/template-verify";

config({ path: ".env.local" });

const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";

function arg(name: string): string | undefined {
  const match = process.argv.slice(2).find((value) => value.startsWith(`--${name}=`));
  return match?.slice(name.length + 3)?.trim();
}

async function main() {
  const explicit = arg("spreadsheet");
  let spreadsheetId = explicit ?? "";
  let label = "argumen --spreadsheet";

  if (!spreadsheetId) {
    const config_ = await getTemplateConfig();
    spreadsheetId = config_.templateSpreadsheetId;
    label = "TEMPLATES.Template_Spreadsheet_ID";
  }

  if (!spreadsheetId) {
    throw new Error(`${label} kosong — isi sheet TEMPLATES dulu (SHEETS-SCHEMA.md §1).`);
  }

  console.log(`Memeriksa ${label} = ${maskSpreadsheetId(spreadsheetId)}\n`);

  // Check the file type before reading headers: the Sheets API answers an Office file with
  // "The document must not be an Office file", which says nothing about what to do next.
  const meta = await drive.files.get({
    fileId: spreadsheetId,
    fields: "id,name,mimeType",
    supportsAllDrives: true,
  });
  if (meta.data.mimeType !== GOOGLE_SHEET_MIME) {
    console.log(
      `FAIL  "${meta.data.name}" bukan Google Spreadsheet (mimeType=${meta.data.mimeType}).\n` +
        "      Template harus Google-native Sheet: `pnpm template:branch` lalu `pnpm template:import`,\n" +
        "      kemudian tulis ID hasil import ke TEMPLATES.Template_Spreadsheet_ID (SHEETS-SCHEMA.md §2).",
    );
    process.exitCode = 1;
    return;
  }

  const diffs = await verifyBranchSpreadsheet(spreadsheetId);
  const blocking = blockingDiffs(diffs);

  if (diffs.length === 0) {
    console.log("OK — nama sheet dan urutan header 9 sheet sesuai SHEETS-SCHEMA.md §2.");
    return;
  }

  for (const diff of diffs) {
    console.log(`  ${diff.kind === "extra-sheet" ? "WARN" : "FAIL"}  ${diff.sheet}: ${diff.kind}`);
  }
  console.log(`\n${blocking.length === 0 ? "OK (dengan peringatan)" : `TIDAK SESUAI — ${describeDiffs(blocking)}`}`);

  if (blocking.length > 0) {
    console.log(
      "\nTemplate diperbaiki lewat kode (bukan diedit manual di Drive): " +
        "`pnpm template:branch` lalu `pnpm template:import` (SHEETS-SCHEMA.md §2).",
    );
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
