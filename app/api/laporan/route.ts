import { NextRequest, NextResponse } from "next/server";
import { ok, fail } from "@/lib/api-response";
import { getBranches } from "@/lib/google/registry";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { readRows } from "@/lib/google/sheets-data";
import { getSession } from "@/lib/auth";
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

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return fail("UNAUTHORIZED", "Session tidak valid", 401);

    const startDate = req.nextUrl.searchParams.get("startDate") ?? "";
    const endDate = req.nextUrl.searchParams.get("endDate") ?? "";
    const branchFilter = req.nextUrl.searchParams.get("branchId") ?? "";

    const branches = (await getBranches()).filter((b) => b.aktif);
    const targetBranches = session.role === "admin"
      ? (branchFilter ? branches.filter((b) => b.branchId === branchFilter) : branches)
      : branches.filter((b) => b.branchId === session.activeBranchId);

    const results: LaporanRow[] = [];

    for (const branch of targetBranches) {
      const { spreadsheetId } = await branchSpreadsheet(branch.branchId);
      const [scheduleRows, swapRows, izinRows] = await Promise.all([
        readRows(spreadsheetId, "Schedules!A:G"),
        readRows(spreadsheetId, "Shift_Swaps!A:H"),
        readRows(spreadsheetId, "Izin!A:H"),
      ]);

      for (const row of scheduleRows) {
        const date = row.values[3] ?? "";
        if ((startDate && date < startDate) || (endDate && date > endDate)) continue;
        results.push({
          type: "Jadwal",
          id: row.values[0] ?? "",
          date,
          employeeId: row.values[1] ?? "",
          employeeName: "",
          details: `${row.values[2] ?? ""} — ${row.values[4] ?? "scheduled"}`,
          status: row.values[4] ?? "scheduled",
        });
      }

      for (const row of swapRows) {
        const scheduleId = row.values[1] ?? "";
        const scheduleRow = scheduleRows.find((r) => r.values[0] === scheduleId);
        const date = scheduleRow?.values[3] ?? "";
        if ((startDate && date < startDate) || (endDate && date > endDate)) continue;
        results.push({
          type: "Swap",
          id: row.values[0] ?? "",
          date,
          employeeId: row.values[2] ?? "",
          employeeName: "",
          details: `${row.values[3] ?? ""} — ${row.values[4] ?? ""}`,
          status: row.values[5] ?? "pending",
        });
      }

      for (const row of izinRows) {
        const scheduleId = row.values[2] ?? "";
        const scheduleRow = scheduleRows.find((r) => r.values[0] === scheduleId);
        const date = scheduleRow?.values[3] ?? "";
        if ((startDate && date < startDate) || (endDate && date > endDate)) continue;
        results.push({
          type: "Izin",
          id: row.values[0] ?? "",
          date,
          employeeId: row.values[1] ?? "",
          employeeName: "",
          details: `${row.values[3] ?? ""} — ${row.values[4] ?? ""}`,
          status: row.values[5] ?? "pending",
        });
      }
    }

    results.sort((a, b) => b.date.localeCompare(a.date));
    return ok(results);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return fail("INTERNAL_ERROR", err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return fail("UNAUTHORIZED", "Session tidak valid", 401);
    const { format } = await req.json() as { format?: string };

    const startDate = req.nextUrl.searchParams.get("startDate") ?? "";
    const endDate = req.nextUrl.searchParams.get("endDate") ?? "";
    const branchFilter = req.nextUrl.searchParams.get("branchId") ?? "";

    const data = await fetchLaporan(startDate, endDate, branchFilter, session);

    if (format === "csv" || !format) {
      const csv = convertToCSV(data);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="laporan-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return ok(data);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return fail("INTERNAL_ERROR", err.message, 500);
  }
}

async function fetchLaporan(startDate: string, endDate: string, branchFilter: string, session: SessionPayload) {
  const branches = (await getBranches()).filter((b) => b.aktif);
  const targetBranches = session.role === "admin"
    ? (branchFilter ? branches.filter((b) => b.branchId === branchFilter) : branches)
    : branches.filter((b) => b.branchId === session.activeBranchId);

  const results: LaporanRow[] = [];

  for (const branch of targetBranches) {
    const { spreadsheetId } = await branchSpreadsheet(branch.branchId);
    const [scheduleRows, swapRows, izinRows] = await Promise.all([
      readRows(spreadsheetId, "Schedules!A:G"),
      readRows(spreadsheetId, "Shift_Swaps!A:H"),
      readRows(spreadsheetId, "Izin!A:H"),
    ]);

    for (const row of scheduleRows) {
      const date = row.values[3] ?? "";
      if ((startDate && date < startDate) || (endDate && date > endDate)) continue;
      results.push({ type: "Jadwal", id: row.values[0] ?? "", date, employeeId: row.values[1] ?? "", employeeName: "", details: `${row.values[2] ?? ""} — ${row.values[4] ?? "scheduled"}`, status: row.values[4] ?? "scheduled" });
    }
    for (const row of swapRows) {
      const scheduleId = row.values[1] ?? "";
      const scheduleRow = scheduleRows.find((r) => r.values[0] === scheduleId);
      const date = scheduleRow?.values[3] ?? "";
      if ((startDate && date < startDate) || (endDate && date > endDate)) continue;
      results.push({ type: "Swap", id: row.values[0] ?? "", date, employeeId: row.values[2] ?? "", employeeName: "", details: `${row.values[3] ?? ""} — ${row.values[4] ?? ""}`, status: row.values[5] ?? "pending" });
    }
    for (const row of izinRows) {
      const scheduleId = row.values[2] ?? "";
      const scheduleRow = scheduleRows.find((r) => r.values[0] === scheduleId);
      const date = scheduleRow?.values[3] ?? "";
      if ((startDate && date < startDate) || (endDate && date > endDate)) continue;
      results.push({ type: "Izin", id: row.values[0] ?? "", date, employeeId: row.values[1] ?? "", employeeName: "", details: `${row.values[3] ?? ""} — ${row.values[4] ?? ""}`, status: row.values[5] ?? "pending" });
    }
  }

  results.sort((a, b) => b.date.localeCompare(a.date));
  return results;
}

function convertToCSV(data: LaporanRow[]): string {
  const headers = ["Tipe", "ID", "Tanggal", "Karyawan", "Detail", "Status"];
  const rows = data.map((r) => [r.type, r.id, r.date, r.employeeId, r.details, r.status].join(","));
  return [headers.join(","), ...rows].join("\n");
}
