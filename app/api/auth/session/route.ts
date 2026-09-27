import { fail, ok } from "@/lib/api-response";
import { getSession } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return fail("UNAUTHORIZED", "Session tidak valid");

  return ok({
    employeeId: session.employeeId,
    nama: session.nama,
    role: session.role,
    branches: session.branches,
    activeBranchId: session.activeBranchId,
  });
}
