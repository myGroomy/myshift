import { fail, handleRouteError, ok } from "@/lib/api-response";
import { reportTokenMatches, verifyReportToken } from "@/lib/domain/checklist-spec-validation";
import { loadSchedules } from "@/lib/google/ops-data";
import { buildShiftReport } from "@/lib/google/shift-report";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const { token } = await context.params;
    const verified = verifyReportToken(token);
    if (!verified) return fail("NOT_FOUND", "Laporan tidak ditemukan");
    const { records: schedules } = await loadSchedules(verified.branchId);
    const schedule = schedules.find((entry) => entry.scheduleId === verified.scheduleId);
    if (!schedule?.reportGeneratedAt || !reportTokenMatches(token, schedule.reportToken)) {
      return fail("NOT_FOUND", "Laporan tidak ditemukan");
    }
    const report = await buildShiftReport(verified.branchId, verified.scheduleId);
    return report
      ? ok(report, { headers: { "Cache-Control": "no-store" } })
      : fail("NOT_FOUND", "Laporan tidak ditemukan");
  } catch (error) {
    return handleRouteError(error, "Gagal memuat laporan publik");
  }
}
