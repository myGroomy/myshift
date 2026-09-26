import { ok, fail } from "@/lib/api-response";
import { adminSession, isResponse } from "@/lib/route-auth";
import { getBranches } from "@/lib/google/registry";
import { appendRow } from "@/lib/google/sheets-data";
import { nextSequentialId } from "@/lib/ids";
import { requiredText } from "@/lib/domain/master-validation";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  return ok(await getBranches());
}

export async function POST(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const body = await request.json();
    const name = requiredText(body.name, "name");
    const branches = await getBranches();
    const branchId = nextSequentialId(branches.map((branch) => branch.branchId), "CBG", 3);
    await appendRow(process.env.REGISTRY_SPREADSHEET_ID!, "Daftar_Cabang!A:D", [branchId, name, "", "TRUE"]);
    return ok({ branchId, name, spreadsheetId: "", aktif: true }, { status: 201 });
  } catch (error) {
    return fail("INVALID_REQUEST", error instanceof Error ? error.message : "Data cabang tidak valid", 400);
  }
}
