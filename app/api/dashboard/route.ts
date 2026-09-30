import { handleRouteError, ok } from "@/lib/api-response";
import { getBranches } from "@/lib/google/registry";
import { branchSpreadsheetFrom, usableBranches } from "@/lib/google/branch-data";
import { readRows } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { todayInWIB } from "@/lib/domain/date";
import { SHIFT_STATUS } from "@/lib/domain/shift-lifecycle";
import { checklistPointComplete } from "@/lib/domain/checklist-spec-validation";
import type { ChecklistPointRecord } from "@/lib/google/ops-data";
import { adminSession, isResponse, resolveBranchId } from "@/lib/route-auth";
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
  openIncidents: number;
  highIncidents: number;
}

async function summarize(branch: Branch, today: string): Promise<DashboardData> {
  const { spreadsheetId } = branchSpreadsheetFrom(branch);
  const [scheduleRows, checklistLogRows, checklistPointRows, handoverLogRows, swapRows, izinRows, incidentRows] =
    await Promise.all([
      readRows(spreadsheetId, branchSheetRange("Schedules")),
      readRows(spreadsheetId, branchSheetRange("Checklist_Log")),
      readRows(spreadsheetId, branchSheetRange("Checklist_Point")),
      readRows(spreadsheetId, branchSheetRange("Handover_Log")),
      readRows(spreadsheetId, branchSheetRange("Shift_Swaps")),
      readRows(spreadsheetId, branchSheetRange("Izin")),
      readRows(spreadsheetId, branchSheetRange("Incidents")),
    ]);

  const todaySchedules = scheduleRows.filter((row) => row.values[3] === today);
  const todayScheduleIds = new Set(todaySchedules.map((row) => row.values[0] ?? ""));

  const points: ChecklistPointRecord[] = checklistPointRows.map(({ rowNumber, values }) => ({
    rowNumber,
    pointId: values[0] ?? "",
    categoryId: values[1] ?? "",
    description: values[2] ?? "",
    completionType: (values[3] ?? "centang") as ChecklistPointRecord["completionType"],
    unit: values[4] ?? "",
    min: values[5] ?? "",
    max: values[6] ?? "",
    options: (values[7] ?? "").split(",").map((entry) => entry.trim()).filter(Boolean),
    appliesAllShifts: (values[8] ?? "FALSE").toUpperCase() === "TRUE",
    shiftIds: (values[9] ?? "").split(",").map((entry) => entry.trim()).filter(Boolean),
    order: Number(values[10] ?? "0") || 0,
    active: (values[11] ?? "TRUE").toUpperCase() === "TRUE",
    createdAt: values[12] ?? "",
    updatedAt: values[13] ?? "",
  }));
  const latestLog = new Map(
    checklistLogRows.map((row) => [
      `${row.values[1] ?? ""}::${row.values[2] ?? ""}`,
      { value: row.values[3] ?? "", photoUrl: row.values[4] ?? "" },
    ])
  );
  let totalPairs = 0;
  let checkedCount = 0;
  for (const schedule of todaySchedules) {
    const applicable = points.filter((point) =>
      point.active && (point.appliesAllShifts || point.shiftIds.includes(schedule.values[2] ?? ""))
    );
    totalPairs += applicable.length;
    for (const point of applicable) {
      const log = latestLog.get(`${schedule.values[0] ?? ""}::${point.pointId}`);
      if (checklistPointComplete(point, log?.value ?? "", log?.photoUrl ?? "")) checkedCount += 1;
    }
  }

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
    openIncidents: incidentRows.filter((row) => row.values[5] === "open").length,
    highIncidents: incidentRows.filter((row) => row.values[3] === "high" && row.values[5] === "open").length,
  };
}

export async function GET(request: NextRequest) {
  const auth = await adminSession(request);
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
