import { handleRouteError, ok } from "@/lib/api-response";
import { hashPin } from "@/lib/domain/pin";
import { requiredText, validPin, validRole } from "@/lib/domain/master-validation";
import { adminSession, isResponse } from "@/lib/route-auth";
import { EMPLOYEE_ROLE_VALUES, getBranches, getEmployees, toPublicEmployee } from "@/lib/google/registry";
import { appendRow } from "@/lib/google/sheets-data";
import { REGISTRY_SHEETS, registrySheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import { DomainError } from "@/lib/error-codes";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const branchId = request.nextUrl.searchParams.get("branchId");
  const status = request.nextUrl.searchParams.get("status");
  const employees = await getEmployees();
  return ok(
    employees
      // pinHash never reaches the client — it is a de-facto credential for a 4-8 digit PIN.
      .map(toPublicEmployee)
      .filter(
        (employee) =>
          (!branchId || employee.cabangAktif === branchId) &&
          (!status || status === "all" || (status === "active" ? employee.aktif : !employee.aktif))
      )
  );
}

export async function POST(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const body = await request.json();
    const name = requiredText(body.name, "name");
    const username = requiredText(body.username, "username").toLowerCase();
    const pin = validPin(body.pin);
    const role = validRole(body.role, EMPLOYEE_ROLE_VALUES);
    const branchId = requiredText(body.branchId, "branchId");

    const [employees, branches] = await Promise.all([getEmployees(), getBranches()]);
    if (employees.some((employee) => employee.username === username)) {
      throw new DomainError("VALIDATION_ERROR", "Username sudah digunakan", { data: { fields: ["username"] } });
    }
    if (!branches.some((branch) => branch.branchId === branchId && branch.aktif)) {
      throw new DomainError("VALIDATION_ERROR", "Cabang tidak valid", { data: { fields: ["branchId"] } });
    }

    const employeeId = nextSequentialId(employees.map((employee) => employee.employeeId), ID_PREFIX.employee);
    await appendRow(process.env.REGISTRY_SPREADSHEET_ID!, registrySheetRange(REGISTRY_SHEETS.employees), [
      employeeId,
      username,
      hashPin(pin),
      name,
      role,
      branchId,
      branchId,
      "TRUE",
      "0",
      "",
    ]);
    return ok({ employeeId, username, name, role, branchId, isActive: true }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Data karyawan tidak valid");
  }
}
