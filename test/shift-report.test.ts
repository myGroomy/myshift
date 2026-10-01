import test from "node:test";
import assert from "node:assert/strict";
import { buildShiftReport, type ShiftReportData } from "@/lib/google/shift-report";
import type { Branch, Employee } from "@/lib/google/registry";
import type { ScheduleRecord } from "@/lib/google/ops-data";

const branch: Branch = {
  branchId: "CBG001",
  nama: "Mochikin Bandung",
  spreadsheetId: "spreadsheet-id",
  folderId: "folder-id",
  provisionStatus: "ready",
  aktif: true,
  timezone: "Asia/Jakarta",
  createdAt: "",
  updatedAt: "",
};

const employee: Employee = {
  employeeId: "EMP-001",
  username: "petugas",
  normalizedUsername: "petugas",
  pinHash: "not-used",
  nama: "Petugas Satu",
  role: "petugas",
  cabangAktif: "CBG001",
  cabangTerafiliasi: ["CBG001"],
  aktif: true,
  createdAt: "",
  updatedAt: "",
  deactivatedAt: "",
};

const schedule: ScheduleRecord = {
  rowNumber: 2,
  scheduleId: "SCH-20261001-001",
  employeeId: employee.employeeId,
  employeeNameSnapshot: "Nama snapshot",
  shiftId: "SFT-001",
  shiftNameSnapshot: "Opening snapshot",
  shiftStartSnapshot: "06:00",
  shiftEndSnapshot: "14:00",
  date: "2026-10-01",
  status: "started",
  startedAt: "2026-10-01T00:00:00.000Z",
  updatedVia: "myshift",
  reportGeneratedAt: "2026-10-01T07:00:00.000Z",
  reportToken: "signed-token",
  createdBy: "EMP-ADMIN",
  createdAt: "",
  updatedAt: "",
};

const data: ShiftReportData = {
  schedules: [schedule],
  points: [
    {
      rowNumber: 2,
      pointId: "CHK-001",
      categoryId: "SOP-001",
      description: "Periksa stok",
      completionType: "centang",
      unit: "",
      min: "",
      max: "",
      options: [],
      appliesAllShifts: true,
      shiftIds: [],
      order: 1,
      active: true,
      createdAt: "",
      updatedAt: "",
    },
  ],
  categories: [
    {
      rowNumber: 2,
      categoryId: "SOP-001",
      name: "Opening",
      order: 1,
      active: true,
      createdAt: "",
      updatedAt: "",
    },
  ],
  checklistLogs: [
    {
      rowNumber: 2,
      logId: "CLG-001",
      scheduleId: schedule.scheduleId,
      pointId: "CHK-001",
      pointPublicIdSnapshot: "CHK-001",
      categoryNameSnapshot: "Opening",
      descriptionSnapshot: "Periksa stok",
      completionTypeSnapshot: "centang",
      unitSnapshot: "",
      minSnapshot: "",
      maxSnapshot: "",
      optionsSnapshot: "",
      isRequiredSnapshot: true,
      value: "TRUE",
      photoUrl: "",
      checkedBy: employee.employeeId,
      checkedAt: "2026-10-01T06:30:00.000Z",
    },
  ],
  handoverTemplates: [
    {
      rowNumber: 2,
      fieldId: "HOF-001",
      label: "Catatan stok",
      isRequired: true,
      order: 1,
      active: true,
      createdAt: "",
      updatedAt: "",
    },
    {
      rowNumber: 3,
      fieldId: "HOF-002",
      label: "Field nonaktif",
      isRequired: true,
      order: 2,
      active: false,
      createdAt: "",
      updatedAt: "",
    },
  ],
  handoverLogs: [
    {
      rowNumber: 2,
      logId: "HLG-001",
      scheduleId: schedule.scheduleId,
      fieldId: "HOF-001",
      fieldPublicIdSnapshot: "HOF-001",
      labelSnapshot: "Catatan stok",
      isRequiredSnapshot: true,
      isi: "Stok cukup",
      createdBy: employee.employeeId,
      createdAt: "2026-10-01T07:00:00.000Z",
      updatedAt: "",
    },
  ],
  audits: [
    {
      rowNumber: 2,
      auditId: "AUD-001",
      scheduleId: schedule.scheduleId,
      section: "checklist",
      recordId: "CHK-001",
      field: "Nilai",
      oldValue: "FALSE",
      newValue: "TRUE",
      actorId: employee.employeeId,
      actorNameSnapshot: employee.nama,
      changedAt: "2026-10-01T07:05:00.000Z",
    },
  ],
  shifts: [["SFT-001", "Opening", "06:00", "14:00"]],
};

test("builds a shift report from one preloaded dataset", () => {
  const report = buildShiftReport(branch, [employee], data, schedule);
  assert.equal(report.branchName, branch.nama);
  assert.equal(report.employeeName, employee.nama);
  assert.equal(report.shiftName, "Opening");
  assert.deepEqual(report.checklist, {
    items: [
      {
        pointId: "CHK-001",
        categoryId: "SOP-001",
        categoryName: "Opening",
        description: "Periksa stok",
        completionType: "centang",
        value: "TRUE",
        photoUrl: "",
        checked: true,
        warning: false,
        checkedBy: employee.nama,
        checkedAt: "2026-10-01T06:30:00.000Z",
      },
    ],
    completed: 1,
    total: 1,
    complete: true,
  });
  assert.deepEqual(report.handover.fields.map((field) => field.fieldId), ["HOF-001"]);
  assert.equal(report.handover.complete, true);
  assert.equal(report.auditHistory[0]?.recordLabel, "Periksa stok");
  assert.equal(report.reportToken, "signed-token");
});
