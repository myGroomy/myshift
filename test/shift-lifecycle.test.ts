import test from "node:test";
import assert from "node:assert/strict";
import { SHIFT_STATUS, canStartShift, evaluateShiftClosure, isShiftClosed } from "@/lib/domain/shift-lifecycle";

const base = {
  activeChecklistItemIds: ["CHK-001", "CHK-002"],
  checkedChecklistItemIds: ["CHK-001", "CHK-002"],
  requiredHandoverFieldIds: ["HOF-001"],
  filledHandoverFieldIds: ["HOF-001"],
};

test("a shift closes only when checklist and required handover are complete", () => {
  assert.deepEqual(evaluateShiftClosure(base), { canClose: true });
});

test("missing checklist items block closure with the item ids", () => {
  const result = evaluateShiftClosure({ ...base, checkedChecklistItemIds: ["CHK-001"] });
  assert.equal(result.canClose, false);
  assert.deepEqual(result.blocker, { code: "CHECKLIST_INCOMPLETE", fields: ["CHK-002"] });
});

test("checklist is evaluated before handover", () => {
  const result = evaluateShiftClosure({
    ...base,
    checkedChecklistItemIds: [],
    filledHandoverFieldIds: [],
  });
  assert.equal(result.blocker?.code, "CHECKLIST_INCOMPLETE");
});

test("missing required handover fields block closure", () => {
  const result = evaluateShiftClosure({ ...base, filledHandoverFieldIds: [] });
  assert.equal(result.canClose, false);
  assert.deepEqual(result.blocker, { code: "REQUIRED_FIELD_MISSING", fields: ["HOF-001"] });
});

test("optional handover fields are not required to close", () => {
  const result = evaluateShiftClosure({ ...base, requiredHandoverFieldIds: [] });
  assert.equal(result.canClose, true);
});

test("status helpers", () => {
  assert.equal(canStartShift(SHIFT_STATUS.scheduled), true);
  assert.equal(canStartShift(SHIFT_STATUS.started), false);
  assert.equal(canStartShift(SHIFT_STATUS.completed), false);
  assert.equal(isShiftClosed(SHIFT_STATUS.completed), true);
  assert.equal(isShiftClosed(SHIFT_STATUS.started), false);
});
