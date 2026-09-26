import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { readRows, appendRow } from "@/lib/google/sheets-data";
import { nanoid } from "@/lib/ids";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: scheduleId } = await params;
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Belum login" } }, { status: 401 });

    const branchId = "CBG001";
    const { spreadsheetId } = await branchSpreadsheet(branchId);

    const templateRows = await readRows(spreadsheetId, "Checklist_Template!A:G");
    const items = templateRows.slice(1)
      .map((row) => ({
        rowNumber: row.rowNumber,
        itemId: row.values[0] ?? "",
        type: row.values[1] ?? "",
        description: row.values[2] ?? "",
        requiresPhoto: (row.values[3] ?? "FALSE").toUpperCase() === "TRUE",
        order: Number(row.values[4] ?? "0") || 0,
        active: (row.values[5] ?? "TRUE").toUpperCase() === "TRUE",
      }))
      .filter((item) => item.active)
      .sort((a, b) => a.order - b.order);

    const logRows = await readRows(spreadsheetId, "Checklist_Log!A:F");
    const checkedIds = new Set(logRows.filter((l) => l.values[1] === scheduleId).map((l) => l.values[2]));

    const checklistItems = items.map((item) => ({ ...item, checked: checkedIds.has(item.itemId) }));
    const completed = checklistItems.filter((i) => i.checked).length;

    return NextResponse.json({ success: true, data: { items: checklistItems, completed, total: checklistItems.length } });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: scheduleId } = await params;
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Belum login" } }, { status: 401 });
    const body = await req.json();
    const { itemId, photoUrl } = body as { itemId: string; photoUrl?: string };

    const branchId = "CBG001";
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const logId = `CLG-${nanoid()}`;
    const now = new Date().toISOString();
    await appendRow(spreadsheetId, "Checklist_Log!A:F", [logId, scheduleId, itemId, session.employeeId, now, photoUrl ?? ""]);

    return NextResponse.json({ success: true, data: { checked: true } });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }, { status: 500 });
  }
}
