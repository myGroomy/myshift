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
    const rows = await readRows(spreadsheetId, "Checklist_Template!A:G");
    const records = rows.slice(1).map((row) => ({
      rowNumber: row.rowNumber,
      itemId: row.values[0] ?? "",
      type: row.values[1] ?? "",
      description: row.values[2] ?? "",
      requiresPhoto: (row.values[3] ?? "FALSE").toUpperCase() === "TRUE",
      order: Number(row.values[4] ?? "0") || 0,
      active: (row.values[5] ?? "TRUE").toUpperCase() === "TRUE",
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
    const body = await request.json() as { type: string; description: string; requiresPhoto: boolean };
    const { type, description, requiresPhoto } = body;

    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const itemId = `CHK-${crypto.randomUUID().slice(0, 8)}`;
    await appendRow(spreadsheetId, "Checklist_Template!A:G", [itemId, type, description, requiresPhoto ? "TRUE" : "FALSE", "0", "TRUE"]);

    return ok({ itemId, type, description, requiresPhoto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat template";
    const code = message.includes("Cabang") ? "FORBIDDEN" : "INTERNAL_ERROR";
    return fail(code, message, code === "FORBIDDEN" ? 403 : 500);
  }
}
