import { fail, handleRouteError, ok } from "@/lib/api-response";
import { loadSwaps, saveSwap } from "@/lib/google/ops-data";
import { optionalText } from "@/lib/domain/master-validation";
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
    const { spreadsheetId, records } = await loadSwaps(branchId);
    const swap = records.find((entry) => entry.swapId === id);
    if (!swap) return fail("NOT_FOUND", "Pengajuan swap tidak ditemukan");
    if (swap.status !== "pending") return fail("VALIDATION_ERROR", "Pengajuan sudah diproses");

    const updated = {
      ...swap,
      status: "rejected",
      approvedBy: auth.employeeId,
      rejectReason: optionalText(body.reason, "reason", "", 500),
    };
    await saveSwap(spreadsheetId, updated);
    const { rowNumber: _row, ...data } = updated;
    return ok(data);
  } catch (error) {
    return handleRouteError(error, "Gagal menolak swap");
  }
}
