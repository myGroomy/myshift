import { fail, handleRouteError, ok } from "@/lib/api-response";
import { requiredText } from "@/lib/domain/master-validation";
import { assertScheduleOwner, assertShiftNotClosed } from "@/lib/domain/ops-validation";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { loadChecklistTemplates, loadSchedules } from "@/lib/google/ops-data";
import { uploadChecklistEvidence } from "@/lib/google/photo-upload";
import { isResponse, resolveBranchId, staffSession } from "@/lib/route-auth";
import type { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

// A multipart file part. Duck-typed rather than `instanceof File` so it does not depend on which
// File implementation the runtime exposes, and so a plain text field named `file` (a string) is
// rejected here instead of blowing up on `.arrayBuffer()`.
type UploadedFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function asUploadedFile(value: unknown): UploadedFile | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Partial<UploadedFile>;
  return typeof candidate.arrayBuffer === "function" ? (candidate as UploadedFile) : null;
}

// Evidence photos for a checklist item (API-CONTRACT §8). The file lands in the branch's own Drive
// folder, so the branch folder is resolved from the registry and never taken from the request —
// otherwise one branch could write photos into another's folder. `itemId` is validated against the
// active checklist templates before the body is read, so a bogus item ID never costs a 5 MB parse.
export async function POST(request: NextRequest, context: Context) {
  const auth = await staffSession(request);
  if (isResponse(auth)) return auth;
  const { id: scheduleId } = await context.params;

  try {
    const branchId = resolveBranchId(auth, request.nextUrl.searchParams.get("branchId"));
    const itemId = requiredText(request.nextUrl.searchParams.get("itemId"), "itemId");

    const { records: schedules } = await loadSchedules(branchId);
    const schedule = schedules.find((entry) => entry.scheduleId === scheduleId);
    if (!schedule) return fail("NOT_FOUND", "Jadwal tidak ditemukan");
    assertScheduleOwner(schedule.employeeId, auth.employeeId);
    assertShiftNotClosed(schedule.status);

    const { records: templates } = await loadChecklistTemplates(branchId);
    const item = templates.find((entry) => entry.itemId === itemId && entry.active);
    if (!item) return fail("NOT_FOUND", "Item checklist tidak ditemukan");

    const file = asUploadedFile((await request.formData()).get("file"));
    if (!file) return fail("VALIDATION_ERROR", "Field `file` wajib berupa file yang tidak kosong.");

    const { branch } = await branchSpreadsheet(branchId);
    const uploaded = await uploadChecklistEvidence({
      branchFolderId: branch.folderId,
      scheduleId,
      itemId,
      mimeType: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    });

    return ok(uploaded);
  } catch (error) {
    return handleRouteError(error, "Gagal mengunggah foto checklist");
  }
}
