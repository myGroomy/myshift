import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeHandoverSubmission,
  validChecklistType,
} from "@/lib/domain/checklist-handover-validation";
import { DomainError } from "@/lib/error-codes";

const templates = [
  { fieldId: "HOF-001", isRequired: true },
  { fieldId: "HOF-002", isRequired: false },
];

function codeOf(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof DomainError, "expected a DomainError");
    return { code: error.code, data: error.data };
  }
  throw new Error("expected the call to throw");
}

test("required flags come from the template, not the request body", () => {
  const result = codeOf(() =>
    normalizeHandoverSubmission({
      templates,
      // The client claims the required field is optional the server must ignore that.
      submitted: [{ fieldId: "HOF-001", value: "   ", isRequired: false }],
    })
  );
  assert.equal(result.code, "REQUIRED_FIELD_MISSING");
  assert.deepEqual(result.data, { fields: ["HOF-001"] });
});

test("a required field can also not be omitted", () => {
  const result = codeOf(() => normalizeHandoverSubmission({ templates, submitted: [] }));
  assert.equal(result.code, "REQUIRED_FIELD_MISSING");
});

test("unknown field ids are rejected instead of written to the sheet", () => {
  const result = codeOf(() =>
    normalizeHandoverSubmission({
      templates,
      submitted: [
        { fieldId: "HOF-001", value: "kasir aman" },
        { fieldId: "HOF-999", value: "sembarang" },
      ],
    })
  );
  assert.equal(result.code, "VALIDATION_ERROR");
  assert.deepEqual(result.data, { fields: ["HOF-999"] });
});

test("duplicate field ids are rejected", () => {
  const result = codeOf(() =>
    normalizeHandoverSubmission({
      templates,
      submitted: [
        { fieldId: "HOF-001", value: "a" },
        { fieldId: "HOF-001", value: "b" },
      ],
    })
  );
  assert.equal(result.code, "VALIDATION_ERROR");
});

test("values are trimmed and follow template order", () => {
  const result = normalizeHandoverSubmission({
    templates,
    submitted: [
      { fieldId: "HOF-002", value: "  catatan  " },
      { fieldId: "HOF-001", value: " kasir ok " },
    ],
  });
  assert.deepEqual(result, [
    { fieldId: "HOF-001", value: "kasir ok" },
    { fieldId: "HOF-002", value: "catatan" },
  ]);
});

test("optional fields may stay empty", () => {
  const result = normalizeHandoverSubmission({
    templates,
    submitted: [{ fieldId: "HOF-001", value: "kasir ok" }],
  });
  assert.deepEqual(result[1], { fieldId: "HOF-002", value: "" });
});

test("missing or malformed entries are rejected", () => {
  // A non-array payload is treated as an empty submission, so required fields are missing.
  assert.equal(codeOf(() => normalizeHandoverSubmission({ templates, submitted: "nope" })).code, "REQUIRED_FIELD_MISSING");
  assert.equal(
    codeOf(() => normalizeHandoverSubmission({ templates, submitted: [{ value: "x" }] })).code,
    "VALIDATION_ERROR"
  );
});

test("validChecklistType only accepts opening/closing", () => {
  assert.equal(validChecklistType("opening"), "opening");
  assert.equal(validChecklistType("closing"), "closing");
  assert.equal(codeOf(() => validChecklistType("midshift")).code, "VALIDATION_ERROR");
});
