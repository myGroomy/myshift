import { fail, ok } from "@/lib/api-response";
import { loadIzin, saveIzin } from "@/lib/google/ops-data";
import { adminSession, isResponse, resolveBranchId } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;
  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const { spreadsheetId, records } = await loadIzin(branchId);
    const izin = records.find((entry) => entry.izinId === id);
    if (!izin) return fail("NOT_FOUND", "Pengajuan izin tidak ditemukan", 404);
    if (izin.status !== "pending") return fail("INVALID_REQUEST", "Pengajuan sudah diproses", 400);
    const updated = { ...izin, status: "approved", approvedBy: auth.employeeId, rejectReason: "" };
    await saveIzin(spreadsheetId, updated);
    const { rowNumber: _row, ...data } = updated;
    return ok(data);
  } catch (error) {
    return fail("INVALID_REQUEST", error instanceof Error ? error.message : "Gagal approve izin", 400);
  }
}