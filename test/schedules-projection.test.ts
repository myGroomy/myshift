import test from "node:test";
import assert from "node:assert/strict";
import { projectSchedules, type RawScheduleRow, type RawShiftRow } from "@/lib/google/schedules-data";

test("projectSchedules memperkaya nama shift, jam mulai, dan jam selesai", () => {
  const scheduleRows: RawScheduleRow[] = [
    {
      scheduleId: "SCH-001",
      employeeId: "EMP-001",
      shiftId: "SFT-PAGI",
      date: "2026-09-30",
      status: "scheduled",
      startedAt: "",
    },
  ];

  const shiftRows: RawShiftRow[] = [
    {
      shiftId: "SFT-PAGI",
      shiftName: "Shift Pagi",
      startTime: "07:00",
      endTime: "15:00",
    },
  ];

  const result = projectSchedules(scheduleRows, shiftRows);
  assert.equal(result.length, 1);
  assert.equal(result[0].shiftName, "Shift Pagi");
  assert.equal(result[0].startTime, "07:00");
  assert.equal(result[0].endTime, "15:00");
  assert.equal(result[0].conflictWarning, false);
});

test("projectSchedules menggunakan shiftId sebagai fallback bila shift template tidak ditemukan", () => {
  const scheduleRows: RawScheduleRow[] = [
    {
      scheduleId: "SCH-002",
      employeeId: "EMP-001",
      shiftId: "SFT-UNKNOWN",
      date: "2026-09-30",
      status: "scheduled",
      startedAt: "",
    },
  ];

  const result = projectSchedules(scheduleRows, []);
  assert.equal(result[0].shiftName, "SFT-UNKNOWN");
  assert.equal(result[0].startTime, "");
  assert.equal(result[0].endTime, "");
  assert.equal(result[0].conflictWarning, false);
});

test("projectSchedules menandai conflictWarning bila jadwal karyawan pada hari yang sama bentrok", () => {
  const scheduleRows: RawScheduleRow[] = [
    {
      scheduleId: "SCH-001",
      employeeId: "EMP-001",
      shiftId: "SFT-PAGI",
      date: "2026-09-30",
      status: "scheduled",
      startedAt: "",
    },
    {
      scheduleId: "SCH-002",
      employeeId: "EMP-001",
      shiftId: "SFT-MIDDLE",
      date: "2026-09-30",
      status: "scheduled",
      startedAt: "",
    },
  ];

  const shiftRows: RawShiftRow[] = [
    { shiftId: "SFT-PAGI", shiftName: "Pagi", startTime: "07:00", endTime: "15:00" },
    { shiftId: "SFT-MIDDLE", shiftName: "Middle", startTime: "12:00", endTime: "20:00" },
  ];

  const result = projectSchedules(scheduleRows, shiftRows);
  assert.equal(result[0].conflictWarning, true);
  assert.equal(result[1].conflictWarning, true);
});
