// Shift lifecycle: scheduled -> started -> completed.
// A shift can only be closed (POST /api/schedules/:id/checklist/submit) when the
// checklist is 100% done AND every required handover field is filled — enforced on
// the backend per AGENTS.md §5, not just by the disabled button in the UI.
export const SHIFT_STATUS = {
  scheduled: "scheduled",
  started: "started",
  completed: "completed",
} as const;

export type ClosureBlockerCode = "CHECKLIST_INCOMPLETE" | "REQUIRED_FIELD_MISSING";

export type ClosureBlocker = { code: ClosureBlockerCode; fields: string[] };

export type ClosureInput = {
  activeChecklistItemIds: string[];
  checkedChecklistItemIds: string[];
  requiredHandoverFieldIds: string[];
  filledHandoverFieldIds: string[];
};

export function evaluateShiftClosure(input: ClosureInput): { canClose: boolean; blocker?: ClosureBlocker } {
  const checked = new Set(input.checkedChecklistItemIds);
  const missingItems = input.activeChecklistItemIds.filter((itemId) => !checked.has(itemId));
  if (missingItems.length > 0) {
    return { canClose: false, blocker: { code: "CHECKLIST_INCOMPLETE", fields: missingItems } };
  }

  const filled = new Set(input.filledHandoverFieldIds);
  const missingFields = input.requiredHandoverFieldIds.filter((fieldId) => !filled.has(fieldId));
  if (missingFields.length > 0) {
    return { canClose: false, blocker: { code: "REQUIRED_FIELD_MISSING", fields: missingFields } };
  }

  return { canClose: true };
}

export function canStartShift(status: string): boolean {
  return status === SHIFT_STATUS.scheduled;
}

export function isShiftClosed(status: string): boolean {
  return status === SHIFT_STATUS.completed;
}
