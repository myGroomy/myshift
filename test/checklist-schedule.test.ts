import test from "node:test";
import assert from "node:assert/strict";
import { selectDefaultChecklistSchedule } from "@/lib/domain/checklist-schedule";

test("selects an in-progress shift before other shifts for today", () => {
  const selected = selectDefaultChecklistSchedule([
    { scheduleId: "future", date: "2026-09-30", status: "scheduled", startTime: "15:00" },
    { scheduleId: "running", date: "2026-09-30", status: "started", startTime: "07:00" },
  ], "2026-09-30", "12:00");

  assert.equal(selected?.scheduleId, "running");
});

test("selects the nearest upcoming shift when no shift has started", () => {
  const selected = selectDefaultChecklistSchedule([
    { scheduleId: "later", date: "2026-09-30", status: "scheduled", startTime: "18:00" },
    { scheduleId: "next", date: "2026-09-30", status: "scheduled", startTime: "13:00" },
    { scheduleId: "past", date: "2026-09-30", status: "scheduled", startTime: "08:00" },
  ], "2026-09-30", "12:00");

  assert.equal(selected?.scheduleId, "next");
});

test("does not select a schedule from another day", () => {
  const selected = selectDefaultChecklistSchedule([
    { scheduleId: "tomorrow", date: "2026-10-01", status: "scheduled", startTime: "08:00" },
  ], "2026-09-30", "12:00");

  assert.equal(selected, null);
});

test("keeps the selected shift's assigned branch when schedule IDs collide", () => {
  const selected = selectDefaultChecklistSchedule([
    { scheduleId: "SCH-20260930-001", branchId: "CBG01", date: "2026-09-30", status: "started", startTime: "07:00" },
    { scheduleId: "SCH-20260930-001", branchId: "CBG02", date: "2026-09-30", status: "started", startTime: "07:00" },
  ], "2026-09-30", "12:00");

  assert.equal(selected?.branchId, "CBG01");
});
