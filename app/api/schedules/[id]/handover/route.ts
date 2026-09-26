import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { readRows, appendRow } from "@/lib/google/sheets-data";
import { validateHandoverFields } from "@/lib/domain/checklist-handover-validation";
import { nanoid } from "@/lib/ids";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: scheduleId } = await params;
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Belum login" } }, { status: 401 });

    const branchId = "CBG001";
    const { spreadsheetId } = await branchSpreadsheet(branchId);

    const templateRows = await readRows(spreadsheetId, "Handover_Template!A:D");
    const fields = templateRows.slice(1).map((row) => ({
      fieldId: row.values[0] ?? "",
      label: row.values[1] ?? "",
      isRequired: (row.values[2] ?? "FALSE").toUpperCase() === "TRUE",
      order: Number(row.values[3] ?? "0") || 0,
    }));

    const logRows = await readRows(spreadsheetId, "Handover_Log!A:F");
    const handoverLogs = logRows.filter((l) => l.values[1] === scheduleId);
    const existingFields = handoverLogs.reduce<Record<string, string>>((acc, l) => {
      acc[l.values[2]] = l.values[3] ?? "";
      return acc;
    }, {});

    const filledFields = new Set(handoverLogs.map((l) => l.values[2]));

    return NextResponse.json({
      success: true,
      data: {
        fields: fields.map((f) => ({ ...f, value: existingFields[f.fieldId] ?? "" })),
        filledCount: filledFields.size,
        total: fields.length,
        completed: fields.every((f) => filledFields.has(f.fieldId)),
      },
    });
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
    const { fields } = body as { fields: { fieldId: string; value: string; isRequired: boolean }[] };

    validateHandoverFields(fields);

    const branchId = "CBG001";
    const { spreadsheetId } = await branchSpreadsheet(branchId);

    for (const field of fields) {
      const logId = `HLG-${nanoid()}`;
      const now = new Date().toISOString();
      await appendRow(spreadsheetId, "Handover_Log!A:F", [logId, scheduleId, field.fieldId, field.value, session.employeeId, now]);
    }

    return NextResponse.json({ success: true, data: { submitted: true } });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const code = err.message === "REQUIRED_FIELD_MISSING" ? "REQUIRED_FIELD_MISSING" : "INTERNAL_ERROR";
    return NextResponse.json({ success: false, error: { code, message: err.message } }, { status: code === "REQUIRED_FIELD_MISSING" ? 400 : 500 });
  }
}
