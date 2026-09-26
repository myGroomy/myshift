import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { readRows } from "@/lib/google/sheets-data";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: scheduleId } = await params;
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Belum login" } }, { status: 401 });

    const branchId = "CBG001";
    const { spreadsheetId } = await branchSpreadsheet(branchId);

    const scheduleRows = await readRows(spreadsheetId, "Schedules!A:G");
    const scheduleRow = scheduleRows.find((r) => r.values[0] === scheduleId);
    if (!scheduleRow) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Jadwal tidak ditemukan" } }, { status: 404 });

    const scheduleDate = scheduleRow.values[3] ?? "";
    const employeeId = scheduleRow.values[1] ?? "";

    const allScheduleRows = await readRows(spreadsheetId, "Schedules!A:G");
    const prevRow = allScheduleRows
      .filter((r) => r.values[1] === employeeId && (r.values[3] ?? "") < scheduleDate)
      .sort((a, b) => (b.values[3] ?? "").localeCompare(a.values[3] ?? ""))[0];

    if (!prevRow) return NextResponse.json({ success: true, data: null });

    const prevScheduleId = prevRow.values[0] ?? "";
    const logRows = await readRows(spreadsheetId, "Handover_Log!A:F");
    const prevLogs = logRows.filter((l) => l.values[1] === prevScheduleId);
    const existingFields = prevLogs.reduce<Record<string, string>>((acc, l) => {
      acc[l.values[2]] = l.values[3] ?? "";
      return acc;
    }, {});

    const templateRows = await readRows(spreadsheetId, "Handover_Template!A:D");
    const fields = templateRows.slice(1).map((row) => ({
      fieldId: row.values[0] ?? "",
      label: row.values[1] ?? "",
      isRequired: (row.values[2] ?? "FALSE").toUpperCase() === "TRUE",
      value: existingFields[row.values[0] ?? ""] ?? "",
    }));

    return NextResponse.json({ success: true, data: { scheduleId: prevScheduleId, fields } });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }, { status: 500 });
  }
}
