import { ok, fail } from "@/lib/api-response";
import { getBranches } from "@/lib/google/registry";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { readRows } from "@/lib/google/sheets-data";
import { getSession } from "@/lib/auth";
import type { NextRequest } from "next/server";

interface DashboardData {
  branchId: string;
  branchName: string;
  shiftsToday: number;
  shiftsStarted: number;
  shiftsCompleted: number;
  checklistPercent: number;
  handoverCount: number;
  pendingSwaps: number;
  pendingIzins: number;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return fail("UNAUTHORIZED", "Session tidak valid", 401);

    const branches = (await getBranches()).filter((b) => b.aktif);
    const targetBranches = session.role === "admin"
      ? branches
      : branches.filter((b) => b.branchId === session.activeBranchId);

    const today = new Date().toISOString().slice(0, 10);
    const results: DashboardData[] = [];

    for (const branch of targetBranches) {
      const { spreadsheetId } = await branchSpreadsheet(branch.branchId);
      const [scheduleRows, checklistLogRows, handoverLogRows, swapRows, izinRows] = await Promise.all([
        readRows(spreadsheetId, "Schedules!A:G"),
        readRows(spreadsheetId, "Checklist_Log!A:F"),
        readRows(spreadsheetId, "Handover_Log!A:F"),
        readRows(spreadsheetId, "Shift_Swaps!A:H"),
        readRows(spreadsheetId, "Izin!A:H"),
      ]);

      const todaySchedules = scheduleRows.filter((r) => r.values[3] === today);
      const shiftsToday = todaySchedules.length;
      const shiftsStarted = todaySchedules.filter((r) => r.values[4] === "started").length;
      const shiftsCompleted = todaySchedules.filter((r) => r.values[4] === "completed").length;

      const todayScheduleIds = new Set(todaySchedules.map((r) => r.values[0]));
      const checkedScheduleIds = new Set(checklistLogRows.filter((l) => todayScheduleIds.has(l.values[1])).map((l) => l.values[1]));
      const totalChecklistItems = checklistLogRows.filter((l) => todayScheduleIds.has(l.values[1])).length;
      const checklistPercent = todaySchedules.length > 0 ? Math.round((checkedScheduleIds.size / todaySchedules.length) * 100) : 0;

      const handoverCount = handoverLogRows.filter((l) => todayScheduleIds.has(l.values[1])).length;
      const pendingSwaps = swapRows.filter((r) => r.values[5] === "pending").length;
      const pendingIzins = izinRows.filter((r) => r.values[5] === "pending").length;

      results.push({
        branchId: branch.branchId,
        branchName: branch.nama,
        shiftsToday,
        shiftsStarted,
        shiftsCompleted,
        checklistPercent,
        handoverCount,
        pendingSwaps,
        pendingIzins,
      });
    }

    return ok(results);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return fail("INTERNAL_ERROR", err.message, 500);
  }
}


