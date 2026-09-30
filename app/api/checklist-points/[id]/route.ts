import { fail, handleRouteError, ok } from "@/lib/api-response";
import { normalizeChecklistPoint, serializeChecklistPoint } from "@/lib/domain/checklist-spec-validation";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { loadChecklistPoints, loadSopCategories } from "@/lib/google/ops-data";
import { deleteRowById, readRows, replaceRowById } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { adminSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import type { NextRequest } from "next/server";
import type { ChecklistPointRecord } from "@/lib/google/ops-data";

type Context = { params: Promise<{ id: string }> };

async function validReferences(branchId: string, categoryId: string, shiftIds: string[]) {
  const [{ records: categories }, { spreadsheetId }] = await Promise.all([
    loadSopCategories(branchId),
    branchSpreadsheet(branchId),
  ]);
  if (!categories.some((category) => category.categoryId === categoryId && category.active)) {
    return false;
  }
  const shiftRows = shiftIds.length ? await readRows(spreadsheetId, branchSheetRange("Shifts")) : [];
  const knownShifts = new Set(shiftRows.map((row) => row.values[0] ?? ""));
  return shiftIds.every((shiftId) => knownShifts.has(shiftId));
}

function toInput(point: ChecklistPointRecord) {
  return {
    categoryId: point.categoryId,
    description: point.description,
    completionType: point.completionType,
    unit: point.unit,
    min: point.min,
    max: point.max,
    options: point.options,
    appliesAllShifts: point.appliesAllShifts,
    shiftIds: point.shiftIds,
    order: point.order,
  };
}

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId, records: points } = await loadChecklistPoints(branchId);
    const point = points.find((entry) => entry.pointId === id);
    if (!point) return fail("NOT_FOUND", "Checklist point tidak ditemukan");
    const body = await request.json() as Record<string, unknown>;
    const normalized = normalizeChecklistPoint({ ...toInput(point), ...body });
    if (!(await validReferences(branchId, normalized.categoryId, normalized.shiftIds))) {
      return fail("VALIDATION_ERROR", "Kategori SOP atau shift tidak ditemukan", {
        data: { fields: ["categoryId", "shiftIds"] },
      });
    }
    const active = body.active === undefined
      ? point.active
      : typeof body.active === "boolean"
        ? body.active
        : null;
    if (active === null) return fail("VALIDATION_ERROR", "active harus boolean", { data: { fields: ["active"] } });
    const hasLogs = (await readRows(spreadsheetId, branchSheetRange("Checklist_Log")))
      .some((row) => row.values[2] === id);
    const saved = await replaceRowById(
      spreadsheetId,
      "Checklist_Point",
      branchSheetRange("Checklist_Point"),
      id,
      serializeChecklistPoint(normalized, id, active),
    );
    if (!saved) return fail("NOT_FOUND", "Checklist point tidak ditemukan");
    return ok({ pointId: id, ...normalized, active, hasLogs });
  } catch (error) {
    return handleRouteError(error, "Gagal mengubah checklist point");
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const hasLogs = (await readRows(spreadsheetId, branchSheetRange("Checklist_Log")))
      .some((row) => row.values[2] === id);
    if (hasLogs) {
      const rows = await readRows(spreadsheetId, branchSheetRange("Checklist_Point"));
      const row = rows.find((entry) => entry.values[0] === id);
      if (!row) return fail("NOT_FOUND", "Checklist point tidak ditemukan");
      const values = [...row.values];
      while (values.length < 12) values.push("");
      values[11] = "FALSE";
      const saved = await replaceRowById(spreadsheetId, "Checklist_Point", branchSheetRange("Checklist_Point"), id, values);
      if (!saved) return fail("NOT_FOUND", "Checklist point tidak ditemukan");
      return ok({ pointId: id, deleted: false, active: false });
    }
    const deleted = await deleteRowById(spreadsheetId, "Checklist_Point", branchSheetRange("Checklist_Point"), id);
    if (!deleted) return fail("NOT_FOUND", "Checklist point tidak ditemukan");
    return ok({ pointId: id, deleted: true });
  } catch (error) {
    return handleRouteError(error, "Gagal menghapus checklist point");
  }
}
