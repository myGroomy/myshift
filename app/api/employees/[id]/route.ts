import { ok, fail } from "@/lib/api-response";
import { adminSession, isResponse } from "@/lib/route-auth";
import { getEmployeeRows } from "@/lib/google/registry";
import { replaceRow } from "@/lib/google/sheets-data";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  const row = (await getEmployeeRows()).find((entry) => entry.values[0] === id);
  if (!row) return fail("NOT_FOUND", "Karyawan tidak ditemukan", 404);
  try {
    const body = await request.json();
    const values = [...row.values];
    if (body.name !== undefined) values[3] = String(body.name).trim();
    if (body.role !== undefined) values[4] = String(body.role).trim();
    if (body.branchId !== undefined) {
      values[5] = String(body.branchId).trim();
      values[6] = String(body.branchId).trim();
    }
    if (body.isActive !== undefined) values[7] = String(Boolean(body.isActive)).toUpperCase();
    await replaceRow(process.env.REGISTRY_SPREADSHEET_ID!, "Employees", row.rowNumber, values);
    return ok({ employeeId: values[0], username: values[1], name: values[3], role: values[4], branchId: values[5], isActive: values[7] === "TRUE" });
  } catch (error) {
    return fail("INVALID_REQUEST", error instanceof Error ? error.message : "Data karyawan tidak valid", 400);
  }
}
