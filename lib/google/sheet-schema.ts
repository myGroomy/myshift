// Column layout of every sheet — the executable copy of PLAN/SHEETS-SCHEMA.md §1–§2.
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
  Daftar_Cabang: [
    "Cabang_ID",
    "Nama_Cabang",
    "Spreadsheet_ID",
    "Folder_Drive_ID",
    "Provision_Status",
    "Aktif",
  ],
  Employees: [
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
  Settings_Global: ["Key", "Value"],
  // Single source of truth for branch provisioning config. Replaces the retired
  // TEMPLATE_SPREADSHEET_ID / MYSHIFT_FOLDER env vars (SHEETS-SCHEMA.md §1).
  TEMPLATES: ["Template_Spreadsheet_ID", "Parent_Folder_ID"],
};

export const BRANCH_HEADERS = {
  Shifts: ["Shift_ID", "Nama", "Jam_Mulai", "Jam_Selesai"],
  Schedules: ["Schedule_ID", "Employee_ID", "Shift_ID", "Tanggal", "Status", "Started_At", "Updated_Via"],
  Shift_Swaps: [
    "Swap_ID",
    "Schedule_ID",
    "Requested_By",
    "Requested_With",
    "Alasan",
    "Status",
    "Approved_By",
    "Reject_Reason",
  ],
  Izin: [
    "Izin_ID",
    "Employee_ID",
    "Schedule_ID",
    "Kategori_ID",
    "Keterangan",
    "Status",
    "Approved_By",
    "Reject_Reason",
  ],
  Kategori_Izin: ["Kategori_ID", "Label", "Aktif"],
  Checklist_Template: ["Item_ID", "Tipe", "Deskripsi", "Wajib_Foto", "Urutan", "Aktif"],
  Checklist_Log: ["Log_ID", "Schedule_ID", "Item_ID", "Checked_By", "Checked_At", "Foto_URL"],
  Handover_Template: ["Field_ID", "Label", "Wajib", "Urutan"],
  Handover_Log: ["Log_ID", "Schedule_ID", "Field_ID", "Isi", "Created_By", "Created_At"],
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
// sheet is reachable by name inside MYSHIFT_FOLDER. Keep enough to debug, not enough to use.
export function maskSpreadsheetId(spreadsheetId: string): string {
  if (!spreadsheetId) return "";
  if (spreadsheetId.length <= 10) return "••••";
  return `${spreadsheetId.slice(0, 6)}…${spreadsheetId.slice(-4)}`;
}
