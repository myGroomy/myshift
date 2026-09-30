import { fail, ok } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import { requiredText } from "@/lib/domain/master-validation";
import { createSessionToken, sessionCookieHeader } from "@/lib/session";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return fail("UNAUTHORIZED", "Session tidak valid");

  const body = await request.json();
  const branchId = requiredText(body.branchId, "branchId");
  if (!session.branches.some((branch) => branch.branchId === branchId)) {
    return fail("VALIDATION_ERROR", "Cabang tidak valid untuk user ini", { data: { fields: ["branchId"] } });
  }

  // createSessionToken always rewrites iat/exp from the server clock, so this is also a
  // sliding refresh a stolen payload cannot extend its own lifetime.
  const token = await createSessionToken({ ...session, activeBranchId: branchId });
  return ok({ activeBranchId: branchId }, { headers: sessionCookieHeader(token) });
}
