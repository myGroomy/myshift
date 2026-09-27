import { fail, ok } from "@/lib/api-response";
import { assertScheduleOwner } from "@/lib/domain/ops-validation";
import { loadChecklistLogs, loadChecklistTemplates, loadSchedules } from "@/lib/google/ops-data";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

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

    const { records: templates } = await loadChecklistTemplates(branchId);
    const activeItems = templates.filter((t) => t.active);

    const { records: logs } = await loadChecklistLogs(branchId, scheduleId);
    const checkedIds = new Set(logs.map((l) => l.itemId));

    const unchecked = activeItems.filter((item) => !checkedIds.has(item.itemId));
    if (unchecked.length > 0) {
      return fail("CHECKLIST_INCOMPLETE", `${unchecked.length} item belum dicentang`, 400, { fields: unchecked.map((i) => i.itemId) });
    }

    return ok({ submitted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal submit checklist";
    const code = message.includes("Cabang") ? "FORBIDDEN" : "INTERNAL_ERROR";
    return fail(code, message, code === "FORBIDDEN" ? 403 : 500);
  }
}
