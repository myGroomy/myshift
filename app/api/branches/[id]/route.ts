import { fail, handleRouteError, ok } from "@/lib/api-response";
import { adminSession, isResponse } from "@/lib/route-auth";
import { optionalBoolean, optionalText } from "@/lib/domain/master-validation";
import { getBranchRows } from "@/lib/google/registry";
import { replaceRowById } from "@/lib/google/sheets-data";
import { REGISTRY_SHEETS, maskSpreadsheetId, registrySheetRange } from "@/lib/google/sheet-schema";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const body = await request.json();
    const row = (await getBranchRows()).find((entry) => entry.branch.branchId === id);
    if (!row) return fail("NOT_FOUND", "Cabang tidak ditemukan");

    const name = optionalText(body.name, "name", row.branch.nama);
    const aktif = optionalBoolean(body.isActive, "isActive", row.branch.aktif);

    const saved = await replaceRowById(
      process.env.REGISTRY_SPREADSHEET_ID!,
      REGISTRY_SHEETS.branches,
      registrySheetRange(REGISTRY_SHEETS.branches),
      id,
      [id, name, row.branch.spreadsheetId, String(aktif).toUpperCase()]
    );
    if (!saved) return fail("NOT_FOUND", "Cabang tidak ditemukan");

    return ok({
      branchId: id,
      name,
      spreadsheetId: maskSpreadsheetId(row.branch.spreadsheetId),
      spreadsheetConfigured: Boolean(row.branch.spreadsheetId),
      aktif,
    });
  } catch (error) {
    return handleRouteError(error, "Data cabang tidak valid");
  }
}
