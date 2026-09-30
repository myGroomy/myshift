import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDummySeedPlan,
  defaultSeedRange,
  DUMMY_SEED_MARKER,
} from "../scripts/dummy-seed-data";

const baseInput = () => ({
  branchId: "CBG001",
  ...defaultSeedRange("2026-09-30"),
  currentDate: "2026-09-30",
  currentTime: "12:30",
  employees: [
    { employeeId: "EMP-001", name: "Karyawan Demo 1" },
    { employeeId: "EMP-002", name: "Karyawan Demo 2" },
    { employeeId: "EMP-003", name: "Karyawan Demo 3" },
  ],
  shifts: [
    { shiftId: "SFT-001", name: "Opening", startTime: "07:00", endTime: "15:00" },
    { shiftId: "SFT-002", name: "Middle", startTime: "12:00", endTime: "20:00" },
    { shiftId: "SFT-003", name: "Closing", startTime: "18:00", endTime: "22:00" },
  ],
  checklistPoints: [
    {
      pointId: "CHK-001",
      description: "Cek suhu chiller",
      completionType: "angka" as const,
      unit: "°C",
      min: "2",
      max: "5",
      options: [],
      appliesAllShifts: true,
      shiftIds: [],
      active: true,
    },
    {
      pointId: "CHK-002",
      description: "Foto area kerja",
      completionType: "centang_foto" as const,
      unit: "",
      min: "",
      max: "",
      options: [],
      appliesAllShifts: true,
      shiftIds: [],
      active: true,
    },
  ],
  handoverFields: [{ fieldId: "HOF-001", label: "Catatan operasional" }],
  izinCategories: [{ id: "KTG-001", label: "Sakit", active: true }],
  incidentCategories: [{ id: "KIC-001", label: "Peralatan", active: true }],
  adminEmployeeId: "EMP-ADMIN",
  photoUrl: "https://drive.google.com/uc?id=dummy",
  existingSchedules: [] as string[][],
  existingChecklistLogs: [] as string[][],
  existingHandoverLogs: [] as string[][],
  existingSwaps: [] as string[][],
  existingIzin: [] as string[][],
  existingIncidents: [] as string[][],
});

test("rentang default tepat 90 hari inklusif", () => {
  assert.deepEqual(defaultSeedRange("2026-09-30"), {
    startDate: "2026-07-03",
    endDate: "2026-09-30",
  });
});

test("seed menghasilkan riwayat jadwal, checklist, handover, swap, izin, dan incident", () => {
  const plan = buildDummySeedPlan(baseInput());
  assert.equal(plan.schedules.length, 270);
  assert.ok(plan.schedules.every((row) => row[6] === DUMMY_SEED_MARKER));
  assert.equal(plan.schedules.filter((row) => row[4] === "completed").length, 267);
  assert.equal(plan.schedules.filter((row) => row[4] === "started").length, 2);
  assert.equal(plan.schedules.filter((row) => row[4] === "scheduled").length, 1);
  assert.ok(
    plan.checklistLogs
      .filter((row) => row[2] === "CHK-002")
      .every((row) => row[4] === "https://drive.google.com/uc?id=dummy"),
  );
  assert.ok(plan.handoverLogs.every((row) => row[3].startsWith("[DUMMY-SEED]")));
  assert.ok(plan.swaps.every((row) => row[4].startsWith("[DUMMY-SEED]")));
  assert.ok(plan.izin.every((row) => row[4].startsWith("[DUMMY-SEED]")));
  assert.ok(plan.incidents.every((row) => row[2].startsWith("[DUMMY-SEED]")));
});

test("seed dapat dijalankan ulang tanpa menggandakan jadwal atau data turunannya", () => {
  const input = baseInput();
  const first = buildDummySeedPlan(input);
  const repeat = buildDummySeedPlan({
    ...input,
    existingSchedules: first.schedules,
    existingChecklistLogs: first.checklistLogs,
    existingHandoverLogs: first.handoverLogs,
    existingSwaps: first.swaps,
    existingIzin: first.izin,
    existingIncidents: first.incidents,
  });
  assert.deepEqual(repeat, {
    schedules: [],
    checklistLogs: [],
    handoverLogs: [],
    swaps: [],
    izin: [],
    incidents: [],
  });
  assert.equal(input.existingSwaps.length, 0);
  assert.equal(input.existingIzin.length, 0);
});
