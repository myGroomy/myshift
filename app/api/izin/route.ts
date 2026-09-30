import { fail, handleRouteError, ok } from "@/lib/api-response";
import { requiredText } from "@/lib/domain/master-validation";
import { loadCategories, loadIzin, loadSchedules } from "@/lib/google/ops-data";
import { appendRow } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";
import type { ScheduleRecord } from "@/lib/google/ops-data";

export async function GET(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const requestedBranchId = request.nextUrl.searchParams.get("branchId");
    const branchIds = auth.role === "petugas" && !requestedBranchId
      ? auth.branches.map((branch) => branch.branchId)
      : [resolveBranchId(auth, requestedBranchId)];
    const status = request.nextUrl.searchParams.get("status");
    const rowsByBranch = await Promise.all(branchIds.map(async (branchId) => {
      const { records } = await loadIzin(branchId);
      return records.map(({ rowNumber: _row, ...izin }) => ({ ...izin, branchId }));
    }));
    let result = rowsByBranch.flat();
    if (status) result = result.filter((izin) => izin.status === status);
    if (auth.role === "petugas") {
      result = result.filter((izin) => izin.employeeId === auth.employeeId);
    }
    return ok(result);
  } catch (error) {
    return handleRouteError(error, "Gagal memuat pengajuan izin");
  }
}

export async function POST(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const body = await request.json();
    const scheduleId = requiredText(body.scheduleId, "scheduleId");
    const categoryId = requiredText(body.categoryId, "categoryId");
    const note = requiredText(body.note, "note");
    const branchId = resolveBranchId(auth, body.branchId ?? request.nextUrl.searchParams.get("branchId"));

    const [{ spreadsheetId, records: schedules }, { records: izinList }, { records: categories }] =
      await Promise.all([loadSchedules(branchId), loadIzin(branchId), loadCategories(branchId)]);

    const schedule = schedules.find((entry): entry is ScheduleRecord => entry.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan");
    if (schedule.employeeId !== auth.employeeId) {
      return fail("FORBIDDEN", "Hanya pemilik jadwal yang bisa ajukan izin");
    }
    if (schedule.status !== "scheduled") {
      return fail("VALIDATION_ERROR", "Hanya jadwal yang belum dimulai yang bisa diajukan izinnya");
    }
    const category = categories.find((entry) => entry.id === categoryId && entry.aktif);
    if (!category) {
      return fail("VALIDATION_ERROR", "Kategori izin tidak valid", { data: { fields: ["categoryId"] } });
    }
    if (izinList.some((izin) => izin.scheduleId === scheduleId && izin.status === "pending")) {
      return fail("DUPLICATE_SUBMIT", "Sudah ada pengajuan izin pending untuk jadwal ini");
    }

    const izinId = nextSequentialId(izinList.map((izin) => izin.izinId), ID_PREFIX.izin);
    await appendRow(spreadsheetId, branchSheetRange("Izin"), [
      izinId,
      auth.employeeId,
      scheduleId,
      categoryId,
      note,
      "pending",
      "",
      "",
    ]);

    return ok(
      {
        izinId,
        employeeId: auth.employeeId,
        scheduleId,
        categoryId,
        note,
        status: "pending",
        approvedBy: "",
        rejectReason: "",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, "Pengajuan izin tidak valid");
  }
}
