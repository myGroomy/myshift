import { fail } from "@/lib/api-response";
import { getSession, hasRole } from "@/lib/auth";
import { DomainError } from "@/lib/error-codes";
import type { NextRequest } from "next/server";
import type { SessionPayload } from "@/lib/session";

export async function adminSession(request: NextRequest): Promise<SessionPayload | Response> {
  const session = await getSession(request);
  if (!session) return fail("UNAUTHORIZED", "Session tidak valid");
  if (!hasRole(session, ["admin"])) return fail("FORBIDDEN", "Akses admin diperlukan");
  return session;
}

export async function staffSession(request: NextRequest): Promise<SessionPayload | Response> {
  const session = await getSession(request);
  if (!session) return fail("UNAUTHORIZED", "Session tidak valid");
  return session;
}

export function isResponse(value: SessionPayload | Response): value is Response {
  return value instanceof Response;
}

// Staff may only act inside a branch listed in their session, and an explicit branchId is
// verified against the session before any read happens. Admins may name any branch; without
// one they fall back to their own active branch (admin pages do not always pass branchId).
export function resolveBranchId(session: SessionPayload, requested?: unknown): string {
  const candidate = typeof requested === "string" ? requested.trim() : "";

  if (session.role === "admin") {
    const branchId = candidate || session.activeBranchId;
    if (!branchId) throw new DomainError("VALIDATION_ERROR", "branchId wajib diisi");
    return branchId;
  }

  const branchId = candidate || session.activeBranchId;
  if (!branchId || !session.branches.some((branch) => branch.branchId === branchId)) {
    throw new DomainError("FORBIDDEN", "Cabang tidak tersedia untuk user ini");
  }
  return branchId;
}
