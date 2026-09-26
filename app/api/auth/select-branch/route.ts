import { ok, fail } from "@/lib/api-response";
import { createSessionToken, sessionCookieHeader, verifySessionToken } from "@/lib/session";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get("myshift_session")?.value;
  if (!cookie) return fail("UNAUTHORIZED", "Session tidak ada", 401);

  const session = await verifySessionToken(cookie);
  if (!session) return fail("INVALID_SESSION", "Session tidak valid", 401);

  const { branchId } = (await request.json()) as { branchId: string };
  if (!branchId) return fail("MISSING_BRANCH_ID", "branchId wajib diisi", 400);

  const validBranches = session.branches.map((b) => b.branchId);
  if (!validBranches.includes(branchId)) {
    return fail("INVALID_BRANCH", "Cabang tidak valid untuk user ini", 400);
  }

  const newPayload = { ...session, activeBranchId: branchId };
  const newToken = await createSessionToken(newPayload);
  const headers = sessionCookieHeader(newToken);

  return ok({ activeBranchId: branchId }, { headers });
}
