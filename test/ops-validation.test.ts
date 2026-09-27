import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCanStartShift,
  assertScheduleOwner,
  assertShiftNotClosed,
  eligiblePartnerIds,
  partnerScheduleOnDate,
} from "@/lib/domain/ops-validation";
import { DomainError } from "@/lib/error-codes";

const schedules = [
  { scheduleId: "SCH-1", employeeId: "EMP-001", date: "2026-09-27", status: "scheduled" },
  { scheduleId: "SCH-2", employeeId: "EMP-002", date: "2026-09-27", status: "scheduled" },
  { scheduleId: "SCH-3", employeeId: "EMP-003", date: "2026-09-27", status: "started" },
  { scheduleId: "SCH-4", employeeId: "EMP-004", date: "2026-09-27", status: "scheduled" },
  { scheduleId: "SCH-5", employeeId: "EMP-005", date: "2026-09-28", status: "scheduled" },
];

test("eligible partners are same-day, not started, not pending and not the requester", () => {
  const partners = eligiblePartnerIds({
    requesterEmployeeId: "EMP-001",
    requesterScheduleId: "SCH-1",
    requesterDate: "2026-09-27",
    schedules,
    pendingSwapScheduleIds: ["SCH-4"],
  });
  assert.deepEqual(partners, ["EMP-002"]);
});

test("partnerScheduleOnDate keeps the full record type", () => {
  const enriched = schedules.map((schedule) => ({ ...schedule, shiftId: "SFT-001" }));
  const partner = partnerScheduleOnDate(enriched, "EMP-002", "2026-09-27", "SCH-1");
  assert.equal(partner?.scheduleId, "SCH-2");
  assert.equal(partner?.shiftId, "SFT-001");
  assert.equal(partnerScheduleOnDate(enriched, "EMP-003", "2026-09-27", "SCH-1"), undefined);
});

function codeOf(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof DomainError);
    return error.code;
  }
  throw new Error("expected the call to throw");
}

test("ownership and lifecycle guards throw typed errors", () => {
  assert.equal(codeOf(() => assertScheduleOwner("EMP-001", "EMP-002")), "FORBIDDEN");
  assert.doesNotThrow(() => assertScheduleOwner("EMP-001", "EMP-001"));
  assert.equal(codeOf(() => assertCanStartShift("started")), "VALIDATION_ERROR");
  assert.doesNotThrow(() => assertCanStartShift("scheduled"));
  assert.equal(codeOf(() => assertShiftNotClosed("completed")), "VALIDATION_ERROR");
  assert.doesNotThrow(() => assertShiftNotClosed("started"));
});
