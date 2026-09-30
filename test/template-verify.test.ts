import test from "node:test";
import assert from "node:assert/strict";
import {
  assertBranchSpreadsheetSchema,
  blockingDiffs,
  describeDiff,
  diffBranchSheetHeaders,
  readSpreadsheetHeaders,
  type SheetsApi,
  type SpreadsheetHeaders,
} from "@/lib/google/template-verify";
import { BRANCH_HEADERS, BRANCH_SHEET_NAMES, headerRange } from "@/lib/google/sheet-schema";
import { isDomainError } from "@/lib/error-codes";

// PLAN/Db refactor-plan.md Step 2: the template/copy is compared against SHEETS-SCHEMA §2 and
// differences are reported, never silently repaired. The previous flow overwrote headers on every
// copy, so a drifted template produced branches with data in the wrong columns and no warning.

function wellFormed(): SpreadsheetHeaders {
  return {
    presentSheets: [...BRANCH_SHEET_NAMES],
    headers: Object.fromEntries(BRANCH_SHEET_NAMES.map((name) => [name, [...BRANCH_HEADERS[name]]])),
  };
}

/** Minimal stand-in for the two Sheets calls readSpreadsheetHeaders() makes. */
function fakeSheets(headers: SpreadsheetHeaders): SheetsApi {
  return {
    spreadsheets: {
      get: async () => ({ data: { sheets: headers.presentSheets.map((title) => ({ properties: { title } })) } }),
      values: {
        batchGet: async ({ ranges }: { ranges?: string[] }) => ({
          data: {
            valueRanges: (ranges ?? []).map((range) => {
              const title = range.split("!")[0];
              return { range, values: [headers.headers[title] ?? []] };
            }),
          },
        }),
      },
    },
  } as unknown as SheetsApi;
}

test("a spreadsheet that matches the schema reports no differences", () => {
  assert.deepEqual(diffBranchSheetHeaders(wellFormed()), []);
});

test("a missing sheet is reported as missing, with the headers it should have", () => {
  const input = wellFormed();
  input.presentSheets = input.presentSheets.filter((name) => name !== "Handover_Log");
  delete input.headers.Handover_Log;

  const diffs = diffBranchSheetHeaders(input);
  assert.equal(diffs.length, 1);
  assert.equal(diffs[0].kind, "missing-sheet");
  assert.equal(diffs[0].sheet, "Handover_Log");
  assert.deepEqual(diffs[0].expected, [...BRANCH_HEADERS.Handover_Log]);
  assert.deepEqual(diffs[0].actual, []);
  assert.match(describeDiff(diffs[0]), /Handover_Log/);
});

test("a reordered or renamed column is reported with both header rows", () => {
  const input = wellFormed();
  input.headers.Schedules = [...BRANCH_HEADERS.Schedules].reverse();

  const diffs = diffBranchSheetHeaders(input);
  assert.equal(diffs.length, 1);
  assert.equal(diffs[0].kind, "header-mismatch");
  assert.deepEqual(diffs[0].expected, [...BRANCH_HEADERS.Schedules]);
  assert.equal(diffs[0].actual[0], "Updated_At");
  assert.match(describeDiff(diffs[0]), /Updated_At/);
});

test("header comparison tolerates stray whitespace from Sheets but not a real rename", () => {
  const input = wellFormed();
  input.headers.Shifts = [" Shift_ID ", "Nama", "Jam_Mulai", "Jam_Selesai", "Aktif", "Created_At", "Updated_At"];
  assert.deepEqual(diffBranchSheetHeaders(input), []);

  input.headers.Shifts = ["Shift_ID", "Nama", "Jam_Mulai", "Jam_Selesai ", "Aktif", "Created_At", "Updated_At"];
  assert.deepEqual(diffBranchSheetHeaders(input), []);
});

test("an extra sheet is a warning, not a blocker", () => {
  const input = wellFormed();
  input.presentSheets = [...input.presentSheets, "Catatan_Admin"];

  const diffs = diffBranchSheetHeaders(input);
  assert.equal(diffs.length, 1);
  assert.equal(diffs[0].kind, "extra-sheet");
  assert.equal(diffs[0].sheet, "Catatan_Admin");
  assert.deepEqual(blockingDiffs(diffs), [], "an extra helper tab must not block provisioning");
});

test("readSpreadsheetHeaders reads only the expected tabs, in one batch", async () => {
  const input = wellFormed();
  input.presentSheets = [...input.presentSheets, "Catatan_Admin"];
  let batchRanges: string[] = [];

  const api = fakeSheets(input);
  const original = api.spreadsheets.values.batchGet;
  api.spreadsheets.values.batchGet = (async (params: { ranges?: string[] }) => {
    batchRanges = params.ranges ?? [];
    return original(params as never);
  }) as typeof original;

  const read = await readSpreadsheetHeaders("sheet-1", api);
  assert.deepEqual(batchRanges, BRANCH_SHEET_NAMES.map((name) => headerRange(name, BRANCH_HEADERS[name].length)));
  assert.deepEqual(read.headers.Schedules, [...BRANCH_HEADERS.Schedules]);
});

test("assertBranchSpreadsheetSchema accepts a conforming copy", async () => {
  await assertBranchSpreadsheetSchema("sheet-1", fakeSheets(wellFormed()));
});

test("assertBranchSpreadsheetSchema fails with SHEETS_SETUP_REQUIRED and names the offending sheet", async () => {
  const input = wellFormed();
  delete input.headers.Checklist_Log;
  input.headers.Checklist_Log = ["Log_ID", "Schedule_ID", "Point_ID"];

  await assert.rejects(
    () => assertBranchSpreadsheetSchema("sheet-1", fakeSheets(input)),
    (error: unknown) => {
      assert.ok(isDomainError(error), "must be a DomainError so routes map it to a 503");
      assert.equal(error.code, "SHEETS_SETUP_REQUIRED");
      assert.equal(error.status, 503);
      assert.match(error.message, /Checklist_Log/);
      assert.deepEqual((error.data as { mismatches: unknown[] }).mismatches.length, 1);
      return true;
    },
  );
});
