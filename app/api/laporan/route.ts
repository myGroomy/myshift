import { NextResponse, type NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "@/lib/api-response";
import { getBranches, getEmployees } from "@/lib/google/registry";
import { branchSpreadsheetFrom, usableBranches } from "@/lib/google/branch-data";
import { readRows } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { todayInWIB } from "@/lib/domain/date";
import { toCsv } from "@/lib/domain/csv";
import { reportBranchId } from "@/lib/domain/report-validation";
import { filterReportRows, parseReportType, type ReportType } from "@/lib/domain/report-type-validation";
import { checklistPointComplete } from "@/lib/domain/checklist-spec-validation";
import { isResponse, staffSession } from "@/lib/route-auth";
import type { Branch } from "@/lib/google/registry";
import type { SessionPayload } from "@/lib/session";
import type { ChecklistPointRecord } from "@/lib/google/ops-data";

interface LaporanRow {
  type: string;
  id: string;
  date: string;
  branchName: string;
  employeeId: string;
  employeeName: string;
  details: string;
  status: string;
}

const CSV_HEADERS = ["Tipe", "ID", "Tanggal", "Cabang", "Karyawan", "Nama", "Detail", "Status"];

async function targetBranches(session: SessionPayload, branchFilter: string): Promise<Branch[]> {
  // `usableBranches` also drops branches whose provisioning never finished: laporan reads every
  // branch in a single Promise.all, so one pending branch used to fail the whole report (a branch
  // that is merely not set up yet must not blank out the numbers for the rest).
  const branches = usableBranches(await getBranches());
  const branchId = reportBranchId(session, branchFilter);
  return branchId ? branches.filter((branch) => branch.branchId === branchId) : branches;
}

async function fetchLaporan(input: {
  startDate: string;
  endDate: string;
  branchFilter: string;
  reportType: ReportType;
  session: SessionPayload;
}): Promise<LaporanRow[]> {
  const [branches, employees] = await Promise.all([
    targetBranches(input.session, input.branchFilter),
    getEmployees(),
  ]);
  const employeeNames = new Map(employees.map((employee) => [employee.employeeId, employee.nama]));
  const nameOf = (employeeId: string) => employeeNames.get(employeeId) ?? "";
  const inRange = (date: string) =>
    !((input.startDate && date < input.startDate) || (input.endDate && date > input.endDate));

  const perBranch = await Promise.all(
    branches.map(async (branch): Promise<LaporanRow[]> => {
      const { spreadsheetId } = branchSpreadsheetFrom(branch);
      const [
        scheduleRows,
        swapRows,
        izinRows,
        shiftRows,
        izinCategoryRows,
        incidentCategoryRows,
        sopCategoryRows,
        checklistPointRows,
        checklistLogs,
        handoverTemplates,
        handoverLogs,
        incidentRows,
      ] = await Promise.all([
        readRows(spreadsheetId, branchSheetRange("Schedules")),
        readRows(spreadsheetId, branchSheetRange("Shift_Swaps")),
        readRows(spreadsheetId, branchSheetRange("Izin")),
        readRows(spreadsheetId, branchSheetRange("Shifts")),
        readRows(spreadsheetId, branchSheetRange("Kategori_Izin")),
        readRows(spreadsheetId, branchSheetRange("Kategori_Incident")),
        readRows(spreadsheetId, branchSheetRange("SOP_Kategori")),
        readRows(spreadsheetId, branchSheetRange("Checklist_Point")),
        readRows(spreadsheetId, branchSheetRange("Checklist_Log")),
        readRows(spreadsheetId, branchSheetRange("Handover_Template")),
        readRows(spreadsheetId, branchSheetRange("Handover_Log")),
        readRows(spreadsheetId, branchSheetRange("Incidents")),
      ]);
      const schedulesById = new Map(scheduleRows.map((row) => [row.values[0] ?? "", row.values]));
      const shiftsById = new Map(
        shiftRows.map((row) => [
          row.values[0] ?? "",
          {
            name: row.values[1] ?? row.values[0] ?? "",
            startTime: row.values[2] ?? "",
            endTime: row.values[3] ?? "",
          },
        ]),
      );
      const izinCategoriesById = new Map(
        izinCategoryRows.map((row) => [row.values[0] ?? "", row.values[1] ?? row.values[0] ?? ""]),
      );
      const incidentCategoriesById = new Map(
        incidentCategoryRows.map((row) => [row.values[0] ?? "", row.values[1] ?? row.values[0] ?? ""]),
      );
      const sopCategoriesById = new Map(
        sopCategoryRows.map((row) => [row.values[0] ?? "", row.values[1] ?? row.values[0] ?? ""]),
      );
      const rows: LaporanRow[] = [];
      const checklistPoints: ChecklistPointRecord[] = checklistPointRows.map(({ rowNumber, values }) => ({
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
      const requiredHandoverFields = handoverTemplates.filter(
        (row) => (row.values[2] ?? "FALSE").toUpperCase() === "TRUE"
      );
      const checkedChecklistBySchedule = new Map<string, Map<string, { value: string; photoUrl: string }>>();
      for (const log of checklistLogs) {
        const scheduleId = log.values[1] ?? "";
        const itemValues = checkedChecklistBySchedule.get(scheduleId) ?? new Map();
        itemValues.set(log.values[2] ?? "", {
          value: log.values[3] ?? "",
          photoUrl: log.values[4] ?? "",
        });
        checkedChecklistBySchedule.set(scheduleId, itemValues);
      }
      const filledHandoverBySchedule = new Map<string, Set<string>>();
      for (const log of handoverLogs) {
        const scheduleId = log.values[1] ?? "";
        const fieldId = log.values[2] ?? "";
        if (!(log.values[3] ?? "").trim()) continue;
        const fieldIds = filledHandoverBySchedule.get(scheduleId) ?? new Set<string>();
        fieldIds.add(fieldId);
        filledHandoverBySchedule.set(scheduleId, fieldIds);
      }

      for (const row of scheduleRows) {
        const date = row.values[3] ?? "";
        if (!inRange(date)) continue;
        const employeeId = row.values[1] ?? "";
        rows.push({
          type: "Jadwal",
          id: row.values[0] ?? "",
          date,
          branchName: branch.nama,
          employeeId,
          employeeName: nameOf(employeeId),
          details: `${shiftsById.get(row.values[2] ?? "")?.name ?? row.values[2] ?? ""} · ${shiftsById.get(row.values[2] ?? "")?.startTime ?? ""}–${shiftsById.get(row.values[2] ?? "")?.endTime ?? ""}`,
          status: row.values[4] ?? "scheduled",
        });
      }

      for (const row of swapRows) {
        const schedule = schedulesById.get(row.values[1] ?? "");
        const date = schedule?.[3] ?? "";
        if (!inRange(date)) continue;
        const employeeId = row.values[2] ?? "";
        const partnerId = row.values[3] ?? "";
        const shift = shiftsById.get(schedule?.[2] ?? "");
        const shiftDetails = shift
          ? `${shift.name}${shift.startTime && shift.endTime ? ` (${shift.startTime}–${shift.endTime})` : ""}`
          : schedule?.[2] ?? "shift tidak diketahui";
        rows.push({
          type: "Swap",
          id: row.values[0] ?? "",
          date,
          branchName: branch.nama,
          employeeId,
          employeeName: nameOf(employeeId),
          details: `Tukar dengan ${nameOf(partnerId) || partnerId} · ${date} · ${shiftDetails} · Alasan: ${row.values[4] ?? "—"}`,
          status: row.values[5] ?? "pending",
        });
      }

      for (const row of izinRows) {
        const date = schedulesById.get(row.values[2] ?? "")?.[3] ?? "";
        if (!inRange(date)) continue;
        const employeeId = row.values[1] ?? "";
        rows.push({
          type: "Izin",
          id: row.values[0] ?? "",
          date,
          branchName: branch.nama,
          employeeId,
          employeeName: nameOf(employeeId),
          details: `${izinCategoriesById.get(row.values[3] ?? "") ?? row.values[3] ?? ""} · ${row.values[4] ?? ""}`,
          status: row.values[5] ?? "pending",
        });
      }

      for (const schedule of scheduleRows) {
        const scheduleId = schedule.values[0] ?? "";
        const date = schedule.values[3] ?? "";
        if (!inRange(date)) continue;

        const scheduleShiftId = schedule.values[2] ?? "";
        const activeChecklistItems = checklistPoints.filter((item) =>
          item.active && (item.appliesAllShifts || item.shiftIds.includes(scheduleShiftId))
        );
        const checkedItems = checkedChecklistBySchedule.get(scheduleId) ?? new Map();
        const completedItems = activeChecklistItems.filter((item) => {
          const value = checkedItems.get(item.pointId);
          return checklistPointComplete(item, value?.value ?? "", value?.photoUrl ?? "");
        });
        const completedChecklistItems = completedItems.length;
        const completedPointIds = new Set(completedItems.map((item) => item.pointId));
        const checklistGroups = new Map<string, { completed: number; total: number }>();
        for (const item of activeChecklistItems) {
          const group = checklistGroups.get(item.categoryId) ?? { completed: 0, total: 0 };
          group.total += 1;
          if (completedPointIds.has(item.pointId)) group.completed += 1;
          checklistGroups.set(item.categoryId, group);
        }
        const sopSummary = [...checklistGroups.entries()]
          .map(([categoryId, group]) =>
            `${sopCategoriesById.get(categoryId) ?? categoryId} ${group.completed}/${group.total}`
          )
          .join("; ");
        const incompleteItems = activeChecklistItems
          .filter((item) => !completedPointIds.has(item.pointId))
          .map((item) => item.description);
        const shift = shiftsById.get(scheduleShiftId);
        rows.push({
          type: "Checklist",
          id: scheduleId,
          date,
          branchName: branch.nama,
          employeeId: schedule.values[1] ?? "",
          employeeName: nameOf(schedule.values[1] ?? ""),
          details: [
            shift?.name ?? scheduleShiftId,
            `${completedChecklistItems}/${activeChecklistItems.length} item selesai`,
            sopSummary,
            incompleteItems.length ? `Belum selesai: ${incompleteItems.join(", ")}` : "",
          ].filter(Boolean).join(" · "),
          status: completedChecklistItems === activeChecklistItems.length ? "completed" : "incomplete",
        });

        const filledHandoverFields = filledHandoverBySchedule.get(scheduleId) ?? new Set<string>();
        const completedHandoverFields = requiredHandoverFields.filter((field) =>
          filledHandoverFields.has(field.values[0] ?? "")
        ).length;
        rows.push({
          type: "Handover",
          id: scheduleId,
          date,
          branchName: branch.nama,
          employeeId: schedule.values[1] ?? "",
          employeeName: nameOf(schedule.values[1] ?? ""),
          details: `${completedHandoverFields}/${requiredHandoverFields.length} field wajib terisi`,
          status: completedHandoverFields === requiredHandoverFields.length ? "completed" : "incomplete",
        });
      }

      for (const row of incidentRows) {
        const date = (row.values[9] ?? "").slice(0, 10);
        if (!inRange(date)) continue;
        const employeeId = row.values[8] ?? "";
        rows.push({
          type: "Incident",
          id: row.values[0] ?? "",
          date,
          branchName: branch.nama,
          employeeId,
          employeeName: nameOf(employeeId),
          details: `${incidentCategoriesById.get(row.values[1] ?? "") ?? row.values[1] ?? ""} · ${row.values[2] ?? ""} (${row.values[3] ?? ""})`,
          status: row.values[5] ?? "open",
        });
      }

      return rows;
    })
  );

  return filterReportRows(perBranch.flat().sort((a, b) => b.date.localeCompare(a.date)), input.reportType);
}

// Quoting + formula neutralization live in lib/domain/csv.ts (audit M-11: free-text reasons
// used to be joined raw, which broke the CSV structure and allowed =cmd injection).
function toCsvResponse(rows: LaporanRow[]) {
  const csv = toCsv(
    CSV_HEADERS,
    rows.map((row) => [row.type, row.id, row.date, row.branchName, row.employeeId, row.employeeName, row.details, row.status])
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-${todayInWIB()}.csv"`,
    },
  });
}

function rejectUnsupportedFormat(format: string) {
  // Contract §10 lists xlsx, but no xlsx writer is available; failing loudly beats silently
  // returning JSON that the UI would download as a .csv.
  return fail("VALIDATION_ERROR", `format ${format} belum didukung, gunakan csv atau json`, {
    data: { fields: ["format"] },
  });
}

function readFilters(request: NextRequest, session: SessionPayload) {
  return {
    startDate: request.nextUrl.searchParams.get("startDate") ?? "",
    endDate: request.nextUrl.searchParams.get("endDate") ?? "",
    branchFilter: request.nextUrl.searchParams.get("branchId") ?? "",
    reportType: parseReportType(request.nextUrl.searchParams.get("reportType")),
    session,
  };
}

export async function GET(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const format = request.nextUrl.searchParams.get("format") ?? "json";
    const filters = readFilters(request, auth);
    const rows = await fetchLaporan(filters);
    if (format === "csv") return toCsvResponse(rows);
    if (format !== "json" && format !== "") return rejectUnsupportedFormat(format);
    return ok(rows);
  } catch (error) {
    return handleRouteError(error, "Gagal memuat laporan");
  }
}

export async function POST(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const body = await request.json().catch(() => ({}));
    const format = typeof body.format === "string" ? body.format : "csv";
    const filters = readFilters(request, auth);
    const rows = await fetchLaporan(filters);
    if (format === "csv") return toCsvResponse(rows);
    if (format !== "json") return rejectUnsupportedFormat(format);
    return ok(rows);
  } catch (error) {
    return handleRouteError(error, "Gagal memuat laporan");
  }
}
