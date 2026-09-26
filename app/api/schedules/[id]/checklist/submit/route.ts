import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { readRows } from "@/lib/google/sheets-data";
import { nanoid } from "@/lib/ids";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: scheduleId } = await params;
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Belum login" } }, { status: 401 });

    const branchId = "CBG001";
    const { spreadsheetId } = await branchSpreadsheet(branchId);

    const templateRows = await readRows(spreadsheetId, "Checklist_Template!A:G");
    const items = templateRows.slice(1).map((row) => ({
      itemId: row.values[0] ?? "",
      type: row.values[1] ?? "",
      active: (row.values[5] ?? "TRUE").toUpperCase() === "TRUE",
    })).filter((item) => item.active);

    const logRows = await readRows(spreadsheetId, "Checklist_Log!A:F");
    const checkedIds = new Set(logRows.filter((l) => l.values[1] === scheduleId).map((l) => l.values[2]));

    const unchecked = items.filter((item) => !checkedIds.has(item.itemId));
    if (unchecked.length > 0) {
      return NextResponse.json({ success: false, error: { code: "CHECKLIST_INCOMPLETE", message: `${unchecked.length} item belum dicentang`, data: { fields: unchecked.map((i) => i.itemId) } } }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { submitted: true } });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }, { status: 500 });
  }
}
