import { fail, ok } from "@/lib/api-response";
import { assertScheduleOwner } from "@/lib/domain/ops-validation";
import { loadChecklistLogs, loadChecklistTemplates, loadSchedules } from "@/lib/google/ops-data";
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

    const { records: templates } = await loadChecklistTemplates(branchId);
    const items = templates
      .filter((t) => t.active)
      .sort((a, b) => a.order - b.order);

    const { records: logs } = await loadChecklistLogs(branchId, scheduleId);
    const checkedIds = new Set(logs.map((l) => l.itemId));

    const checklistItems = items.map((item) => ({ ...item, checked: checkedIds.has(item.itemId) }));
    const completed = checklistItems.filter((i) => i.checked).length;

    return ok({ items: checklistItems, completed, total: checklistItems.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat checklist";
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

    const body = await request.json() as { itemId: string; photoUrl?: string };
    const { itemId, photoUrl } = body;

    const { records: templates } = await loadChecklistTemplates(branchId);
    const item = templates.find((t) => t.itemId === itemId);
    if (!item) return fail("NOT_FOUND", "Item checklist tidak ditemukan", 404);
    if (item.requiresPhoto && !photoUrl?.trim()) return fail("PHOTO_REQUIRED", "Item ini wajib menyertakan foto", 400);

    const { appendChecklistLog } = await import("@/lib/google/ops-data");
    const { branchSpreadsheet } = await import("@/lib/google/branch-data");
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const logId = `CLG-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    await appendChecklistLog(spreadsheetId, [logId, scheduleId, itemId, auth.employeeId, now, photoUrl ?? ""]);

    return ok({ checked: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan checklist";
    const code = message.includes("Cabang") ? "FORBIDDEN" : "INTERNAL_ERROR";
    return fail(code, message, code === "FORBIDDEN" ? 403 : 500);
  }
}
