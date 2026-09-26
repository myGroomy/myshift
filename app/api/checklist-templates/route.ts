import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { readRows, appendRow } from "@/lib/google/sheets-data";
import { nanoid } from "@/lib/ids";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Belum login" } }, { status: 401 });

    const branchId = "CBG001";
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

    return NextResponse.json({ success: true, data: records });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Belum login" } }, { status: 401 });

    const body = await req.json();
    const { branchId, type, description, requiresPhoto } = body as { branchId?: string; type: string; description: string; requiresPhoto: boolean };

    const { spreadsheetId } = await branchSpreadsheet(branchId ?? "CBG001");
    const itemId = `CHK-${nanoid()}`;
    const now = new Date().toISOString();
    await appendRow(spreadsheetId, "Checklist_Template!A:G", [itemId, type, description, requiresPhoto ? "TRUE" : "FALSE", "0", "TRUE"]);

    return NextResponse.json({ success: true, data: { itemId, type, description, requiresPhoto } });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }, { status: 500 });
  }
}
