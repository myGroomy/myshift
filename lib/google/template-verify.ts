// Header verification for a branch spreadsheet (PLAN/Db refactor-plan.md Step 2).
//
// Two callers, one implementation:
//   - `scripts/verify-template.ts` — run by hand against TEMPLATES.Template_Spreadsheet_ID
//   - `provisionBranchDrive()` — run against every freshly copied branch spreadsheet, *before*
//     the Registry row is set to `ready` (Step 3.2 #6)
//
// The point of verifying instead of rewriting is that a drifted template must be reported, not
// silently repaired: the old flow overwrote headers on every copy, so a template missing a column
// produced branches whose data landed in the wrong field and nobody was told.
import type { sheets_v4 } from "googleapis";
import { sheets } from "@/lib/google/client";
import { DomainError } from "@/lib/error-codes";
import { BRANCH_HEADERS, BRANCH_SHEET_NAMES, headerRange } from "@/lib/google/sheet-schema";

export type SheetsApi = Pick<sheets_v4.Sheets, "spreadsheets">;

export type SheetHeaderDiff = {
  sheet: string;
  kind: "missing-sheet" | "header-mismatch" | "extra-sheet";
  expected: string[];
  actual: string[];
};

export type SpreadsheetHeaders = {
  /** Every sheet title present in the spreadsheet, in tab order. */
  presentSheets: string[];
  /** Header row per sheet, when it could be read. */
  headers: Record<string, string[]>;
};

export function normalizeHeader(values: readonly string[] | undefined): string[] {
  return (values ?? []).map((value) => String(value ?? "").trim());
}

// Pure: decides what is wrong, without touching Google. `extra-sheet` is reported but does not
// block (a copy that carries an extra helper tab still has every field the app writes to).
export function diffBranchSheetHeaders(input: SpreadsheetHeaders): SheetHeaderDiff[] {
  const diffs: SheetHeaderDiff[] = [];

  for (const sheet of BRANCH_SHEET_NAMES) {
    const expected = [...BRANCH_HEADERS[sheet]];
    if (!input.presentSheets.includes(sheet)) {
      diffs.push({ sheet, kind: "missing-sheet", expected, actual: [] });
      continue;
    }
    const actual = normalizeHeader(input.headers[sheet]);
    if (actual.join("|") !== expected.join("|")) {
      diffs.push({ sheet, kind: "header-mismatch", expected, actual });
    }
  }

  for (const sheet of input.presentSheets) {
    if (!(sheet in BRANCH_HEADERS)) {
      diffs.push({ sheet, kind: "extra-sheet", expected: [], actual: normalizeHeader(input.headers[sheet]) });
    }
  }

  return diffs;
}

export function blockingDiffs(diffs: SheetHeaderDiff[]): SheetHeaderDiff[] {
  return diffs.filter((diff) => diff.kind !== "extra-sheet");
}

export function describeDiff(diff: SheetHeaderDiff): string {
  if (diff.kind === "missing-sheet") return `sheet "${diff.sheet}" tidak ada (harusnya ${diff.expected.join(", ")})`;
  if (diff.kind === "extra-sheet") return `sheet tambahan "${diff.sheet}" (tidak dipakai aplikasi)`;
  return `header "${diff.sheet}" berbeda: [${diff.actual.join(", ")}] harusnya [${diff.expected.join(", ")}]`;
}

export function describeDiffs(diffs: SheetHeaderDiff[]): string {
  return diffs.map(describeDiff).join("; ");
}

export async function readSpreadsheetHeaders(
  spreadsheetId: string,
  api: SheetsApi = sheets,
): Promise<SpreadsheetHeaders> {
  const meta = await api.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" });
  const presentSheets = (meta.data.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => Boolean(title));

  // Only the expected tabs are read (one batch request), so a stray extra tab costs nothing.
  const readable = BRANCH_SHEET_NAMES.filter((name) => presentSheets.includes(name));
  if (readable.length === 0) return { presentSheets, headers: {} };

  const batch = await api.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: readable.map((name) => headerRange(name, BRANCH_HEADERS[name].length)),
  });

  const headers: Record<string, string[]> = {};
  (batch.data.valueRanges ?? []).forEach((valueRange, index) => {
    // Sheets returns valueRanges in request order; the sheet name is taken from the echoed range
    // anyway so a reordered response cannot attribute a header row to the wrong sheet.
    const echoed = (valueRange.range ?? "").split("!")[0]?.replace(/^'|'$/g, "");
    const title = echoed && BRANCH_SHEET_NAMES.includes(echoed as (typeof BRANCH_SHEET_NAMES)[number])
      ? echoed
      : readable[index];
    headers[title] = normalizeHeader(valueRange.values?.[0]);
  });

  return { presentSheets, headers };
}

export async function verifyBranchSpreadsheet(
  spreadsheetId: string,
  api: SheetsApi = sheets,
): Promise<SheetHeaderDiff[]> {
  return diffBranchSheetHeaders(await readSpreadsheetHeaders(spreadsheetId, api));
}

// Throws SHEETS_SETUP_REQUIRED (503) rather than PROVISION_FAILED: the spreadsheet we just copied
// is fine, the *template* is what needs fixing, and the message has to say so or the admin will
// keep retrying provisioning forever.
export async function assertBranchSpreadsheetSchema(
  spreadsheetId: string,
  api: SheetsApi = sheets,
): Promise<void> {
  const blocking = blockingDiffs(await verifyBranchSpreadsheet(spreadsheetId, api));
  if (blocking.length === 0) return;
  throw new DomainError(
    "SHEETS_SETUP_REQUIRED",
    `Struktur spreadsheet cabang tidak sesuai PLAN/SHEETS-SCHEMA.md §2 — ${describeDiffs(blocking)}. ` +
      "Perbaiki template cabang lalu jalankan ulang provisioning.",
    { data: { mismatches: blocking } },
  );
}
