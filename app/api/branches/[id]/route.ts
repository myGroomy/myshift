import { ok, fail } from "@/lib/api-response";
import { adminSession, isResponse } from "@/lib/route-auth";
import { getBranchRows } from "@/lib/google/registry";
import { replaceRow } from "@/lib/google/sheets-data";
import { requiredText } from "@/lib/domain/master-validation";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  const row = (await getBranchRows()).find((entry) => entry.branch.branchId === id);
  if (!row) return fail("NOT_FOUND", "Cabang tidak ditemukan", 404);
  try {
    const body = await request.json();
    const name = body.name === undefined ? row.branch.nama : requiredText(body.name, "name");
    const active = body.isActive === undefined ? row.branch.aktif : Boolean(body.isActive);
    await replaceRow(process.env.REGISTRY_SPREADSHEET_ID!, "Daftar_Cabang", row.rowNumber, [id, name, row.branch.spreadsheetId, String(active).toUpperCase()]);
    return ok({ branchId: id, name, spreadsheetId: row.branch.spreadsheetId, aktif: active });
  } catch (error) {
    return fail("INVALID_REQUEST", error instanceof Error ? error.message : "Data cabang tidak valid", 400);
  }
}
