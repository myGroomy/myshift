import { ok, fail } from "@/lib/api-response";
import { verifySessionToken } from "@/lib/session";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get("myshift_session")?.value;
  if (!cookie) return fail("UNAUTHORIZED", "Session tidak ada", 401);

  const session = await verifySessionToken(cookie);
  if (!session) return fail("INVALID_SESSION", "Session tidak valid", 401);

  return ok({
    employeeId: session.employeeId,
    nama: session.nama,
    role: session.role,
    branches: session.branches,
    activeBranchId: session.activeBranchId,
  });
}
