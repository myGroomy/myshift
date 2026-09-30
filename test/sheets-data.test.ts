import test from "node:test";
import assert from "node:assert/strict";
import { padRow, maskSpreadsheetId, columnLetter, headerRange, headerValues } from "@/lib/google/sheet-schema";

// These tests verify the pure helper functions used by sheets-data.ts.
// Seam: lib/google/sheet-schema.ts column layout, padding, masking.

// ---------------------------------------------------------------------------
// padRow
// ---------------------------------------------------------------------------
test("padRow pads shorter arrays to the target width", () => {
  assert.deepEqual(padRow(["a", "b"], 4), ["a", "b", "", ""]);
});

test("padRow returns the same array when already at width", () => {
  assert.deepEqual(padRow(["a", "b", "c"], 3), ["a", "b", "c"]);
});

test("padRow never truncates Math.max keeps the longer length", () => {
  assert.deepEqual(padRow(["a", "b", "c"], 2), ["a", "b", "c"]);
});

test("padRow handles empty arrays", () => {
  assert.deepEqual(padRow([], 3), ["", "", ""]);
});

test("padRow handles undefined holes in the middle", () => {
  assert.deepEqual(padRow(["a", "", "c"], 3), ["a", "", "c"]);
});

// ---------------------------------------------------------------------------
// maskSpreadsheetId
// ---------------------------------------------------------------------------
test("maskSpreadsheetId masks long IDs", () => {
  const masked = maskSpreadsheetId("1AbCdEfGhIjKlMnOpQrStUvWxYz");
  assert.ok(masked.includes("…"));
  assert.ok(!masked.includes("1AbCdEfGhIjKlMnOpQrStUvWxYz"));
});

test("maskSpreadsheetId returns bullet for short IDs", () => {
  assert.equal(maskSpreadsheetId("abc123"), "••••");
});

test("maskSpreadsheetId returns empty for empty input", () => {
  assert.equal(maskSpreadsheetId(""), "");
});

test("maskSpreadsheetId keeps first 6 and last 4 chars", () => {
  const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz";
  const masked = maskSpreadsheetId(id);
  assert.ok(masked.startsWith("1AbCdE"));
  assert.ok(masked.endsWith("xYz"));
});

// ---------------------------------------------------------------------------
// columnLetter
// ---------------------------------------------------------------------------
test("columnLetter handles single letters", () => {
  assert.equal(columnLetter(1), "A");
  assert.equal(columnLetter(2), "B");
  assert.equal(columnLetter(26), "Z");
});

test("columnLetter handles rollover past Z", () => {
  assert.equal(columnLetter(27), "AA");
  assert.equal(columnLetter(28), "AB");
  assert.equal(columnLetter(52), "AZ");
  assert.equal(columnLetter(53), "BA");
});

test("columnLetter handles large numbers", () => {
  assert.equal(columnLetter(702), "ZZ");
  assert.equal(columnLetter(703), "AAA");
});

// ---------------------------------------------------------------------------
// headerRange
// ---------------------------------------------------------------------------
test("headerRange produces correct A1 notation", () => {
  assert.equal(headerRange("Employees", 14), "Employees!A1:N1");
  assert.equal(headerRange("Daftar_Cabang", 9), "Daftar_Cabang!A1:I1");
});

// ---------------------------------------------------------------------------
// headerValues
// ---------------------------------------------------------------------------
test("headerValues returns registry headers", () => {
  const headers = headerValues("Employees");
  assert.deepEqual(headers, [
    "Employee_ID",
    "Username",
    "Normalized_Username",
    "PIN_Hash",
    "Nama",
    "Role",
    "Cabang_Aktif",
    "Cabang_Terafiliasi",
    "Aktif",
    "Failed_Login_Attempts",
    "Locked_Until",
    "Created_At",
    "Updated_At",
    "Deactivated_At",
  ]);
});

test("headerValues returns branch headers", () => {
  const headers = headerValues("Schedules");
  assert.deepEqual(headers, [
    "Schedule_ID",
    "Employee_ID",
    "Employee_Name_Snapshot",
    "Shift_ID",
    "Shift_Name_Snapshot",
    "Shift_Start_Snapshot",
    "Shift_End_Snapshot",
    "Tanggal",
    "Status",
    "Started_At",
    "Updated_Via",
    "Report_Generated_At",
    "Report_Token",
    "Created_By",
    "Created_At",
    "Updated_At",
  ]);
});
