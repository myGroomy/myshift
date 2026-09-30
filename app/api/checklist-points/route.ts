import { handleRouteError, ok } from "@/lib/api-response";
import { normalizeChecklistPoint, serializeChecklistPoint } from "@/lib/domain/checklist-spec-validation";
import { DomainError } from "@/lib/error-codes";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { loadSopCategories } from "@/lib/google/ops-data";
import { appendRow, readRows } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import { adminSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

async function validateReferences(branchId: string, categoryId: string, shiftIds: string[]) {
  const [{ records: categories }, { spreadsheetId }] = await Promise.all([
    loadSopCategories(branchId),
    branchSpreadsheet(branchId),
  ]);
  if (!categories.some((category) => category.categoryId === categoryId && category.active)) {
    throw new DomainError("VALIDATION_ERROR", "Kategori SOP tidak ditemukan atau nonaktif", {
      data: { fields: ["categoryId"] },
    });
  }
  if (shiftIds.length) {
    const shiftRows = await readRows(spreadsheetId, branchSheetRange("Shifts"));
    const known = new Set(shiftRows.map((row) => row.values[0] ?? ""));
    const unknown = shiftIds.filter((shiftId) => !known.has(shiftId));
    if (unknown.length) {
      throw new DomainError("VALIDATION_ERROR", `Shift tidak ditemukan: ${unknown.join(", ")}`, {
        data: { fields: ["shiftIds"] },
      });
    }
  }
}

export async function GET(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const [points, logs] = await Promise.all([
      readRows(spreadsheetId, branchSheetRange("Checklist_Point")),
      readRows(spreadsheetId, branchSheetRange("Checklist_Log")),
    ]);
    const logged = new Set(logs.map((row) => row.values[2] ?? ""));
    return ok(points.map((row) => ({
      pointId: row.values[0] ?? "",
      categoryId: row.values[1] ?? "",
      description: row.values[2] ?? "",
      completionType: row.values[3] ?? "centang",
      unit: row.values[4] ?? "",
      min: row.values[5] ?? "",
      max: row.values[6] ?? "",
      options: (row.values[7] ?? "").split(",").map((entry) => entry.trim()).filter(Boolean),
      appliesAllShifts: (row.values[8] ?? "FALSE").toUpperCase() === "TRUE",
      shiftIds: (row.values[9] ?? "").split(",").map((entry) => entry.trim()).filter(Boolean),
      order: Number(row.values[10] ?? "0") || 0,
      active: (row.values[11] ?? "TRUE").toUpperCase() === "TRUE",
      hasLogs: logged.has(row.values[0] ?? ""),
    })));
  } catch (error) {
    return handleRouteError(error, "Gagal memuat checklist point");
  }
}

export async function POST(request: NextRequest) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const point = normalizeChecklistPoint(await request.json());
    await validateReferences(branchId, point.categoryId, point.shiftIds);
    const { spreadsheetId } = await branchSpreadsheet(branchId);
    const rows = await readRows(spreadsheetId, branchSheetRange("Checklist_Point"));
    const pointId = nextSequentialId(rows.map((row) => row.values[0] ?? ""), ID_PREFIX.checklistItem);
    await appendRow(spreadsheetId, branchSheetRange("Checklist_Point"), serializeChecklistPoint(point, pointId, true));
    return ok({ pointId, ...point, active: true, hasLogs: false }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Gagal membuat checklist point");
  }
}
