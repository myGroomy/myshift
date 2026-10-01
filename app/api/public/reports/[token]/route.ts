import { fail, handleRouteError, ok } from "@/lib/api-response";
import { reportTokenMatches, verifyReportToken } from "@/lib/domain/checklist-spec-validation";
import { branchSpreadsheetFrom } from "@/lib/google/branch-data";
import { getShiftReportRegistryData } from "@/lib/google/registry";
import { buildShiftReport, loadShiftReportData } from "@/lib/google/shift-report";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const { token } = await context.params;
    const verified = verifyReportToken(token);
    if (!verified) return fail("NOT_FOUND", "Laporan tidak ditemukan");

    const { branch, employees } = await getShiftReportRegistryData(verified.branchId);
    if (!branch) return fail("NOT_FOUND", "Laporan tidak ditemukan");
    const { spreadsheetId } = branchSpreadsheetFrom(branch);
    const data = await loadShiftReportData(spreadsheetId);
    const schedule = data.schedules.find((entry) => entry.scheduleId === verified.scheduleId);
    if (!schedule?.reportGeneratedAt || !reportTokenMatches(token, schedule.reportToken)) {
      return fail("NOT_FOUND", "Laporan tidak ditemukan");
    }

    return ok(buildShiftReport(branch, employees, data, schedule), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return handleRouteError(error, "Gagal memuat laporan publik");
  }
}
