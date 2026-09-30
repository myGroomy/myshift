import { DomainError } from "@/lib/error-codes";
import type { SessionPayload } from "@/lib/session";

export function reportBranchId(session: SessionPayload, requestedBranchId: string): string | null {
  if (session.role === "admin") return requestedBranchId || null;

  if (!session.activeBranchId || (requestedBranchId && requestedBranchId !== session.activeBranchId)) {
    throw new DomainError("FORBIDDEN", "Laporan petugas hanya tersedia untuk cabang aktif");
  }
  return session.activeBranchId;
}
