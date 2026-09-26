import { fail, ok } from "@/lib/api-response";
import { assertCanStartShift, assertScheduleOwner } from "@/lib/domain/ops-validation";
import { loadSchedules, saveSchedule } from "@/lib/google/ops-data";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId, records } = await loadSchedules(branchId);
    const schedule = records.find((entry) => entry.scheduleId === id);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan", 404);
    assertScheduleOwner(schedule.employeeId, auth.employeeId);
    assertCanStartShift(schedule.status);
    const startedAt = new Date().toISOString();
    await saveSchedule(spreadsheetId, { ...schedule, status: "started", startedAt, updatedVia: "myshift" });
    return ok({ scheduleId: id, startedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tidak bisa memulai shift";
    const code = message.includes("Spreadsheet") ? "SHEETS_SETUP_REQUIRED" : "INVALID_REQUEST";
    return fail(code, message, code === "SHEETS_SETUP_REQUIRED" ? 503 : 400);
  }
}