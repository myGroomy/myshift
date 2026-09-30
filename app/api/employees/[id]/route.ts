import { fail, handleRouteError, ok } from "@/lib/api-response";
import { mergeBranchAffiliation, optionalBoolean, optionalText, optionalBranchIdList, validRole, validUsername } from "@/lib/domain/master-validation";
import { adminSession, isResponse } from "@/lib/route-auth";
import { EMPLOYEE_ROLE_VALUES, getBranchRows, getEmployeeRows } from "@/lib/google/registry";
import { replaceRowById } from "@/lib/google/sheets-data";
import { EMPLOYEE_ROW_WIDTH, REGISTRY_SHEETS, padRow, registrySheetRange } from "@/lib/google/sheet-schema";
import { DomainError } from "@/lib/error-codes";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const body = await request.json();
    const rows = await getEmployeeRows();
    const row = rows.find((entry) => entry.employee.employeeId === id);
    if (!row) return fail("NOT_FOUND", "Karyawan tidak ditemukan");

    const values = padRow(row.values, EMPLOYEE_ROW_WIDTH);
    const currentName = (values[3] ?? "").trim();
    const currentRole = row.employee.role;
    const currentAffiliation = optionalBranchIdList(values[6]);
    const currentActive = (values[7] ?? "").trim().toUpperCase() === "TRUE";

    values[3] = optionalText(body.name, "name", currentName);
    if (body.username !== undefined) {
      const username = validUsername(body.username, values[1] ?? "");
      if (rows.some((entry) => entry.employee.employeeId !== id && entry.employee.username.toLowerCase() === username)) {
        throw new DomainError("VALIDATION_ERROR", "Username sudah digunakan", {
          data: { fields: ["username"] },
        });
      }
      values[1] = username;
    }
    values[4] = validRole(body.role === undefined ? currentRole : body.role, EMPLOYEE_ROLE_VALUES);

    if (body.branchId !== undefined) {
      const branchId = String(body.branchId).trim();
      const branch = (await getBranchRows()).find((entry) => entry.branch.branchId === branchId);
      if (!branch || !branch.branch.aktif) {
        throw new DomainError("VALIDATION_ERROR", "Cabang tidak valid", { data: { fields: ["branchId"] } });
      }
      values[5] = branchId;
      // Cabang_Terafiliasi is a comma-separated list; moving a branch must not drop the
      // other affiliations the employee already has (SHEETS-SCHEMA §1).
      values[6] = mergeBranchAffiliation(currentAffiliation, branchId).join(",");
    }

    values[7] = String(optionalBoolean(body.isActive, "isActive", currentActive)).toUpperCase();

    await replaceRowById(process.env.REGISTRY_SPREADSHEET_ID!, REGISTRY_SHEETS.employees, registrySheetRange(REGISTRY_SHEETS.employees), id, values);

    return ok({
      employeeId: values[0],
      username: values[1],
      name: values[3],
      role: values[4],
      branchId: values[5],
      affiliatedBranches: optionalBranchIdList(values[6]),
      isActive: values[7] === "TRUE",
    });
  } catch (error) {
    return handleRouteError(error, "Data karyawan tidak valid");
  }
}
