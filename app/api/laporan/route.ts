import { NextResponse, type NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "@/lib/api-response";
import { getBranches, getEmployees } from "@/lib/google/registry";
import { branchSpreadsheetFrom } from "@/lib/google/branch-data";
import { readRows } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { todayInWIB } from "@/lib/domain/date";
import { toCsv } from "@/lib/domain/csv";
import { branchManagerSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import type { Branch } from "@/lib/google/registry";
import type { SessionPayload } from "@/lib/session";

interface LaporanRow {
  type: string;
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  details: string;
  status: string;
}

const CSV_HEADERS = ["Tipe", "ID", "Tanggal", "Karyawan", "Nama", "Detail", "Status"];

async function targetBranches(session: SessionPayload, branchFilter: string): Promise<Branch[]> {
  const branches = (await getBranches()).filter((branch) => branch.aktif);
  if (session.role === "admin") {
    return branchFilter ? branches.filter((branch) => branch.branchId === branchFilter) : branches;
  }
  const branchId = resolveBranchId(session, branchFilter || null);
  return branches.filter((branch) => branch.branchId === branchId);
}

async function fetchLaporan(input: {
  startDate: string;
  endDate: string;
  branchFilter: string;
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
      const [scheduleRows, swapRows, izinRows] = await Promise.all([
        readRows(spreadsheetId, branchSheetRange("Schedules")),
        readRows(spreadsheetId, branchSheetRange("Shift_Swaps")),
        readRows(spreadsheetId, branchSheetRange("Izin")),
      ]);
      const schedulesById = new Map(scheduleRows.map((row) => [row.values[0] ?? "", row.values]));
      const rows: LaporanRow[] = [];

      for (const row of scheduleRows) {
        const date = row.values[3] ?? "";
        if (!inRange(date)) continue;
        const employeeId = row.values[1] ?? "";
        rows.push({
          type: "Jadwal",
          id: row.values[0] ?? "",
          date,
          employeeId,
          employeeName: nameOf(employeeId),
          details: `${row.values[2] ?? ""} — ${row.values[4] ?? "scheduled"}`,
          status: row.values[4] ?? "scheduled",
        });
      }

      for (const row of swapRows) {
        const date = schedulesById.get(row.values[1] ?? "")?.[3] ?? "";
        if (!inRange(date)) continue;
        const employeeId = row.values[2] ?? "";
        rows.push({
          type: "Swap",
          id: row.values[0] ?? "",
          date,
          employeeId,
          employeeName: nameOf(employeeId),
          details: `${row.values[3] ?? ""} — ${row.values[4] ?? ""}`,
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
          employeeId,
          employeeName: nameOf(employeeId),
          details: `${row.values[3] ?? ""} — ${row.values[4] ?? ""}`,
          status: row.values[5] ?? "pending",
        });
      }

      return rows;
    })
  );

  return perBranch.flat().sort((a, b) => b.date.localeCompare(a.date));
}

// Quoting + formula neutralization live in lib/domain/csv.ts (audit M-11: free-text reasons
// used to be joined raw, which broke the CSV structure and allowed =cmd injection).
function toCsvResponse(rows: LaporanRow[]) {
  const csv = toCsv(
    CSV_HEADERS,
    rows.map((row) => [row.type, row.id, row.date, row.employeeId, row.employeeName, row.details, row.status])
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
    session,
  };
}

export async function GET(request: NextRequest) {
  const auth = await branchManagerSession(request);
  if (isResponse(auth)) return auth;
  try {
    const format = request.nextUrl.searchParams.get("format") ?? "json";
    const rows = await fetchLaporan(readFilters(request, auth));
    if (format === "csv") return toCsvResponse(rows);
    if (format !== "json" && format !== "") return rejectUnsupportedFormat(format);
    return ok(rows);
  } catch (error) {
    return handleRouteError(error, "Gagal memuat laporan");
  }
}

export async function POST(request: NextRequest) {
  const auth = await branchManagerSession(request);
  if (isResponse(auth)) return auth;
  try {
    const body = await request.json().catch(() => ({}));
    const format = typeof body.format === "string" ? body.format : "csv";
    const rows = await fetchLaporan(readFilters(request, auth));
    if (format === "csv") return toCsvResponse(rows);
    if (format !== "json") return rejectUnsupportedFormat(format);
    return ok(rows);
  } catch (error) {
    return handleRouteError(error, "Gagal memuat laporan");
  }
}
