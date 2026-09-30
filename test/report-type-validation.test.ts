import test from "node:test";
import assert from "node:assert/strict";
import { DomainError } from "@/lib/error-codes";
import { filterReportRows, parseReportType } from "@/lib/domain/report-type-validation";

test("jenis laporan yang kosong berarti semua laporan", () => {
  assert.equal(parseReportType(null), "semua");
  assert.equal(parseReportType("checklist"), "checklist");
});

test("jenis laporan yang tidak dikenal ditolak", () => {
  assert.throws(() => parseReportType("payroll"), (error: unknown) =>
    error instanceof DomainError && error.code === "VALIDATION_ERROR"
  );
});

test("tab laporan memfilter tipe aktivitas dan swap/izin sebagai satu kelompok", () => {
  const rows = [
    { type: "Jadwal", id: "SCH-1" },
    { type: "Checklist", id: "SCH-1" },
    { type: "Handover", id: "SCH-1" },
    { type: "Swap", id: "SWP-1" },
    { type: "Izin", id: "IZN-1" },
    { type: "Incident", id: "INC-1" },
  ];

  assert.deepEqual(filterReportRows(rows, "checklist"), [rows[1]]);
  assert.deepEqual(filterReportRows(rows, "pengajuan"), [rows[3], rows[4]]);
  assert.deepEqual(filterReportRows(rows, "semua"), rows);
});
