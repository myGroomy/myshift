import { fail, handleRouteError, ok } from "@/lib/api-response";
import { getBranches, getEmployees } from "@/lib/google/registry";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { deleteRowById, readRows, replaceRowById } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { scheduleDate } from "@/lib/domain/schedule-validation";
import { adminSession, isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import { DomainError } from "@/lib/error-codes";
import type { NextRequest } from "next/server";
import type { SessionPayload } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

async function branchTargets(auth: SessionPayload, requested: unknown): Promise<string[]> {
  if (typeof requested === "string" && requested.trim()) return [resolveBranchId(auth, requested)];
  if (auth.role === "admin") {
    return (await getBranches()).filter((branch) => branch.aktif).map((branch) => branch.branchId);
  }
  return [resolveBranchId(auth, null)];
}

async function locate(auth: SessionPayload, requested: unknown, scheduleId: string) {
  const targets = await branchTargets(auth, requested);
  const matches = await Promise.all(
    targets.map(async (branchId) => {
      const { spreadsheetId } = await branchSpreadsheet(branchId);
      const [scheduleRows, shiftRows] = await Promise.all([
        readRows(spreadsheetId, branchSheetRange("Schedules")),
        readRows(spreadsheetId, branchSheetRange("Shifts")),
      ]);
      const row = scheduleRows.find((entry) => entry.values[0] === scheduleId);
      return row ? { branchId, spreadsheetId, row, shiftRows } : null;
    })
  );
  return matches.find((match) => match !== null) ?? null;
}

export async function GET(request: NextRequest, context: Context) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const match = await locate(auth, request.nextUrl.searchParams.get("branchId"), id);
    if (!match) return fail("NOT_FOUND", "Jadwal tidak ditemukan");

    const values = match.row.values;
    const employeeId = values[1] ?? "";
    if (auth.role === "karyawan" && employeeId !== auth.employeeId) {
      return fail("FORBIDDEN", "Hanya pemilik jadwal yang boleh melihat detail ini");
    }

    const employee = (await getEmployees()).find((entry) => entry.employeeId === employeeId);
    const shift = match.shiftRows.find((entry) => entry.values[0] === values[2]);

    return ok({
      scheduleId: values[0] ?? "",
      employeeId,
      employeeName: employee?.nama ?? "",
      shiftId: values[2] ?? "",
      shiftName: shift?.values[1] ?? "",
      date: values[3] ?? "",
      status: values[4] ?? "scheduled",
      startedAt: values[5] ?? "",
      branchId: match.branchId,
      reportGeneratedAt: values[7] ?? "",
    });
  } catch (error) {
    return handleRouteError(error, "Gagal memuat jadwal");
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const body = await request.json();
    const branchId = resolveBranchId(auth, body.branchId ?? request.nextUrl.searchParams.get("branchId"));
    const match = await locate(auth, branchId, id);
    if (!match) return fail("NOT_FOUND", "Jadwal tidak ditemukan");

    const values = [...match.row.values];
    values[0] = id;

    if (body.employeeId !== undefined) {
      const employeeId = String(body.employeeId).trim();
      const employee = (await getEmployees()).find((entry) => entry.employeeId === employeeId && entry.aktif);
      if (!employee) {
        throw new DomainError("VALIDATION_ERROR", "Karyawan tidak ditemukan atau nonaktif", {
          data: { fields: ["employeeId"] },
        });
      }
      if (employee.cabangAktif !== branchId && !employee.cabangTerafiliasi.includes(branchId)) {
        throw new DomainError("VALIDATION_ERROR", "Karyawan tidak terafiliasi dengan cabang ini", {
          data: { fields: ["employeeId"] },
        });
      }
      values[1] = employeeId;
    }

    if (body.shiftId !== undefined) {
      const shiftId = String(body.shiftId).trim();
      if (!match.shiftRows.some((entry) => entry.values[0] === shiftId)) {
        throw new DomainError("VALIDATION_ERROR", "Shift tidak ditemukan", { data: { fields: ["shiftId"] } });
      }
      values[2] = shiftId;
    }

    if (body.date !== undefined) values[3] = scheduleDate(body.date);

    const saved = await replaceRowById(match.spreadsheetId, "Schedules", branchSheetRange("Schedules"), id, values);
    if (!saved) return fail("NOT_FOUND", "Jadwal tidak ditemukan");

    return ok({
      scheduleId: id,
      employeeId: values[1],
      shiftId: values[2],
      date: values[3],
      status: values[4] ?? "scheduled",
    });
  } catch (error) {
    return handleRouteError(error, "Jadwal tidak valid");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const deleted = await deleteRowById(spreadsheetId, "Schedules", branchSheetRange("Schedules"), id);
    if (!deleted) return fail("NOT_FOUND", "Jadwal tidak ditemukan");
    return ok({ scheduleId: id, deleted: true });
  } catch (error) {
    return handleRouteError(error, "Gagal menghapus jadwal");
  }
}
