import { fail, ok } from "@/lib/api-response";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { adminSession, isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import { readRows, appendRow } from "@/lib/google/sheets-data";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, "Handover_Template!A:D");
    const records = rows.slice(1).map((row) => ({
      fieldId: row.values[0] ?? "",
      label: row.values[1] ?? "",
      isRequired: (row.values[2] ?? "FALSE").toUpperCase() === "TRUE",
      order: Number(row.values[3] ?? "0") || 0,
    }));

    return ok(records);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat template";
    const code = message.includes("Cabang") ? "FORBIDDEN" : "INTERNAL_ERROR";
    return fail(code, message, code === "FORBIDDEN" ? 403 : 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const body = await request.json() as { label: string; isRequired: boolean };
    const { label, isRequired } = body;

    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const fieldId = `HOF-${crypto.randomUUID().slice(0, 8)}`;
    await appendRow(spreadsheetId, "Handover_Template!A:D", [fieldId, label, isRequired ? "TRUE" : "FALSE", "0"]);

    return ok({ fieldId, label, isRequired });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat template";
    const code = message.includes("Cabang") ? "FORBIDDEN" : "INTERNAL_ERROR";
    return fail(code, message, code === "FORBIDDEN" ? 403 : 500);
  }
}
