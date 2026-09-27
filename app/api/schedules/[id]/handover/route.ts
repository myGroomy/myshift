import { fail, ok } from "@/lib/api-response";
import { assertScheduleOwner } from "@/lib/domain/ops-validation";
import { validateHandoverFields } from "@/lib/domain/checklist-handover-validation";
import { loadHandoverLogs, loadHandoverTemplates, loadSchedules } from "@/lib/google/ops-data";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const { id: scheduleId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { records: schedules } = await loadSchedules(branchId);
    const schedule = schedules.find((s) => s.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan", 404);
    if (auth.role === "karyawan") assertScheduleOwner(schedule.employeeId, auth.employeeId);

    const { records: templates } = await loadHandoverTemplates(branchId);
    const fields = templates.sort((a, b) => a.order - b.order);

    const { records: logs } = await loadHandoverLogs(branchId, scheduleId);
    const existingFields = logs.reduce<Record<string, string>>((acc, l) => {
      acc[l.fieldId] = l.isi;
      return acc;
    }, {});
    const filledFields = new Set(logs.map((l) => l.fieldId));

    return ok({
      fields: fields.map((f) => ({ ...f, value: existingFields[f.fieldId] ?? "" })),
      filledCount: filledFields.size,
      total: fields.length,
      completed: fields.every((f) => filledFields.has(f.fieldId)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat handover";
    const code = message.includes("Cabang") ? "FORBIDDEN" : "INTERNAL_ERROR";
    return fail(code, message, code === "FORBIDDEN" ? 403 : 500);
  }
}

export async function POST(request: NextRequest, context: Context) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const { id: scheduleId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { records: schedules } = await loadSchedules(branchId);
    const schedule = schedules.find((s) => s.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan", 404);
    assertScheduleOwner(schedule.employeeId, auth.employeeId);

    const body = await request.json() as { fields: { fieldId: string; value: string; isRequired: boolean }[] };
    const { fields } = body;
    validateHandoverFields(fields);

    const { appendHandoverLog } = await import("@/lib/google/ops-data");
    const { branchSpreadsheet } = await import("@/lib/google/branch-data");
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const now = new Date().toISOString();

    for (const field of fields) {
      const logId = `HLG-${crypto.randomUUID().slice(0, 8)}`;
      await appendHandoverLog(spreadsheetId, [logId, scheduleId, field.fieldId, field.value, auth.employeeId, now]);
    }

    return ok({ submitted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan handover";
    const code = message === "REQUIRED_FIELD_MISSING" ? "REQUIRED_FIELD_MISSING" : message.includes("Cabang") ? "FORBIDDEN" : "INTERNAL_ERROR";
    return fail(code, message, code === "REQUIRED_FIELD_MISSING" ? 400 : code === "FORBIDDEN" ? 403 : 500);
  }
}
