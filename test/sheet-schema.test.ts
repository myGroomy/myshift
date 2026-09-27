import test from "node:test";
import assert from "node:assert/strict";
import {
  BRANCH_HEADERS,
  BRANCH_SHEET_NAMES,
  EMPLOYEE_ROW_WIDTH,
  REGISTRY_HEADERS,
  branchSheetRange,
  columnLetter,
  headerRange,
  maskSpreadsheetId,
  padRow,
  registrySheetRange,
} from "@/lib/google/sheet-schema";

// Fixture transcribed from PLAN/SHEETS-SCHEMA.md §1–§2. Readers are positional, so a rename
// or reorder here without updating the doc (or vice versa) must fail this test.
const REGISTRY_SCHEMA: Array<[keyof typeof REGISTRY_HEADERS, string[]]> = [
  ["Daftar_Cabang", ["Cabang_ID", "Nama_Cabang", "Spreadsheet_ID", "Aktif"]],
  [
    "Employees",
    [
      "Employee_ID",
      "Username",
      "PIN_Hash",
      "Nama",
      "Role",
      "Cabang_Aktif",
      "Cabang_Terafiliasi",
      "Aktif",
      "Failed_Login_Attempts",
      "Locked_Until",
    ],
  ],
  ["Settings_Global", ["Key", "Value"]],
];

const BRANCH_SCHEMA: Array<[keyof typeof BRANCH_HEADERS, string[]]> = [
  ["Shifts", ["Shift_ID", "Nama", "Jam_Mulai", "Jam_Selesai"]],
  ["Schedules", ["Schedule_ID", "Employee_ID", "Shift_ID", "Tanggal", "Status", "Started_At", "Updated_Via"]],
  ["Shift_Swaps", ["Swap_ID", "Schedule_ID", "Requested_By", "Requested_With", "Alasan", "Status", "Approved_By", "Reject_Reason"]],
  ["Izin", ["Izin_ID", "Employee_ID", "Schedule_ID", "Kategori_ID", "Keterangan", "Status", "Approved_By", "Reject_Reason"]],
  ["Kategori_Izin", ["Kategori_ID", "Label", "Aktif"]],
  ["Checklist_Template", ["Item_ID", "Tipe", "Deskripsi", "Wajib_Foto", "Urutan", "Aktif"]],
  ["Checklist_Log", ["Log_ID", "Schedule_ID", "Item_ID", "Checked_By", "Checked_At", "Foto_URL"]],
  ["Handover_Template", ["Field_ID", "Label", "Wajib", "Urutan"]],
  ["Handover_Log", ["Log_ID", "Schedule_ID", "Field_ID", "Isi", "Created_By", "Created_At"]],
];

test("registry headers match SHEETS-SCHEMA.md", () => {
  for (const [name, headers] of REGISTRY_SCHEMA) {
    assert.deepEqual([...REGISTRY_HEADERS[name]], headers, `registry sheet ${name}`);
  }
});

test("branch sheet order matches SHEETS-SCHEMA.md", () => {
  assert.deepEqual(BRANCH_SHEET_NAMES, BRANCH_SCHEMA.map(([name]) => name));
});

test("branch headers match SHEETS-SCHEMA.md", () => {
  for (const [name, headers] of BRANCH_SCHEMA) {
    assert.deepEqual([...BRANCH_HEADERS[name]], headers, `branch sheet ${name}`);
  }
});

test("ranges are derived from the header width", () => {
  assert.equal(branchSheetRange("Schedules"), "Schedules!A:G");
  assert.equal(branchSheetRange("Shifts"), "Shifts!A:D");
  assert.equal(registrySheetRange("Employees"), "Employees!A:J");
  assert.equal(headerRange("Shifts", 4), "Shifts!A1:D1");
});

test("columnLetter handles rollover past Z", () => {
  assert.equal(columnLetter(1), "A");
  assert.equal(columnLetter(26), "Z");
  assert.equal(columnLetter(27), "AA");
});

test("padRow never leaves undefined holes in a patched row", () => {
  assert.deepEqual(padRow(["EMP-001"], 3), ["EMP-001", "", ""]);
  assert.deepEqual(padRow(["a", "b", "c", "d"], 3), ["a", "b", "c", "d"]);
  assert.deepEqual(padRow([], EMPLOYEE_ROW_WIDTH).length, 10);
});

test("maskSpreadsheetId keeps the ID usable for debugging but not for access", () => {
  const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
  const masked = maskSpreadsheetId(id);
  assert.equal(masked, "1AbCdE…6789");
  assert.ok(!masked.includes(id));
  assert.equal(maskSpreadsheetId(""), "");
  assert.equal(maskSpreadsheetId("short"), "••••");
});
