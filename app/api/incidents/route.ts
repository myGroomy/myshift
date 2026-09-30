import { fail, handleRouteError, ok } from "@/lib/api-response";
import { nowIso } from "@/lib/domain/date";
import { optionalUrl, requiredText, validCategoryId, validSeverity } from "@/lib/domain/incident-validation";
import { loadIncidentCategories, loadIncidents } from "@/lib/google/ops-data";
import { appendRow } from "@/lib/google/sheets-data";
import { branchSheetRange } from "@/lib/google/sheet-schema";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const status = request.nextUrl.searchParams.get("status");
    const severity = request.nextUrl.searchParams.get("severity");
    const categoryId = request.nextUrl.searchParams.get("categoryId");
    const { records } = await loadIncidents(branchId);
    let result = records.map(({ rowNumber: _row, ...incident }) => incident);
    if (status) result = result.filter((incident) => incident.status === status);
    if (severity) result = result.filter((incident) => incident.severity === severity);
    if (categoryId) result = result.filter((incident) => incident.categoryId === categoryId);
    return ok(result);
  } catch (error) {
    return handleRouteError(error, "Gagal memuat incident");
  }
}

export async function POST(request: NextRequest) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  try {
    const body = await request.json();
    const categoryId = validCategoryId(body.categoryId);
    const deskripsi = requiredText(body.deskripsi, "deskripsi", 10, 1000);
    const severity = validSeverity(body.severity);
    const fotoUrl = optionalUrl(body.fotoUrl);
    const branchId = resolveBranchId(auth, body.branchId ?? request.nextUrl.searchParams.get("branchId"));

    const [{ spreadsheetId, records: incidents }, { records: categories }] =
      await Promise.all([loadIncidents(branchId), loadIncidentCategories(branchId)]);

    const category = categories.find((entry) => entry.id === categoryId && entry.aktif);
    if (!category) {
      return fail("VALIDATION_ERROR", "Kategori incident tidak valid", { data: { fields: ["categoryId"] } });
    }

    const incidentId = nextSequentialId(incidents.map((incident) => incident.incidentId), ID_PREFIX.incident);
    const createdAt = nowIso();
    await appendRow(spreadsheetId, branchSheetRange("Incidents"), [
      incidentId,
      categoryId,
      deskripsi,
      severity,
      fotoUrl,
      "open",
      "",
      "",
      auth.employeeId,
      createdAt,
    ]);

    return ok(
      {
        incidentId,
        categoryId,
        deskripsi,
        severity,
        fotoUrl,
        status: "open",
        resolvedBy: "",
        resolvedAt: "",
        createdBy: auth.employeeId,
        createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, "Incident tidak valid");
  }
}
