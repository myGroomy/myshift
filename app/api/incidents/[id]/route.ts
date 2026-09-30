import { fail, handleRouteError, ok } from "@/lib/api-response";
import { nowIso } from "@/lib/domain/date";
import { loadIncidents, saveIncident } from "@/lib/google/ops-data";
import { adminSession, isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { records } = await loadIncidents(branchId);
    const incident = records.find((entry) => entry.incidentId === id);
    if (!incident) return fail("NOT_FOUND", "Incident tidak ditemukan");
    const { rowNumber: _row, ...data } = incident;
    return ok(data);
  } catch (error) {
    return handleRouteError(error, "Gagal memuat incident");
  }
}

// Resolve: admin-only. Karyawan can create but only admin can mark resolved.
export async function PATCH(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const body = await request.json().catch(() => ({}));
    const branchId = resolveBranchId(auth, body.branchId ?? request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId, records } = await loadIncidents(branchId);
    const incident = records.find((entry) => entry.incidentId === id);
    if (!incident) return fail("NOT_FOUND", "Incident tidak ditemukan");
    if (incident.status === "resolved") return fail("VALIDATION_ERROR", "Incident sudah di-resolve");

    const updated = {
      ...incident,
      status: "resolved",
      resolvedBy: auth.employeeId,
      resolvedAt: nowIso(),
    };
    await saveIncident(spreadsheetId, updated);
    const { rowNumber: _row, ...data } = updated;
    return ok(data);
  } catch (error) {
    return handleRouteError(error, "Gagal resolve incident");
  }
}
