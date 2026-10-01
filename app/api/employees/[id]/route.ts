import { fail, handleRouteError, ok } from "@/lib/api-response";
import { mergeBranchAffiliation, optionalBoolean, optionalText, validRole, validUsername } from "@/lib/domain/master-validation";
import { adminSession, isResponse } from "@/lib/route-auth";
import {
  EMPLOYEE_ROLE_VALUES,
  employeeColumnIndex,
  getBranchRows,
  getEmployeeRows,
  replaceEmployeeRow,
} from "@/lib/google/registry";
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

    const value = (header: string) => {
      const index = employeeColumnIndex(row.headers, header);
      return index < 0 ? "" : (row.values[index] ?? "").trim();
    };
    const currentName = row.employee.nama;
    const currentRole = row.employee.role;
    const currentAffiliation = row.employee.cabangTerafiliasi;
    const currentActive = row.employee.aktif;

    const name = optionalText(body.name, "name", currentName);
    let username = row.employee.username;
    if (body.username !== undefined) {
      username = validUsername(body.username, username);
      if (rows.some((entry) => entry.employee.employeeId !== id && entry.employee.username === username)) {
        throw new DomainError("VALIDATION_ERROR", "Username sudah digunakan", {
          data: { fields: ["username"] },
        });
      }
    }
    const role = validRole(body.role === undefined ? currentRole : body.role, EMPLOYEE_ROLE_VALUES);
    let branchId = row.employee.cabangAktif;
    let affiliatedBranches = currentAffiliation;

    if (body.branchId !== undefined) {
      branchId = String(body.branchId).trim();
      const branch = (await getBranchRows()).find((entry) => entry.branch.branchId === branchId);
      if (!branch || !branch.branch.aktif) {
        throw new DomainError("VALIDATION_ERROR", "Cabang tidak valid", { data: { fields: ["branchId"] } });
      }
      // Cabang_Terafiliasi is a comma-separated list; moving a branch must not drop the
      // other affiliations the employee already has (SHEETS-SCHEMA §1).
      affiliatedBranches = mergeBranchAffiliation(currentAffiliation, branchId);
    }

    const aktif = optionalBoolean(body.isActive, "isActive", currentActive);
    const now = new Date().toISOString();
    const deactivatedAt = aktif ? "" : value("Deactivated_At") || now;

    await replaceEmployeeRow(row, {
      Username: username,
      Normalized_Username: username,
      Nama: name,
      Role: role,
      Cabang_Aktif: branchId,
      Cabang_Terafiliasi: affiliatedBranches.join(","),
      Aktif: String(aktif).toUpperCase(),
      Updated_At: now,
      Deactivated_At: deactivatedAt,
    });

    return ok({
      employeeId: row.employee.employeeId,
      username,
      name,
      role,
      branchId,
      affiliatedBranches,
      isActive: aktif,
    });
  } catch (error) {
    return handleRouteError(error, "Data karyawan tidak valid");
  }
}
