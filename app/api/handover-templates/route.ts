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
    const rows = await readRows(spreadsheetId, "Handover_Template!A:D");
    const records = rows.slice(1).map((row) => ({
      fieldId: row.values[0] ?? "",
      label: row.values[1] ?? "",
      isRequired: (row.values[2] ?? "FALSE").toUpperCase() === "TRUE",
      order: Number(row.values[3] ?? "0") || 0,
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
    const { label, isRequired } = body as { label: string; isRequired: boolean };

    const { spreadsheetId } = await branchSpreadsheet("CBG001");
    const fieldId = `HOF-${nanoid()}`;
    await appendRow(spreadsheetId, "Handover_Template!A:D", [fieldId, label, isRequired ? "TRUE" : "FALSE", "0"]);

    return NextResponse.json({ success: true, data: { fieldId, label, isRequired } });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }, { status: 500 });
  }
}
