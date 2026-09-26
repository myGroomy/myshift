export function validateChecklistSubmit(items: { itemId: string; checked: boolean }[]) {
  const unchecked = items.filter((item) => !item.checked);
  if (unchecked.length > 0) {
    const error: { code: string; message: string; data?: { fields: string[] } } = {
      code: "CHECKLIST_INCOMPLETE",
      message: `Checklist belum lengkap: ${unchecked.length} item belum dicentang`,
      data: { fields: unchecked.map((item) => item.itemId) },
    };
    throw error;
  }
}

export function validateHandoverFields(fields: { fieldId: string; value: string; isRequired: boolean }[]) {
  const missing = fields.filter((field) => field.isRequired && !field.value.trim());
  if (missing.length > 0) {
    const error: { code: string; message: string; data?: { fields: string[] } } = {
      code: "REQUIRED_FIELD_MISSING",
      message: `Field wajib belum diisi: ${missing.map((field) => field.fieldId).join(", ")}`,
      data: { fields: missing.map((field) => field.fieldId) },
    };
    throw error;
  }
}

export type ChecklistItem = {
  itemId: string;
  type: string;
  description: string;
  requiresPhoto: boolean;
  order: number;
  active: boolean;
};

export type ChecklistLogEntry = {
  logId: string;
  scheduleId: string;
  itemId: string;
  checkedBy: string;
  checkedAt: string;
  photoUrl: string;
};

export type HandoverField = {
  fieldId: string;
  label: string;
  isRequired: boolean;
  order: number;
};

export type HandoverLogEntry = {
  logId: string;
  scheduleId: string;
  fieldId: string;
  isi: string;
  createdBy: string;
  createdAt: string;
};