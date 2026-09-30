export const EMPLOYEE_ROLE_VALUES = ["admin", "petugas"] as const;
export type EmployeeRole = (typeof EMPLOYEE_ROLE_VALUES)[number];

export function normalizeEmployeeRole(value: string): EmployeeRole {
  const role = value.trim().toLowerCase();
  if (role === "admin") return "admin";
  if (role === "petugas" || role === "karyawan" || role === "kepala_cabang" || role === "kepala-cabang") {
    return "petugas";
  }
  throw new Error(`Role tidak dikenal: ${value}`);
}
