import { appendRow, readRows, replaceRow, type SheetRow } from "@/lib/google/sheets-data";
import { sheets } from "@/lib/google/client";
import { REGISTRY_SHEETS, columnLetter, registrySheetRange } from "@/lib/google/sheet-schema";
import { parseAttempts } from "@/lib/domain/login-lockout";
import { EMPLOYEE_ROLE_VALUES, normalizeEmployeeRole, type EmployeeRole } from "@/lib/domain/employee-role";

export interface Employee {
  employeeId: string;
  username: string;
  normalizedUsername: string;
  pinHash: string;
  nama: string;
  role: EmployeeRole;
  cabangAktif: string;
  cabangTerafiliasi: string[];
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
  deactivatedAt: string;
}

// Client-facing projection. `pinHash` must never cross the API boundary (AGENTS.md §5).
export type PublicEmployee = Omit<Employee, "pinHash" | "normalizedUsername" | "deactivatedAt">;

export interface Branch {
  branchId: string;
  nama: string;
  spreadsheetId: string;
  folderId: string;
  provisionStatus: ProvisionStatus;
  aktif: boolean;
  timezone: string;
  createdAt: string;
  updatedAt: string;
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

export type EmployeeRow = SheetRow & {
  employee: Employee;
  attempts: number;
  lockedUntil: string;
  headers: string[];
};

export { EMPLOYEE_ROLE_VALUES };

export function parseRole(value: string): Employee["role"] {
  return normalizeEmployeeRole(value ?? "");
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
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

export function employeeFromRow(headers: readonly string[], values: readonly string[]): Employee {
  const indexByHeader = new Map(headers.map((header, index) => [header.trim(), index]));
  const value = (header: string) => {
    const index = indexByHeader.get(header);
    return index === undefined ? "" : (values[index] ?? "").trim();
  };
  const username = value("Username").toLowerCase();

  return {
    employeeId: value("Employee_ID"),
    username,
    normalizedUsername: (value("Normalized_Username") || username).toLowerCase(),
    pinHash: value("PIN_Hash"),
    nama: value("Nama"),
    role: parseRole(value("Role")),
    cabangAktif: value("Cabang_Aktif"),
    cabangTerafiliasi: value("Cabang_Terafiliasi")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    aktif: parseAktif(value("Aktif")),
    createdAt: value("Created_At"),
    updatedAt: value("Updated_At"),
    deactivatedAt: value("Deactivated_At"),
  };
}

export function employeeColumnIndex(headers: readonly string[], name: string): number {
  return headers.findIndex((header) => header.trim() === name);
}

function rowValuesByHeaders(
  headers: readonly string[],
  values: Readonly<Record<string, string>>,
): string[] {
  return headers.map((header) => values[header.trim()] ?? "");
}

export async function appendEmployee(values: Readonly<Record<string, string>>) {
  const headers = await readEmployeeHeaders();
  const width = headers.length;
  const row = rowValuesByHeaders(headers, values);
  await appendRow(
    registryId(),
    `Employees!A:${columnLetter(width)}`,
    row,
  );
}

export async function replaceEmployeeRow(row: EmployeeRow, values: Readonly<Record<string, string>>) {
  const updated = [...row.values];
  const width = Math.max(row.headers.length, updated.length);
  updated.length = width;
  for (let index = 0; index < width; index += 1) {
    const header = row.headers[index];
    if (header && Object.hasOwn(values, header.trim())) {
      updated[index] = values[header.trim()];
    } else {
      updated[index] ??= "";
    }
  }
  await replaceRow(registryId(), REGISTRY_SHEETS.employees, row.rowNumber, updated);
}

async function readEmployeeHeaders(): Promise<string[]> {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: registryId(),
    range: `${REGISTRY_SHEETS.employees}!1:1`,
  });
  const headers = (result.data.values?.[0] ?? []).map((value) => String(value).trim());
  for (const required of ["Employee_ID", "Username", "PIN_Hash", "Nama", "Role", "Aktif"]) {
    if (!headers.includes(required)) {
      throw new Error(`Header ${required} tidak ditemukan di sheet ${REGISTRY_SHEETS.employees}`);
    }
  }
  if (new Set(headers).size !== headers.length) {
    throw new Error(`Header duplikat di sheet ${REGISTRY_SHEETS.employees}`);
  }
  return headers;
}

function toBranch(values: string[]): Branch {
  return {
    branchId: (values[0] ?? "").trim(),
    nama: (values[1] ?? "").trim(),
    spreadsheetId: (values[2] ?? "").trim(),
    folderId: (values[3] ?? "").trim(),
    provisionStatus: parseProvisionStatus(values[4]),
    aktif: parseAktif(values[5] ?? ""),
    timezone: (values[6] ?? "").trim() || "Asia/Jakarta",
    createdAt: (values[7] ?? "").trim(),
    updatedAt: (values[8] ?? "").trim(),
  };
}

// Row values as a 9-wide tuple, so callers writing a branch row back cannot accidentally drop
// or reorder the auto columns (PATCH /api/branches/:id).
export function branchRowValues(branch: Branch): string[] {
  return [
    branch.branchId,
    branch.nama,
    branch.spreadsheetId,
    branch.folderId,
    branch.provisionStatus,
    branch.aktif ? "TRUE" : "FALSE",
    branch.timezone,
    branch.createdAt,
    branch.updatedAt,
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

// Registry rows are projected by header name so an older live sheet cannot shift Role into
// Cabang_Aktif (or vice versa) while it is being migrated to the current schema.
export async function getEmployeeRows(): Promise<EmployeeRow[]> {
  const headers = await readEmployeeHeaders();
  const rows = await readRows(registryId(), `${REGISTRY_SHEETS.employees}!A:${columnLetter(headers.length)}`);
  return rows.map((row) => ({
    ...row,
    employee: employeeFromRow(headers, row.values),
    attempts: parseAttempts(row.values[employeeColumnIndex(headers, "Failed_Login_Attempts")]),
    lockedUntil: (row.values[employeeColumnIndex(headers, "Locked_Until")] ?? "").trim(),
    headers,
  }));
}

export async function getEmployees(): Promise<Employee[]> {
  return (await getEmployeeRows()).map((row) => row.employee);
}

export async function getShiftReportRegistryData(branchId: string): Promise<{
  branch: Branch | undefined;
  employees: Employee[];
}> {
  const result = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: registryId(),
    ranges: [
      `${REGISTRY_SHEETS.branches}!A1:Z`,
      `${REGISTRY_SHEETS.employees}!A1:Z`,
    ],
  });
  const [branchValues, employeeValues] = result.data.valueRanges ?? [];
  const branches = (branchValues?.values ?? []).slice(1).map((values) =>
    toBranch(values.map(String)),
  );
  const employeeRows = employeeValues?.values ?? [];
  const employeeHeaders = (employeeRows[0] ?? []).map((value) => String(value).trim());
  const employees = employeeRows.slice(1).map((values) =>
    employeeFromRow(employeeHeaders, values.map(String)),
  );

  return {
    branch: branches.find((branch) => branch.branchId === branchId),
    employees,
  };
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
