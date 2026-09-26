import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { readRows, replaceRow, deleteRow } from "@/lib/google/sheets-data";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: itemId } = await params;
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Belum login" } }, { status: 401 });

    const body = await req.json();
    const { description, requiresPhoto } = body as { description?: string; requiresPhoto?: boolean };

    const branchId = "CBG001";
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, "Checklist_Template!A:G");
    const row = rows.find((r) => r.values[0] === itemId);
    if (!row) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Item tidak ditemukan" } }, { status: 404 });

    const newDesc = description ?? row.values[2] ?? "";
    const newPhoto = requiresPhoto !== undefined ? (requiresPhoto ? "TRUE" : "FALSE") : (row.values[3] ?? "FALSE");
    await replaceRow(spreadsheetId, "Checklist_Template", row.rowNumber, [itemId, row.values[1] ?? "", newDesc, newPhoto, row.values[4] ?? "0", row.values[5] ?? "TRUE"]);

    return NextResponse.json({ success: true, data: { itemId } });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: itemId } = await params;
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Belum login" } }, { status: 401 });

    const branchId = "CBG001";
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, "Checklist_Template!A:G");
    const row = rows.find((r) => r.values[0] === itemId);
    if (!row) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Item tidak ditemukan" } }, { status: 404 });

    await deleteRow(spreadsheetId, "Checklist_Template", row.rowNumber);

    return NextResponse.json({ success: true });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }, { status: 500 });
  }
}
