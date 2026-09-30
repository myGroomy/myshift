import { fail, handleRouteError, ok } from "@/lib/api-response";
import { adminSession, isResponse } from "@/lib/route-auth";
import { getBranchRows } from "@/lib/google/registry";
import { provisionExistingBranch } from "@/lib/google/branch-provisioning";
import { maskSpreadsheetId } from "@/lib/google/sheet-schema";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

// Same budget as POST /api/branches: the copy runs through the Apps Script Drive bridge.
export const maxDuration = 60;

// Re-runs steps 3-6 of the row-first flow in API-CONTRACT §3 for a branch that never finished
// provisioning. The registry row is never deleted here the branch already exists as far as the
// app is concerned, and dropping it would lose the ID history and any folder already created.
// The provisioning itself lives in `provisionExistingBranch()` so this endpoint and the
// `pnpm provision:branch` CLI cannot drift apart.
export async function POST(request: NextRequest, context: Context) {
  const auth = await adminSession(request);
  if (isResponse(auth)) return auth;
  const { id } = await context.params;

  try {
    const row = (await getBranchRows()).find((entry) => entry.branch.branchId === id);
    if (!row) return fail("NOT_FOUND", "Cabang tidak ditemukan");

    const provisioned = await provisionExistingBranch(row.branch);

    return ok({
      branchId: id,
      spreadsheetId: maskSpreadsheetId(provisioned.spreadsheetId),
      folderConfigured: true,
      provisionStatus: provisioned.status,
    });
  } catch (error) {
    return handleRouteError(error, "Provisioning cabang gagal");
  }
}
