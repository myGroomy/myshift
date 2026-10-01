import { fail, handleRouteError, ok } from "@/lib/api-response";
import { hashPin } from "@/lib/domain/pin";
import { validPin } from "@/lib/domain/master-validation";
import { adminSession, isResponse } from "@/lib/route-auth";
import { getEmployeeRows, replaceEmployeeRow } from "@/lib/google/registry";
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

    // A new PIN also clears any lockout, otherwise the reset would not take effect.
    const clean = resetLoginFailure();
    await replaceEmployeeRow(row, {
      PIN_Hash: hashPin(pin),
      Failed_Login_Attempts: String(clean.attempts),
      Locked_Until: clean.lockedUntil,
      Updated_At: new Date().toISOString(),
    });
    return ok({ employeeId: id, reset: true });
  } catch (error) {
    return handleRouteError(error, "PIN tidak valid");
  }
}
