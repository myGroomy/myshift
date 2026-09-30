/**
 * One-time Registry data migration for the branch-template refactor.
 *
 * Widens `Daftar_Cabang` to the 6-column layout in lib/google/sheet-schema.ts, aligns the
 * `TEMPLATES` headers without discarding its existing value, and de-duplicates the second
 * `EMP-001` row (D4). Idempotent: every step is derived from current sheet state, so re-running
 * after a partial failure converges rather than double-applying.
 *
 *   pnpm exec tsx scripts/migrate-registry.ts --dry-run
 *   pnpm exec tsx scripts/migrate-registry.ts --apply
 *
 * Branch *provisioning* (creating the Drive folder + copying the template) is NOT done here —
 * it needs Drive writes, which the service account has no quota for. `CBG001` is therefore left
 * at `Provision_Status=pending`, which is the truthful state for a branch with no spreadsheet yet.
 */
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { drive } from "@/lib/google/client";
import { readRows, replaceRow } from "@/lib/google/sheets-data";
import {
  REGISTRY_SHEETS,
  REGISTRY_HEADERS,
  EMPLOYEE_ROW_WIDTH,
  BRANCH_ROW_WIDTH,
  headerValues,
  padRow,
  registrySheetRange,
} from "@/lib/google/sheet-schema";

const PARENT_FOLDER_ID = "1M-QLrh_0YFVVDxVx8Zoljbw2ntVpLGXD";
const TARGET_BRANCH_ID = "CBG001";

/** Fingerprint a secret so it can be compared without ever printing it. */
const fingerprint = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 12);

function sheetId() {
  return process.env.REGISTRY_SPREADSHEET_ID!;
}

/** Header row of a sheet, read raw (readRows() drops row 1 by design). */
async function readRawHeader(registryId: string, sheet: string): Promise<string[]> {
  const { sheets } = await import("@/lib/google/client");
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: registryId, range: `${sheet}!1:1` });
  return (res.data.values?.[0] ?? []).map(String);
}

