import { handleRouteError, ok } from "@/lib/api-response";
import { getBranches } from "@/lib/google/registry";
import { branchSpreadsheetFrom, usableBranches } from "@/lib/google/branch-data";
import { readRows } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { todayInWIB } from "@/lib/domain/date";
import { SHIFT_STATUS } from "@/lib/domain/shift-lifecycle";
import { branchManagerSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import type { NextRequest } from "next/server";
import type { Branch } from "@/lib/google/registry";

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

async function summarize(branch: Branch, today: string): Promise<DashboardData> {
  const { spreadsheetId } = branchSpreadsheetFrom(branch);
  const [scheduleRows, checklistLogRows, checklistTemplateRows, handoverLogRows, swapRows, izinRows] =
    await Promise.all([
      readRows(spreadsheetId, branchSheetRange("Schedules")),
      readRows(spreadsheetId, branchSheetRange("Checklist_Log")),
      readRows(spreadsheetId, branchSheetRange("Checklist_Template")),
      readRows(spreadsheetId, branchSheetRange("Handover_Log")),
      readRows(spreadsheetId, branchSheetRange("Shift_Swaps")),
      readRows(spreadsheetId, branchSheetRange("Izin")),
    ]);

  const todaySchedules = scheduleRows.filter((row) => row.values[3] === today);
  const todayScheduleIds = new Set(todaySchedules.map((row) => row.values[0] ?? ""));

  // Percentage of (schedule x active item) pairs that are checked — counting shifts that have
  // at least one tick used to report 100% for a 1/10 checklist (audit M-3).
  const activeItemIds = checklistTemplateRows
    .filter((row) => (row.values[5] ?? "TRUE").toUpperCase() === "TRUE")
    .map((row) => row.values[0] ?? "");
  const checkedPairs = new Set(
    checklistLogRows
      .filter((row) => todayScheduleIds.has(row.values[1] ?? ""))
      .map((row) => `${row.values[1]}::${row.values[2]}`)
  );
  const totalPairs = todaySchedules.length * activeItemIds.length;
  const checkedCount = todaySchedules.reduce(
    (total, row) =>
      total + activeItemIds.filter((itemId) => checkedPairs.has(`${row.values[0]}::${itemId}`)).length,
    0
  );

  return {
    branchId: branch.branchId,
    branchName: branch.nama,
    shiftsToday: todaySchedules.length,
    shiftsStarted: todaySchedules.filter((row) => row.values[4] === SHIFT_STATUS.started).length,
    shiftsCompleted: todaySchedules.filter((row) => row.values[4] === SHIFT_STATUS.completed).length,
    checklistPercent: totalPairs > 0 ? Math.round((checkedCount / totalPairs) * 100) : 0,
    handoverCount: handoverLogRows.filter((row) => todayScheduleIds.has(row.values[1] ?? "")).length,
    pendingSwaps: swapRows.filter((row) => row.values[5] === "pending").length,
    pendingIzins: izinRows.filter((row) => row.values[5] === "pending").length,
  };
}

export async function GET(request: NextRequest) {
  const auth = await branchManagerSession(request);
  if (isResponse(auth)) return auth;
  try {
    // usableBranches() drops inactive *and* not-yet-provisioned branches, logging each one —
    // reading a pending branch would throw and (with allSettled) quietly thin the numbers.
    const branches = usableBranches(await getBranches());
    const targetBranches =
      auth.role === "admin"
        ? branches
        : branches.filter((branch) =>
            branch.branchId === resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"))
          );

    // "Today" is a WIB calendar date; toISOString() would report yesterday until 07:00 WIB.
    const today = todayInWIB();

    // Branches are summarized in parallel instead of one serial round-trip at a time, and the
    // already-fetched branch list is reused instead of re-reading the registry per branch.
    const settled = await Promise.allSettled(targetBranches.map((branch) => summarize(branch, today)));
    const results = settled.flatMap((outcome, index) => {
      if (outcome.status === "fulfilled") return [outcome.value];
      // One misconfigured branch must not blank out the whole dashboard.
      console.error(`[myshift] dashboard skipped branch ${targetBranches[index].branchId}:`, outcome.reason);
      return [];
    });

    return ok(results);
  } catch (error) {
    return handleRouteError(error, "Gagal memuat dashboard");
  }
}
