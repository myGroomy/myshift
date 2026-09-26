import { fail } from "@/lib/api-response";
import { getSession, hasRole } from "@/lib/auth";
import type { NextRequest } from "next/server";
import type { SessionPayload } from "@/lib/session";

export async function adminSession(request: NextRequest): Promise<SessionPayload | Response> {
  const session = await getSession(request);
  if (!session) return fail("UNAUTHORIZED", "Session tidak valid", 401);
  if (!hasRole(session, ["admin"])) return fail("FORBIDDEN", "Akses admin diperlukan", 403);
  return session;
}

export async function staffSession(request: NextRequest): Promise<SessionPayload | Response> {
  const session = await getSession(request);
  if (!session) return fail("UNAUTHORIZED", "Session tidak valid", 401);
  return session;
}

export function isResponse(value: SessionPayload | Response): value is Response {
  return value instanceof Response;
}

export function resolveBranchId(session: SessionPayload, requested?: string | null) {
  if (session.role === "admin") {
    const branchId = requested?.trim();
    if (!branchId) throw new Error("branchId wajib diisi");
    return branchId;
  }
  const branchId = requested?.trim() || session.activeBranchId;
  if (!branchId || !session.branches.some((branch) => branch.branchId === branchId)) {
    throw new Error("Cabang tidak tersedia untuk user ini");
  }
  return branchId;
}
