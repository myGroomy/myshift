import { fail, handleRouteError, ok } from "@/lib/api-response";
import { hashPin } from "@/lib/domain/pin";
import { validPin } from "@/lib/domain/master-validation";
import { adminSession, isResponse } from "@/lib/route-auth";
import { getEmployeeRows } from "@/lib/google/registry";
import { replaceRowById } from "@/lib/google/sheets-data";
import { EMPLOYEE_ROW_WIDTH, REGISTRY_SHEETS, padRow, registrySheetRange } from "@/lib/google/sheet-schema";
import { resetLoginFailure } from "@/lib/domain/login-lockout";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const body = await request.json();
    const pin = validPin(body.pin);

    const row = (await getEmployeeRows()).find((entry) => entry.employee.employeeId === id);
    if (!row) return fail("NOT_FOUND", "Karyawan tidak ditemukan");

    const values = padRow(row.values, EMPLOYEE_ROW_WIDTH);
    values[2] = hashPin(pin);
    // A new PIN also clears any lockout, otherwise the reset would not take effect.
    const clean = resetLoginFailure();
    values[8] = String(clean.attempts);
    values[9] = clean.lockedUntil;

    await replaceRowById(process.env.REGISTRY_SPREADSHEET_ID!, REGISTRY_SHEETS.employees, registrySheetRange(REGISTRY_SHEETS.employees), id, values);
    return ok({ employeeId: id, reset: true });
  } catch (error) {
    return handleRouteError(error, "PIN tidak valid");
  }
}
