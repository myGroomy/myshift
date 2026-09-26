import { sheets } from "@/lib/google/client";
import { readRows } from "@/lib/google/sheets-data";

export interface Employee {
  employeeId: string;
  username: string;
  pinHash: string;
  nama: string;
  role: "admin" | "kepala_cabang" | "karyawan";
  cabangAktif: string;
  cabangTerafiliasi: string[];
  aktif: boolean;
}

export interface Branch {
  branchId: string;
  nama: string;
  spreadsheetId: string;
  aktif: boolean;
}

export async function getEmployees(): Promise<Employee[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.REGISTRY_SPREADSHEET_ID!,
    range: "Employees!A:J",
  });
  const rows = res.data.values || [];
  if (rows.length <= 1) return [];
  const header = rows[0];
  const employees: Employee[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j].trim()] = row[j] ?? "";
    }
    const employee: Employee = {
      employeeId: (obj["Employee_ID"] || "").trim(),
      username: (obj["Username"] || "").trim().toLowerCase(),
      pinHash: (obj["PIN_Hash"] || "").trim(),
      nama: (obj["Nama"] || "").trim(),
      role: parseRole(obj["Role"]),
      cabangAktif: (obj["Cabang_Aktif"] || "").trim(),
      cabangTerafiliasi: (obj["Cabang_Terafiliasi"] || "").trim().split(",").map(s => s.trim()).filter(s => s),
      aktif: (obj["Aktif"] || "").trim().toUpperCase() === "TRUE",
    };
    employees.push(employee);
  }
  return employees;
}

export async function getBranches(): Promise<Branch[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.REGISTRY_SPREADSHEET_ID!,
    range: "Daftar_Cabang!A:D",
  });
  const rows = res.data.values || [];
  if (rows.length <= 1) return [];
  const header = rows[0];
  const branches: Branch[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j].trim()] = row[j] ?? "";
    }
    branches.push({
      branchId: (obj["Cabang_ID"] || "").trim(),
      nama: (obj["Nama_Cabang"] || "").trim(),
      spreadsheetId: (obj["Spreadsheet_ID"] || "").trim(),
      aktif: (obj["Aktif"] || "").trim().toUpperCase() === "TRUE",
    });
  }
  return branches;
}

export async function getBranchRows() {
  const spreadsheetId = process.env.REGISTRY_SPREADSHEET_ID!;
  const rows = await readRows(spreadsheetId, "Daftar_Cabang!A:D");
  return rows.map(({ rowNumber, values }) => ({
    rowNumber,
    branch: {
      branchId: values[0] ?? "",
      nama: values[1] ?? "",
      spreadsheetId: values[2] ?? "",
      aktif: (values[3] ?? "").toUpperCase() === "TRUE",
    } satisfies Branch,
  }));
}

export async function getEmployeeRows() {
  const spreadsheetId = process.env.REGISTRY_SPREADSHEET_ID!;
  const rows = await readRows(spreadsheetId, "Employees!A:J");
  return rows.map(({ rowNumber, values }) => ({ rowNumber, values }));
}

function parseRole(value: string): Employee["role"] {
  return value === "admin" || value === "kepala_cabang" || value === "karyawan" ? value : "karyawan";
}
