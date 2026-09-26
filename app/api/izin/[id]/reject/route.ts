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
    const body = await request.json().catch(() => ({}));
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId") ?? body.branchId);
    const { spreadsheetId, records } = await loadIzin(branchId);
    const izin = records.find((entry) => entry.izinId === id);
    if (!izin) return fail("NOT_FOUND", "Pengajuan izin tidak ditemukan", 404);
    if (izin.status !== "pending") return fail("INVALID_REQUEST", "Pengajuan sudah diproses", 400);
    const updated = { ...izin, status: "rejected", approvedBy: auth.employeeId, rejectReason: String(body.reason ?? "").trim() };
    await saveIzin(spreadsheetId, updated);
    const { rowNumber: _row, ...data } = updated;
    return ok(data);
  } catch (error) {
    return fail("INVALID_REQUEST", error instanceof Error ? error.message : "Gagal menolak izin", 400);
  }
}