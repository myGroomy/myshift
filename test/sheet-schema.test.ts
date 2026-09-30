import test from "node:test";
import assert from "node:assert/strict";
import {
  BRANCH_HEADERS,
  BRANCH_SHEET_NAMES,
  EMPLOYEE_ROW_WIDTH,
  REGISTRY_HEADERS,
  REGISTRY_SHEETS,
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
  [
    "Daftar_Cabang",
    [
      "Cabang_ID",
      "Nama_Cabang",
      "Spreadsheet_ID",
      "Folder_Drive_ID",
      "Provision_Status",
      "Aktif",
      "Timezone",
      "Created_At",
      "Updated_At",
    ],
  ],
  [
    "Employees",
    [
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
    ],
  ],
  ["Settings_Global", ["Key", "Value", "Updated_At"]],
  ["TEMPLATES", ["Template_Spreadsheet_ID", "Parent_Folder_ID"]],
];

const BRANCH_SCHEMA: Array<[keyof typeof BRANCH_HEADERS, string[]]> = [
  ["Shifts", ["Shift_ID", "Nama", "Jam_Mulai", "Jam_Selesai", "Aktif", "Created_At", "Updated_At"]],
  ["Schedules", ["Schedule_ID", "Employee_ID", "Employee_Name_Snapshot", "Shift_ID", "Shift_Name_Snapshot", "Shift_Start_Snapshot", "Shift_End_Snapshot", "Tanggal", "Status", "Started_At", "Updated_Via", "Report_Generated_At", "Report_Token", "Created_By", "Created_At", "Updated_At"]],
  ["Shift_Swaps", ["Swap_ID", "Schedule_ID", "Target_Schedule_ID", "Requested_By", "Requested_With", "Alasan", "Status", "Approved_By", "Decided_At", "Reject_Reason", "Created_At", "Updated_At"]],
  ["Izin", ["Izin_ID", "Employee_ID", "Schedule_ID", "Kategori_ID", "Keterangan", "Status", "Approved_By", "Decided_At", "Reject_Reason", "Created_At", "Updated_At"]],
  ["Kategori_Izin", ["Kategori_ID", "Label", "Aktif", "Created_At", "Updated_At"]],
  ["SOP_Kategori", ["Kategori_ID", "Nama", "Urutan", "Aktif", "Created_At", "Updated_At"]],
  ["Checklist_Point", ["Point_ID", "Kategori_ID", "Deskripsi", "Tipe_Penyelesaian", "Satuan", "Batas_Min", "Batas_Max", "Opsi_Pilihan", "Berlaku_Semua_Shift", "Shift_IDs", "Urutan", "Aktif", "Created_At", "Updated_At"]],
  ["Checklist_Log", ["Log_ID", "Schedule_ID", "Point_ID", "Point_Public_ID_Snapshot", "Category_Name_Snapshot", "Description_Snapshot", "Completion_Type_Snapshot", "Unit_Snapshot", "Min_Snapshot", "Max_Snapshot", "Options_Snapshot", "Is_Required_Snapshot", "Nilai", "Foto_URL", "Checked_By", "Checked_At"]],
  ["Shift_Report_Audit", ["Audit_ID", "Schedule_ID", "Bagian", "Record_ID", "Field", "Nilai_Lama", "Nilai_Baru", "Actor_ID", "Actor_Name_Snapshot", "Changed_At"]],
  ["Handover_Template", ["Field_ID", "Label", "Wajib", "Urutan", "Aktif", "Created_At", "Updated_At"]],
  ["Handover_Log", ["Log_ID", "Schedule_ID", "Field_ID", "Field_Public_ID_Snapshot", "Label_Snapshot", "Is_Required_Snapshot", "Isi", "Created_By", "Created_At", "Updated_At"]],
  ["Kategori_Incident", ["Kategori_ID", "Label", "Aktif", "Created_At", "Updated_At"]],
  ["Incidents", ["Incident_ID", "Kategori_ID", "Schedule_ID", "Deskripsi", "Severity", "Foto_URL", "Status", "Resolved_By", "Resolved_At", "Created_By", "Created_At", "Updated_At"]],
  ["Shift_Reports", ["Report_ID", "Schedule_ID", "Generated_By", "Generated_At", "Public_Token_Hash", "Public_Access_Revoked_At", "Created_At", "Updated_At"]],
  ["Shift_Report_Snapshots", ["Snapshot_ID", "Report_ID", "Revision", "Snapshot_Data", "Created_By", "Created_At"]],
  ["File_Assets", ["Asset_ID", "Provider", "Provider_File_ID", "Storage_Path", "Mime_Type", "Size_Bytes", "Checksum", "Uploaded_By", "Created_At"]],
  ["Incident_Attachments", ["Incident_ID", "Asset_ID"]],
  ["Schema_Migrations", ["Version", "Applied_At", "Checksum"]],
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
  assert.equal(branchSheetRange("Schedules"), "Schedules!A:P");
  assert.equal(branchSheetRange("Shifts"), "Shifts!A:G");
  assert.equal(registrySheetRange("Employees"), "Employees!A:N");
  assert.equal(registrySheetRange("Daftar_Cabang"), "Daftar_Cabang!A:I");
  assert.equal(registrySheetRange("TEMPLATES"), "TEMPLATES!A:B");
  assert.equal(headerRange("Shifts", 7), "Shifts!A1:G1");
});

test("every registry sheet has a pinned header row", () => {
  for (const name of Object.values(REGISTRY_SHEETS)) {
    assert.ok(REGISTRY_HEADERS[name]?.length, `REGISTRY_HEADERS is missing ${name}`);
    assert.ok(
      REGISTRY_SCHEMA.some(([sheet]) => sheet === name),
      `test fixture is missing ${name} add it so the schema stays pinned`
    );
  }
});

test("columnLetter handles rollover past Z", () => {
  assert.equal(columnLetter(1), "A");
  assert.equal(columnLetter(26), "Z");
  assert.equal(columnLetter(27), "AA");
});

test("padRow never leaves undefined holes in a patched row", () => {
  assert.deepEqual(padRow(["EMP-001"], 3), ["EMP-001", "", ""]);
  assert.deepEqual(padRow(["a", "b", "c", "d"], 3), ["a", "b", "c", "d"]);
  assert.deepEqual(padRow([], EMPLOYEE_ROW_WIDTH).length, 14);
});

test("maskSpreadsheetId keeps the ID usable for debugging but not for access", () => {
  const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
  const masked = maskSpreadsheetId(id);
  assert.equal(masked, "1AbCdE…6789");
  assert.ok(!masked.includes(id));
  assert.equal(maskSpreadsheetId(""), "");
  assert.equal(maskSpreadsheetId("short"), "••••");
});
