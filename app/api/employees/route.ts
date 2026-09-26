import { ok, fail } from "@/lib/api-response";
import { hashPin } from "@/lib/auth";
import { adminSession, isResponse } from "@/lib/route-auth";
import { requiredText } from "@/lib/domain/master-validation";
import { getBranches, getEmployees } from "@/lib/google/registry";
import { appendRow } from "@/lib/google/sheets-data";
import { nextSequentialId } from "@/lib/ids";
import type { NextRequest } from "next/server";

const roles = ["admin", "kepala_cabang", "karyawan"] as const;

export async function GET(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const branchId = request.nextUrl.searchParams.get("branchId");
  const status = request.nextUrl.searchParams.get("status");
  const employees = await getEmployees();
  return ok(employees.filter((employee) => (!branchId || employee.cabangAktif === branchId) && (!status || status === "all" || (status === "active" ? employee.aktif : !employee.aktif))));
}

export async function POST(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const body = await request.json();
    const name = requiredText(body.name, "name");
    const username = requiredText(body.username, "username").toLowerCase();
    const pin = requiredText(body.pin, "pin");
    const role = requiredText(body.role, "role");
    const branchId = requiredText(body.branchId, "branchId");
    if (!roles.includes(role as (typeof roles)[number])) throw new Error("role tidak valid");
    if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN harus 4-8 digit");
    const [employees, branches] = await Promise.all([getEmployees(), getBranches()]);
    if (employees.some((employee) => employee.username === username)) throw new Error("Username sudah digunakan");
    if (!branches.some((branch) => branch.branchId === branchId && branch.aktif)) throw new Error("Cabang tidak valid");
    const employeeId = nextSequentialId(employees.map((employee) => employee.employeeId), "EMP-", 3);
    await appendRow(process.env.REGISTRY_SPREADSHEET_ID!, "Employees!A:J", [employeeId, username, hashPin(pin), name, role, branchId, branchId, "TRUE", "0", ""]);
    return ok({ employeeId, username, name, role, branchId, isActive: true }, { status: 201 });
  } catch (error) {
    return fail("INVALID_REQUEST", error instanceof Error ? error.message : "Data karyawan tidak valid", 400);
  }
}
