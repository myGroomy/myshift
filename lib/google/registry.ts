import { readRows, type SheetRow } from "@/lib/google/sheets-data";
import { REGISTRY_SHEETS, registrySheetRange } from "@/lib/google/sheet-schema";
import { parseAttempts } from "@/lib/domain/login-lockout";

export interface Employee {
  employeeId: string;
  username: string;
  pinHash: string;
  nama: string;
  role: "admin" | "karyawan";
  cabangAktif: string;
  cabangTerafiliasi: string[];
  aktif: boolean;
}

// Client-facing projection. `pinHash` must never cross the API boundary (AGENTS.md §5).
export type PublicEmployee = Omit<Employee, "pinHash">;

export interface Branch {
  branchId: string;
  nama: string;
  spreadsheetId: string;
  folderId: string;
  provisionStatus: ProvisionStatus;
  aktif: boolean;
}

export const PROVISION_STATUS_VALUES = ["pending", "ready", "failed"] as const;
export type ProvisionStatus = (typeof PROVISION_STATUS_VALUES)[number];

// Unknown/blank is treated as `pending`: a row written before the Provision_Status column
// existed has no Drive folder yet, so it still needs provisioning. Guessing `ready` would hide
// a half-configured branch behind a green checkmark in the admin UI.
export function parseProvisionStatus(value: string | undefined): ProvisionStatus {
  const normalized = (value ?? "").trim().toLowerCase();
  return PROVISION_STATUS_VALUES.find((status) => status === normalized) ?? "pending";
}

export type EmployeeRow = SheetRow & { employee: Employee; attempts: number; lockedUntil: string };

export const EMPLOYEE_ROLE_VALUES = ["admin", "karyawan"] as const;

export function parseRole(value: string): Employee["role"] {
  const normalized = (value ?? "").trim();
  return normalized === "admin" ? "admin" : "karyawan";
}

export function parseAktif(value: string): boolean {
  return (value ?? "").trim().toUpperCase() === "TRUE";
}

export function toPublicEmployee(employee: Employee): PublicEmployee {
  return {
    employeeId: employee.employeeId,
    username: employee.username,
    nama: employee.nama,
    role: employee.role,
    cabangAktif: employee.cabangAktif,
    cabangTerafiliasi: employee.cabangTerafiliasi,
    aktif: employee.aktif,
  };
}

function toEmployee(values: string[]): Employee {
  return {
    employeeId: (values[0] ?? "").trim(),
    username: (values[1] ?? "").trim().toLowerCase(),
    pinHash: (values[2] ?? "").trim(),
    nama: (values[3] ?? "").trim(),
    role: parseRole(values[4] ?? ""),
    cabangAktif: (values[5] ?? "").trim(),
    cabangTerafiliasi: (values[6] ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    aktif: parseAktif(values[7] ?? ""),
  };
}

function toBranch(values: string[]): Branch {
  return {
    branchId: (values[0] ?? "").trim(),
    nama: (values[1] ?? "").trim(),
    spreadsheetId: (values[2] ?? "").trim(),
    folderId: (values[3] ?? "").trim(),
    provisionStatus: parseProvisionStatus(values[4]),
    aktif: parseAktif(values[5] ?? ""),
  };
}

// Row values as a 6-wide tuple, so callers writing a branch row back cannot accidentally drop
// or reorder the auto columns (PATCH /api/branches/:id).
export function branchRowValues(branch: Branch): string[] {
  return [
    branch.branchId,
    branch.nama,
    branch.spreadsheetId,
    branch.folderId,
    branch.provisionStatus,
    branch.aktif ? "TRUE" : "FALSE",
  ];
}

// The only editable branch fields are Nama_Cabang and Aktif (API-CONTRACT §3). Kept here, next to
// branchRowValues, so the "carry the provisioning columns over verbatim" rule lives with the row
// writer instead of in the handler and is covered by test/branch-edit.test.ts.
export function applyBranchEdits(
  branch: Branch,
  edits: { nama?: string; aktif?: boolean }
): Branch {
  return {
    ...branch,
    nama: edits.nama ?? branch.nama,
    aktif: edits.aktif ?? branch.aktif,
  };
}

function registryId() {
  return process.env.REGISTRY_SPREADSHEET_ID!;
}

// Positional reads are safe because lib/google/sheet-schema.ts is the single source of
// column order and test/sheet-schema.test.ts pins it to PLAN/SHEETS-SCHEMA.md.
export async function getEmployeeRows(): Promise<EmployeeRow[]> {
  const rows = await readRows(registryId(), registrySheetRange(REGISTRY_SHEETS.employees));
  return rows.map((row) => ({
    ...row,
    employee: toEmployee(row.values),
    attempts: parseAttempts(row.values[8]),
    lockedUntil: (row.values[9] ?? "").trim(),
  }));
}

export async function getEmployees(): Promise<Employee[]> {
  return (await getEmployeeRows()).map((row) => row.employee);
}

export async function getBranchRows(): Promise<Array<SheetRow & { branch: Branch }>> {
  const rows = await readRows(registryId(), registrySheetRange(REGISTRY_SHEETS.branches));
  return rows.map((row) => ({ ...row, branch: toBranch(row.values) }));
}

export async function getBranches(): Promise<Branch[]> {
  return (await getBranchRows()).map((row) => row.branch);
}

export interface TemplateConfig {
  templateSpreadsheetId: string;
  parentFolderId: string;
}

// Branch provisioning config, read from the Registry rather than env vars so it can be
// changed in the sheet without a redeploy (SHEETS-SCHEMA.md §1). Both fields are required:
// a half-filled TEMPLATES sheet must fail loudly at provision time, not silently skip.
export async function getTemplateConfig(): Promise<TemplateConfig> {
  const rows = await readRows(registryId(), registrySheetRange(REGISTRY_SHEETS.templates));
  const first = rows[0]?.values ?? [];
  return {
    templateSpreadsheetId: (first[0] ?? "").trim(),
    parentFolderId: (first[1] ?? "").trim(),
  };
}