async function main() {
  config({ path: ".env.local" });
  const apply = process.argv.includes("--apply");
  const registryId = sheetId();
  const changes: string[] = [];

  // --- 1. Daftar_Cabang: widen header from 4 to 6 columns ---------------------------
  const branchHeaders = headerValues(REGISTRY_SHEETS.branches);
  const liveBranchHeader = await readRawHeader(registryId, REGISTRY_SHEETS.branches);
  if (liveBranchHeader.join("|") !== branchHeaders.join("|")) {
    changes.push(
      `Daftar_Cabang header: ${JSON.stringify(liveBranchHeader)} -> ${JSON.stringify(branchHeaders)}`,
    );
    if (apply) await replaceRow(registryId, REGISTRY_SHEETS.branches, 1, branchHeaders);
  }

  // --- 2. CBG001 data row: insert the two auto columns before Aktif -----------------
  const branchRows = await readRows(registryId, registrySheetRange(REGISTRY_SHEETS.branches));
  const branchRow = branchRows.find((row) => (row.values[0] ?? "").trim() === TARGET_BRANCH_ID);
  if (!branchRow) throw new Error(`Row ${TARGET_BRANCH_ID} not found in Daftar_Cabang`);

  // The column layout is determined by the header, never by probing values. Probing cannot
  // distinguish a legacy 4-wide row from a migrated one, because an unwritten Folder_Drive_ID
  // reads as "" rather than null a `??` fallback on that would silently reset `Aktif`.
  const legacyLayout = liveBranchHeader.length < BRANCH_ROW_WIDTH;
  const spreadsheetId = (branchRow.values[2] ?? "").trim();
  const folderId = legacyLayout ? "" : (branchRow.values[3] ?? "").trim();
  const aktif = (
    legacyLayout ? branchRow.values[3] : branchRow.values[5]
  )?.trim().toUpperCase() === "TRUE";
  const newBranchRow = padRow(
    [
      TARGET_BRANCH_ID,
      (branchRow.values[1] ?? "").trim(),
      spreadsheetId,
      // Folder is only reused if a previous run already created one; otherwise provisioning
      // fills it in and the row stays pending.
      /^[A-Za-z0-9_-]{20,}$/.test(folderId) ? folderId : "",
      spreadsheetId ? "ready" : "pending",
      aktif ? "TRUE" : "FALSE",
    ],
    BRANCH_ROW_WIDTH,
  );
  if (branchRow.values.join("|") !== newBranchRow.join("|")) {
    changes.push(
      `Daftar_Cabang ${TARGET_BRANCH_ID} (r${branchRow.rowNumber}): ${JSON.stringify(branchRow.values)} -> ${JSON.stringify(newBranchRow)}`,
    );
    if (apply) await replaceRow(registryId, REGISTRY_SHEETS.branches, branchRow.rowNumber, newBranchRow);
  }

  // --- 3. TEMPLATES: align headers, keep the existing value in place ---------------
  const liveTemplateHeader = await readRawHeader(registryId, REGISTRY_SHEETS.templates);
  const templateHeaders = headerValues(REGISTRY_SHEETS.templates);
  const templateRows = await readRows(registryId, registrySheetRange(REGISTRY_SHEETS.templates));
  const existingTemplateId = (templateRows[0]?.values[0] ?? "").trim();

  if (liveTemplateHeader.join("|") !== templateHeaders.join("|")) {
    changes.push(
      `TEMPLATES header: ${JSON.stringify(liveTemplateHeader)} -> ${JSON.stringify(templateHeaders)}`,
    );
    if (apply) await replaceRow(registryId, REGISTRY_SHEETS.templates, 1, templateHeaders);
  }

  const newTemplateRow = padRow([existingTemplateId, PARENT_FOLDER_ID], 2);
  if ((templateRows[0]?.values ?? []).join("|") !== newTemplateRow.join("|")) {
    changes.push(`TEMPLATES r2: ${JSON.stringify(templateRows[0]?.values ?? [])} -> ${JSON.stringify(newTemplateRow)}`);
    if (apply) await replaceRow(registryId, REGISTRY_SHEETS.templates, 2, newTemplateRow);
  }

  // The template must be a Google-native Sheet. Pointing at the generator's .xlsx would make
  // every branch a binary file the Sheets API cannot read, so surface it loudly here.
  if (existingTemplateId) {
    const meta = await drive.files.get({
      fileId: existingTemplateId,
      fields: "id,name,mimeType",
      supportsAllDrives: true,
    });
    const mime = meta.data.mimeType ?? "(unknown)";
    const ok = mime === "application/vnd.google-apps.spreadsheet";
    changes.push(
      `TEMPLATES.Template_Spreadsheet_ID = ${existingTemplateId} (${meta.data.name}) mimeType=${mime}` +
        (ok ? "" : "  <-- NOT a Google Sheet; run `pnpm template:import` after storage is fixed"),
    );
  }

  // --- 4. Employees: de-duplicate the second EMP-001 row (D4) ----------------------
  const employeeRows = await readRows(registryId, registrySheetRange(REGISTRY_SHEETS.employees));
  const duplicates = employeeRows.filter((row) => (row.values[0] ?? "").trim() === "EMP-001");
  if (duplicates.length > 1) {
    const target = duplicates[1];
    const values = [...target.values];
    const pinBefore = fingerprint((values[2] ?? "").trim());
    const updated = padRow(
      [
        "EMP-002",
        "user",
        values[2] ?? "", // PIN hash: carried over untouched, never rewritten
        "User Nama",
        ...values.slice(4),
      ],
      EMPLOYEE_ROW_WIDTH,
    );
    changes.push(
      `Employees r${target.rowNumber}: ${JSON.stringify(values.slice(0, 4).map((v, i) => (i === 2 ? "<pin-hash>" : v)))} -> ` +
        `${JSON.stringify(updated.slice(0, 4).map((v, i) => (i === 2 ? "<pin-hash>" : v)))} (rest unchanged)`,
    );
    if (apply) await replaceRow(registryId, REGISTRY_SHEETS.employees, target.rowNumber, updated);

    // Verify the hash survived the round-trip without revealing it.
    if (apply) {
      const reread = await readRows(registryId, registrySheetRange(REGISTRY_SHEETS.employees));
      const after = reread.find((row) => row.rowNumber === target.rowNumber);
      const pinAfter = fingerprint((after?.values[2] ?? "").trim());
      if (pinAfter !== pinBefore) {
        throw new Error(`PIN hash changed on row ${target.rowNumber} (${pinBefore} -> ${pinAfter})`);
      }
      changes.push(`Employees r${target.rowNumber}: PIN hash verified unchanged (${pinBefore})`);
    }
  }

  // --- 5. Settings_Global: report only, never rewrite ------------------------------
  const settingsHeader = await readRawHeader(registryId, REGISTRY_SHEETS.settings);
  if (settingsHeader.join("|") !== REGISTRY_HEADERS.Settings_Global.join("|")) {
    changes.push(
      `Settings_Global header differs (${JSON.stringify(settingsHeader)} vs ${JSON.stringify(REGISTRY_HEADERS.Settings_Global)}) reported only, not rewritten (positional reads make it harmless).`,
    );
  }

  console.log(`\n${apply ? "APPLIED" : "DRY RUN"} ${changes.length} change(s):\n`);
  for (const change of changes) console.log(`  - ${change}`);
  if (!apply) console.log(`\nRe-run with --apply to write these changes.`);
  if (apply) console.log(`\nProvisioning is still outstanding: run \`pnpm template:import\`, then re-run this script.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
