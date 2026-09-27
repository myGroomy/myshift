import { fail, handleRouteError, ok } from "@/lib/api-response";
import { assertScheduleOwner, assertShiftNotClosed } from "@/lib/domain/ops-validation";
import { nowIso } from "@/lib/domain/date";
import { optionalUrl, requiredText } from "@/lib/domain/master-validation";
import {
  appendChecklistLogIfAbsent,
  loadChecklistLogs,
  loadChecklistTemplates,
  loadSchedules,
} from "@/lib/google/ops-data";
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
    if (auth.role === "karyawan") assertScheduleOwner(schedule.employeeId, auth.employeeId);

    const { records: templates } = await loadChecklistTemplates(branchId);
    const items = templates.filter((item) => item.active).sort((a, b) => a.order - b.order);

    const { records: logs } = await loadChecklistLogs(branchId, scheduleId);
    const checkedIds = new Set(logs.map((log) => log.itemId));

    // rowNumber is an internal Sheets detail and stays server-side.
    const checklistItems = items.map(({ rowNumber: _rowNumber, ...item }) => ({
      ...item,
      checked: checkedIds.has(item.itemId),
    }));
    const completed = checklistItems.filter((item) => item.checked).length;

    return ok({ items: checklistItems, completed, total: checklistItems.length });
  } catch (error) {
    return handleRouteError(error, "Gagal memuat checklist");
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
    assertScheduleOwner(schedule.employeeId, auth.employeeId);
    assertShiftNotClosed(schedule.status);

    const body = await request.json();
    const itemId = requiredText(body.itemId, "itemId");
    const photoUrl = optionalUrl(body.photoUrl, "photoUrl");

    const { spreadsheetId, records: templates } = await loadChecklistTemplates(branchId);
    // Only active items can be checked — the sheet is the source of truth, not the client.
    const item = templates.find((template) => template.itemId === itemId && template.active);
    if (!item) return fail("NOT_FOUND", "Item checklist tidak ditemukan");
    if (item.requiresPhoto && !photoUrl) {
      return fail("VALIDATION_ERROR", "Item ini wajib menyertakan foto", { data: { fields: ["photoUrl"] } });
    }

    const added = await appendChecklistLogIfAbsent({
      spreadsheetId,
      scheduleId,
      itemId,
      checkedBy: auth.employeeId,
      checkedAt: nowIso(),
      photoUrl,
    });

    return ok({ checked: true, alreadyChecked: !added });
  } catch (error) {
    return handleRouteError(error, "Gagal menyimpan checklist");
  }
}
