// Column layout of every sheet the executable copy of PLAN/SHEETS-SCHEMA.md §1–§2.
// Ranges and headers for both the app and the setup/provisioning scripts come from here,
// so the docs and the code cannot drift apart silently (AGENTS.md §6.4).
// Order matters: readers are positional, so reordering a column breaks the app.
export const REGISTRY_SHEETS = {
  branches: "Daftar_Cabang",
  employees: "Employees",
  settings: "Settings_Global",
  templates: "TEMPLATES",
} as const;

export type RegistrySheetName = (typeof REGISTRY_SHEETS)[keyof typeof REGISTRY_SHEETS];

export const REGISTRY_HEADERS: Record<RegistrySheetName, readonly string[]> = {
  // `Aktif` stays last: Folder_Drive_ID and Provision_Status were inserted before it, the
  // original four columns were not reordered (SHEETS-SCHEMA.md §1).
  // Audit columns (Created_At, Updated_At) added per database-schema-required.md §3.1.
  Daftar_Cabang: [
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
  Employees: [
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
  Settings_Global: ["Key", "Value", "Updated_At"],
  // Single source of truth for branch provisioning config. Replaces the retired
  // TEMPLATE_SPREADSHEET_ID / MYSHIFT_FOLDER env vars (SHEETS-SCHEMA.md §1).
  TEMPLATES: ["Template_Spreadsheet_ID", "Parent_Folder_ID"],
};

export const BRANCH_HEADERS = {
  Shifts: ["Shift_ID", "Nama", "Jam_Mulai", "Jam_Selesai", "Aktif", "Created_At", "Updated_At"],
  Schedules: [
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
  ],
  Shift_Swaps: [
    "Swap_ID",
    "Schedule_ID",
    "Target_Schedule_ID",
    "Requested_By",
    "Requested_With",
    "Alasan",
    "Status",
    "Approved_By",
    "Decided_At",
    "Reject_Reason",
    "Created_At",
    "Updated_At",
  ],
  Izin: [
    "Izin_ID",
    "Employee_ID",
    "Schedule_ID",
    "Kategori_ID",
    "Keterangan",
    "Status",
    "Approved_By",
    "Decided_At",
    "Reject_Reason",
    "Created_At",
    "Updated_At",
  ],
  Kategori_Izin: ["Kategori_ID", "Label", "Aktif", "Created_At", "Updated_At"],
  SOP_Kategori: ["Kategori_ID", "Nama", "Urutan", "Aktif", "Created_At", "Updated_At"],
  Checklist_Point: [
    "Point_ID",
    "Kategori_ID",
    "Deskripsi",
    "Tipe_Penyelesaian",
    "Satuan",
    "Batas_Min",
    "Batas_Max",
    "Opsi_Pilihan",
    "Berlaku_Semua_Shift",
    "Shift_IDs",
    "Urutan",
    "Aktif",
    "Created_At",
    "Updated_At",
  ],
  Checklist_Log: [
    "Log_ID",
    "Schedule_ID",
    "Point_ID",
    "Point_Public_ID_Snapshot",
    "Category_Name_Snapshot",
    "Description_Snapshot",
    "Completion_Type_Snapshot",
    "Unit_Snapshot",
    "Min_Snapshot",
    "Max_Snapshot",
    "Options_Snapshot",
    "Is_Required_Snapshot",
    "Nilai",
    "Foto_URL",
    "Checked_By",
    "Checked_At",
  ],
  Shift_Report_Audit: [
    "Audit_ID",
    "Schedule_ID",
    "Bagian",
    "Record_ID",
    "Field",
    "Nilai_Lama",
    "Nilai_Baru",
    "Actor_ID",
    "Actor_Name_Snapshot",
    "Changed_At",
  ],
  Handover_Template: ["Field_ID", "Label", "Wajib", "Urutan", "Aktif", "Created_At", "Updated_At"],
  Handover_Log: [
    "Log_ID",
    "Schedule_ID",
    "Field_ID",
    "Field_Public_ID_Snapshot",
    "Label_Snapshot",
    "Is_Required_Snapshot",
    "Isi",
    "Created_By",
    "Created_At",
    "Updated_At",
  ],
  Kategori_Incident: ["Kategori_ID", "Label", "Aktif", "Created_At", "Updated_At"],
  Incidents: [
    "Incident_ID",
    "Kategori_ID",
    "Schedule_ID",
    "Deskripsi",
    "Severity",
    "Foto_URL",
    "Status",
    "Resolved_By",
    "Resolved_At",
    "Created_By",
    "Created_At",
    "Updated_At",
  ],
  Shift_Reports: [
    "Report_ID",
    "Schedule_ID",
    "Generated_By",
    "Generated_At",
    "Public_Token_Hash",
    "Public_Access_Revoked_At",
    "Created_At",
    "Updated_At",
  ],
  Shift_Report_Snapshots: [
    "Snapshot_ID",
    "Report_ID",
    "Revision",
    "Snapshot_Data",
    "Created_By",
    "Created_At",
  ],
  File_Assets: [
    "Asset_ID",
    "Provider",
    "Provider_File_ID",
    "Storage_Path",
    "Mime_Type",
    "Size_Bytes",
    "Checksum",
    "Uploaded_By",
    "Created_At",
  ],
  Incident_Attachments: ["Incident_ID", "Asset_ID"],
  Schema_Migrations: ["Version", "Applied_At", "Checksum"],
} as const;

export type BranchSheetName = keyof typeof BRANCH_HEADERS;

export const BRANCH_SHEET_NAMES = Object.keys(BRANCH_HEADERS) as BranchSheetName[];

export const REGISTRY_SHEET_NAMES = Object.keys(REGISTRY_HEADERS) as RegistrySheetName[];

export function columnLetter(count: number): string {
  let remaining = count;
  let letter = "";
  while (remaining > 0) {
    const remainder = (remaining - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return letter;
}

export function registrySheetRange(name: RegistrySheetName): string {
  return `${name}!A:${columnLetter(REGISTRY_HEADERS[name].length)}`;
}

export function branchSheetRange(name: BranchSheetName): string {
  return `${name}!A:${columnLetter(BRANCH_HEADERS[name].length)}`;
}

export function headerRange(sheetName: string, columnCount: number): string {
  return `${sheetName}!A1:${columnLetter(columnCount)}1`;
}

export function headerValues(sheetName: RegistrySheetName | BranchSheetName): string[] {
  const headers =
    sheetName in REGISTRY_HEADERS
      ? REGISTRY_HEADERS[sheetName as RegistrySheetName]
      : BRANCH_HEADERS[sheetName as BranchSheetName];
  return [...headers];
}

// Google Sheets returns rows only as wide as they were written, so a partially filled row
// would leave `undefined` holes when patched. Widths must match the header (Sheets rejects
// null values in an update that spans them).
export function padRow(values: readonly string[], width: number): string[] {
  return Array.from({ length: Math.max(width, values.length) }, (_, index) => values[index] ?? "");
}

export const EMPLOYEE_ROW_WIDTH = REGISTRY_HEADERS.Employees.length;
export const BRANCH_ROW_WIDTH = REGISTRY_HEADERS.Daftar_Cabang.length;

// Spreadsheet IDs are internal Google identifiers and are not needed by the UI: the branch
// sheet is reachable by name inside the branch's own Drive folder. Keep enough to debug,
// not enough to use.
export function maskSpreadsheetId(spreadsheetId: string): string {
  if (!spreadsheetId) return "";
  if (spreadsheetId.length <= 10) return "••••";
  return `${spreadsheetId.slice(0, 6)}…${spreadsheetId.slice(-4)}`;
}
