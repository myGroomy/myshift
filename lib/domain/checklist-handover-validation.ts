import { DomainError } from "@/lib/error-codes";

export const CHECKLIST_TYPES = ["opening", "closing"] as const;
export type ChecklistType = (typeof CHECKLIST_TYPES)[number];

export function validChecklistType(value: unknown): ChecklistType {
  if (value === "opening" || value === "closing") return value;
  throw new DomainError("VALIDATION_ERROR", "type harus opening atau closing", { data: { fields: ["type"] } });
}

// Backend-side business rule (contract §8): the checklist must be complete before the
// shift can be closed, regardless of what the UI allows to be clicked.
export function validateChecklistCompletion(input: { activeItemIds: string[]; checkedItemIds: string[] }): void {
  const checked = new Set(input.checkedItemIds);
  const missing = input.activeItemIds.filter((itemId) => !checked.has(itemId));
  if (missing.length > 0) {
    throw new DomainError("CHECKLIST_INCOMPLETE", `${missing.length} item belum dicentang`, {
      data: { fields: missing },
    });
  }
}

export type HandoverSubmission = { fieldId: string; value: string };

// isRequired and the set of valid fieldIds both come from Handover_Template on the server.
// The client cannot opt out of a required field by sending isRequired:false, and arbitrary
// fieldIds are rejected instead of being written straight into Handover_Log (audit H-7).
export function normalizeHandoverSubmission(input: {
  templates: { fieldId: string; isRequired: boolean }[];
  submitted: unknown;
}): HandoverSubmission[] {
  const submitted = Array.isArray(input.submitted) ? input.submitted : [];
  const values = new Map<string, string>();

  for (const entry of submitted) {
    const record = entry as { fieldId?: unknown; value?: unknown } | null;
    const fieldId = typeof record?.fieldId === "string" ? record.fieldId.trim() : "";
    if (!fieldId) {
      throw new DomainError("VALIDATION_ERROR", "fieldId wajib diisi", { data: { fields: ["fields.fieldId"] } });
    }
    if (values.has(fieldId)) {
      throw new DomainError("VALIDATION_ERROR", `fieldId ${fieldId} duplikat`, { data: { fields: [fieldId] } });
    }
    values.set(fieldId, typeof record?.value === "string" ? record.value.trim() : "");
  }

  const known = new Set(input.templates.map((template) => template.fieldId));
  const unknown = [...values.keys()].filter((fieldId) => !known.has(fieldId));
  if (unknown.length > 0) {
    throw new DomainError("VALIDATION_ERROR", `Field handover tidak dikenal: ${unknown.join(", ")}`, {
      data: { fields: unknown },
    });
  }

  const missing = input.templates.filter(
    (template) => template.isRequired && !(values.get(template.fieldId) ?? "").trim()
  );
  if (missing.length > 0) {
    throw new DomainError(
      "REQUIRED_FIELD_MISSING",
      `Field wajib belum diisi: ${missing.map((template) => template.fieldId).join(", ")}`,
      { data: { fields: missing.map((template) => template.fieldId) } }
    );
  }

  return input.templates.map((template) => ({
    fieldId: template.fieldId,
    value: values.get(template.fieldId) ?? "",
  }));
}
