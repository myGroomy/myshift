import test from "node:test";
import assert from "node:assert/strict";
import { ID_PREFIX, nextScheduleId, nextSequentialId } from "@/lib/ids";

test("sequential ids keep the documented prefix and width", () => {
  assert.equal(nextSequentialId([], ID_PREFIX.employee), "EMP-001");
  assert.equal(nextSequentialId(["EMP-001", "EMP-009"], ID_PREFIX.employee), "EMP-010");
  assert.equal(nextSequentialId(["CBG001", "CBG004"], ID_PREFIX.branch), "CBG005");
  assert.equal(nextSequentialId(["SFT-002"], ID_PREFIX.shift), "SFT-003");
  assert.equal(nextSequentialId(["SWP-011"], ID_PREFIX.swap), "SWP-012");
  assert.equal(nextSequentialId(["IZN-007"], ID_PREFIX.izin), "IZN-008");
  assert.equal(nextSequentialId(["KTG-004"], ID_PREFIX.category), "KTG-005");
  assert.equal(nextSequentialId(["CHK-008"], ID_PREFIX.checklistItem), "CHK-009");
  assert.equal(nextSequentialId(["CLG-102"], ID_PREFIX.checklistLog), "CLG-103");
  assert.equal(nextSequentialId(["HOF-003"], ID_PREFIX.handoverField), "HOF-004");
  assert.equal(nextSequentialId(["HLG-088"], ID_PREFIX.handoverLog), "HLG-089");
});

test("sequential ids ignore unrelated and malformed values", () => {
  assert.equal(nextSequentialId(["EMP-001", "", "SFT-009", "EMP-x"], ID_PREFIX.employee), "EMP-002");
});

test("schedule ids embed the date as YYYYMMDD", () => {
  assert.equal(nextScheduleId([], "2026-04-01"), "SCH-20260401-001");
  assert.equal(
    nextScheduleId(["SCH-20260401-003", "SCH-20260331-009"], "2026-04-01"),
    "SCH-20260401-004"
  );
});
