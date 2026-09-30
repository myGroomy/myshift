import test from "node:test";
import assert from "node:assert/strict";
import {
  checklistNumericWarning,
  checklistPointComplete,
  createReportToken,
  normalizeChecklistPoint,
  reportTokenMatches,
  validateChecklistValue,
  verifyReportToken,
} from "@/lib/domain/checklist-spec-validation";
import { isDomainError } from "@/lib/error-codes";
import type { ChecklistPointRecord } from "@/lib/google/ops-data";

const pointBase = {
  categoryId: "SOP-001",
  description: "Periksa alat",
  completionType: "centang" as const,
  unit: "",
  min: "",
  max: "",
  options: [],
  appliesAllShifts: true,
  shiftIds: [],
  order: 1,
  active: true,
};

function testPoint(
  overrides: Partial<ChecklistPointRecord> = {}
): ChecklistPointRecord {
  return { rowNumber: 2, pointId: "CHK-001", ...pointBase, ...overrides };
}

test("normalizes number, options, and shift scope for point inputs", () => {
  assert.deepEqual(
    normalizeChecklistPoint({
      ...pointBase,
      completionType: "pilihan",
      options: ["Baik", "Rusak"],
      appliesAllShifts: false,
      shiftIds: ["SFT-001"],
      order: 2,
    }),
    {
      categoryId: pointBase.categoryId,
      description: pointBase.description,
      unit: pointBase.unit,
      min: pointBase.min,
      max: pointBase.max,
      completionType: "pilihan",
      options: ["Baik", "Rusak"],
      appliesAllShifts: false,
      shiftIds: ["SFT-001"],
      order: 2,
    }
  );
});

test("rejects point values that do not match their type configuration", () => {
  assert.throws(
    () => normalizeChecklistPoint({ ...pointBase, completionType: "angka", min: 10, max: 2 }),
    (error: unknown) => isDomainError(error) && error.code === "VALIDATION_ERROR"
  );
  assert.throws(
    () => normalizeChecklistPoint({ ...pointBase, appliesAllShifts: false, shiftIds: [] }),
    (error: unknown) => isDomainError(error) && error.code === "VALIDATION_ERROR"
  );
});

test("numeric values outside bounds warn but remain valid", () => {
  const point = testPoint({ completionType: "angka", min: "2", max: "8" });
  assert.equal(checklistNumericWarning(point, "9"), true);
  assert.deepEqual(validateChecklistValue(point, "9", ""), { value: "9", photoUrl: "" });
  assert.equal(checklistPointComplete(point, "9", ""), true);
});

test("photo points require an attachment only when marked complete", () => {
  const point = testPoint({ completionType: "centang_foto" });
  assert.deepEqual(validateChecklistValue(point, "", ""), { value: "", photoUrl: "" });
  assert.throws(() => validateChecklistValue(point, "TRUE", ""), /foto/);
  assert.equal(checklistPointComplete(point, "TRUE", ""), false);
  assert.equal(checklistPointComplete(point, "TRUE", "https://example.com/evidence.webp"), true);
});

test("public report tokens are HMAC signed, permanent, and scoped to branch and schedule", () => {
  const old = process.env.MYSHIFT_API_KEY;
  process.env.MYSHIFT_API_KEY = "checklist-validation-test-secret-with-more-than-32-characters";
  try {
    const token = createReportToken("CBG001", "SCH-20260930-001");
    assert.deepEqual(verifyReportToken(token), { branchId: "CBG001", scheduleId: "SCH-20260930-001" });
    assert.equal(reportTokenMatches(token, token), true);
    assert.equal(verifyReportToken(`${token.slice(0, -1)}x`), null);
  } finally {
    if (old === undefined) delete process.env.MYSHIFT_API_KEY;
    else process.env.MYSHIFT_API_KEY = old;
  }
});
