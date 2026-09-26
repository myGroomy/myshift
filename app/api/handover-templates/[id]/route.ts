import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { readRows, replaceRow, deleteRow } from "@/lib/google/sheets-data";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: fieldId } = await params;
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Belum login" } }, { status: 401 });

    const body = await req.json();
    const { label, isRequired } = body as { label?: string; isRequired?: boolean };

    const branchId = "CBG001";
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, "Handover_Template!A:D");
    const row = rows.find((r) => r.values[0] === fieldId);
    if (!row) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Field tidak ditemukan" } }, { status: 404 });

    const newLabel = label ?? row.values[1] ?? "";
    const newRequired = isRequired !== undefined ? (isRequired ? "TRUE" : "FALSE") : (row.values[2] ?? "FALSE");
    await replaceRow(spreadsheetId, "Handover_Template", row.rowNumber, [fieldId, newLabel, newRequired, row.values[3] ?? "0"]);

    return NextResponse.json({ success: true, data: { fieldId } });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: fieldId } = await params;
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Belum login" } }, { status: 401 });

    const branchId = "CBG001";
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, "Handover_Template!A:D");
    const row = rows.find((r) => r.values[0] === fieldId);
    if (!row) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Field tidak ditemukan" } }, { status: 404 });

    await deleteRow(spreadsheetId, "Handover_Template", row.rowNumber);

    return NextResponse.json({ success: true });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }, { status: 500 });
  }
}
