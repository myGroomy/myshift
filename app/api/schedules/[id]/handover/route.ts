import { fail, handleRouteError, ok } from "@/lib/api-response";
import { assertScheduleAccess } from "@/lib/domain/ops-validation";
import { nowIso } from "@/lib/domain/date";
import { normalizeHandoverSubmission } from "@/lib/domain/checklist-handover-validation";
import { loadHandoverLogs, loadHandoverTemplates, loadSchedules, saveHandoverLogs } from "@/lib/google/ops-data";
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
    const schedule = schedules.find((entry) => entry.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan");
    assertScheduleAccess({ role: auth.role, scheduleEmployeeId: schedule.employeeId, actorId: auth.employeeId });

    const { records: templates } = await loadHandoverTemplates(branchId);
    const fields = [...templates].sort((a, b) => a.order - b.order);

    const { records: logs } = await loadHandoverLogs(branchId, scheduleId);
    const existingFields = new Map(logs.map((log) => [log.fieldId, log.isi]));

    return ok({
      fields: fields.map(({ rowNumber: _rowNumber, ...field }) => ({
        ...field,
        value: existingFields.get(field.fieldId) ?? "",
      })),
      filledCount: [...existingFields.values()].filter((value) => value.trim()).length,
      total: fields.length,
      completed: fields.every((field) => !field.isRequired || Boolean(existingFields.get(field.fieldId)?.trim())),
    });
  } catch (error) {
    return handleRouteError(error, "Gagal memuat handover");
  }
}

export async function POST(request: NextRequest, context: Context) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const { id: scheduleId } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { records: schedules } = await loadSchedules(branchId);
    const schedule = schedules.find((entry) => entry.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan");
    assertScheduleAccess({ role: auth.role, scheduleEmployeeId: schedule.employeeId, actorId: auth.employeeId });

    const body = await request.json();
    const { spreadsheetId, records: templates } = await loadHandoverTemplates(branchId);

    // Required flags come from Handover_Template, never from the request body (audit H-7).
    const entries = normalizeHandoverSubmission({
      templates: templates.map((template) => ({
        fieldId: template.fieldId,
        isRequired: template.isRequired,
      })),
      submitted: body.fields,
    });

    // Derive snapshot fields from the template at write time, so later template edits
    // cannot retroactively change what a historical handover was supposed to contain.
    const templateByField = new Map(templates.map((template) => [template.fieldId, template]));
    const fieldPublicIdSnapshot = entries.map((entry) => templateByField.get(entry.fieldId)?.fieldId ?? entry.fieldId).join(",");
    const labelSnapshot = entries.map((entry) => templateByField.get(entry.fieldId)?.label ?? "").join(",");
    const isRequiredSnapshot = entries.every((entry) => templateByField.get(entry.fieldId)?.isRequired ?? false);

    await saveHandoverLogs({
      spreadsheetId,
      scheduleId,
      entries,
      fieldPublicIdSnapshot,
      labelSnapshot,
      isRequiredSnapshot,
      createdBy: auth.employeeId,
      createdAt: nowIso(),
      auditAfterReport: Boolean(schedule.reportGeneratedAt),
    });

    return ok({ submitted: true, savedFields: entries.length });
  } catch (error) {
    return handleRouteError(error, "Gagal menyimpan handover");
  }
}
