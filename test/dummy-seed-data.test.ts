import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDummySeedPlan,
  defaultSeedRange,
  DUMMY_SEED_MARKER,
  isSchedulableEmployeeRole,
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

test("seed menganggap role petugas sebagai pelaksana shift seperti aplikasi", () => {
  assert.equal(isSchedulableEmployeeRole("petugas"), true);
  assert.equal(isSchedulableEmployeeRole("karyawan"), true);
  assert.equal(isSchedulableEmployeeRole("admin"), false);
});

test("rentang default memuat 90 hari riwayat, hari ini, dan 7 hari mendatang", () => {
  assert.deepEqual(defaultSeedRange("2026-09-30"), {
    startDate: "2026-07-03",
    endDate: "2026-10-07",
  });
});

test("seed menghasilkan riwayat, aktivitas hari ini, dan jadwal mendatang", () => {
  const plan = buildDummySeedPlan(baseInput());
  assert.equal(plan.schedules.length, 291);
  assert.ok(plan.schedules.every((row) => row[6] === DUMMY_SEED_MARKER));
  assert.equal(plan.schedules.filter((row) => row[4] === "completed").length, 267);
  assert.equal(plan.schedules.filter((row) => row[4] === "started").length, 2);
  assert.equal(plan.schedules.filter((row) => row[4] === "scheduled").length, 22);
  assert.equal(plan.schedules.filter((row) => row[3] === "2026-09-30").length, 3);
  assert.equal(plan.schedules.filter((row) => row[3] === "2026-10-07").length, 3);
  assert.ok(plan.swaps.some((row) => row[5] === "pending"));
  assert.ok(plan.izin.some((row) => row[5] === "pending"));
  assert.ok(plan.incidents.some((row) => row[5] === "open" && row[9].startsWith("2026-09-30")));
  assert.ok(plan.handoverLogs.every((row) => !row[5].startsWith("2026-09-30T21:45")));
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

test("setiap akun petugas aktif mendapat satu shift harian, termasuk jika jumlahnya lebih dari tiga", () => {
  const input = baseInput();
  input.employees.push(
    { employeeId: "EMP-004", name: "Karyawan 4" },
    { employeeId: "EMP-005", name: "Karyawan 5" },
  );
  const plan = buildDummySeedPlan(input);
  const todaySchedules = plan.schedules.filter((row) => row[3] === input.currentDate);
  assert.equal(todaySchedules.length, input.employees.length);
  assert.deepEqual(
    new Set(todaySchedules.map((row) => row[1])),
    new Set(input.employees.map((employee) => employee.employeeId)),
  );
});

test("jadwal hari ini mengikuti jam shift yang sudah lewat, sedang berjalan, atau belum mulai", () => {
  const input = baseInput();
  input.shifts = [
    { shiftId: "SFT-001", name: "Opening", startTime: "07:00", endTime: "12:00" },
    { shiftId: "SFT-002", name: "Middle", startTime: "12:00", endTime: "20:00" },
    { shiftId: "SFT-003", name: "Closing", startTime: "18:00", endTime: "22:00" },
  ];
  const plan = buildDummySeedPlan(input);
  const today = plan.schedules.filter((row) => row[3] === input.currentDate);
  assert.equal(today.find((row) => row[2] === "SFT-001")?.[4], "completed");
  assert.equal(today.find((row) => row[2] === "SFT-002")?.[4], "started");
  assert.equal(today.find((row) => row[2] === "SFT-003")?.[4], "scheduled");
  assert.ok(plan.handoverLogs.some((row) => row[1] === today.find((entry) => entry[2] === "SFT-001")?.[0]));
});

test("jadwal nyata yang sudah ada dipertahankan dan tidak ditumpangi jadwal dummy", () => {
  const input = baseInput();
  input.existingSchedules = [[
    "SCH-20260930-999",
    "EMP-001",
    "SFT-001",
    input.currentDate,
    "started",
    "2026-09-30T07:00:00+07:00",
    "myshift",
    "",
    "",
  ]];
  const plan = buildDummySeedPlan(input);
  const employeeSchedulesToday = plan.schedules.filter((row) => row[1] === "EMP-001" && row[3] === input.currentDate);
  assert.equal(employeeSchedulesToday.length, 0);
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
