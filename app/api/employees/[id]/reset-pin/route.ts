import { ok, fail } from "@/lib/api-response";
import { adminSession, isResponse } from "@/lib/route-auth";
import { hashPin } from "@/lib/auth";
import { getEmployeeRows } from "@/lib/google/registry";
import { replaceRow } from "@/lib/google/sheets-data";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  const row = (await getEmployeeRows()).find((entry) => entry.values[0] === id);
  if (!row) return fail("NOT_FOUND", "Karyawan tidak ditemukan", 404);
  try {
    const { pin } = await request.json();
    if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) throw new Error("PIN harus 4-8 digit");
    const values = [...row.values];
    values[2] = hashPin(pin);
    await replaceRow(process.env.REGISTRY_SPREADSHEET_ID!, "Employees", row.rowNumber, values);
    return ok({ employeeId: id, reset: true });
  } catch (error) {
    return fail("INVALID_REQUEST", error instanceof Error ? error.message : "PIN tidak valid", 400);
  }
}
