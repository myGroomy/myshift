import test from "node:test";
import assert from "node:assert/strict";
import {
  employeeFromRow,
  parseAktif,
  parseRole,
  toPublicEmployee,
  type Employee,
} from "@/lib/google/registry";

const employee: Employee = {
  employeeId: "EMP-001",
  username: "admin",
  normalizedUsername: "admin",
  pinHash: "deadbeef$c0ffee",
  nama: "Admin Pusat",
  role: "admin",
  cabangAktif: "CBG001",
  cabangTerafiliasi: ["CBG002"],
  aktif: true,
  createdAt: "2026-09-30T00:00:00Z",
  updatedAt: "2026-09-30T00:00:00Z",
  deactivatedAt: "",
};

test("toPublicEmployee drops pinHash from the API projection", () => {
  const projection = toPublicEmployee(employee);
  assert.equal("pinHash" in projection, false);
  assert.equal("pinHash" in toPublicEmployee({ ...employee, pinHash: "x$y" }), false);
  assert.deepEqual(Object.keys(projection).sort(), [
    "aktif",
    "cabangAktif",
    "cabangTerafiliasi",
    "createdAt",
    "employeeId",
    "nama",
    "role",
    "updatedAt",
    "username",
  ]);
  assert.ok(!JSON.stringify(projection).includes("c0ffee"));
});

test("parseRole normalizes the canonical Admin/Petugas roles and supports legacy aliases", () => {
  assert.equal(parseRole("admin"), "admin");
  assert.equal(parseRole("petugas"), "petugas");
  assert.equal(parseRole("karyawan"), "petugas");
  assert.equal(parseRole(" kepala_cabang "), "petugas");
  assert.equal(parseRole("kepala-cabang"), "petugas");
  assert.throws(() => parseRole(""), /Role tidak dikenal/);
  assert.throws(() => parseRole("manager"), /Role tidak dikenal/);
});

test("employeeFromRow reads role and branch fields by header in the legacy Registry layout", () => {
  const headers = [
    "Employee_ID",
    "Username",
    "PIN_Hash",
    "Nama",
    "Role",
    "Cabang_Aktif",
    "Cabang_Terafiliasi",
    "Aktif",
    "Failed_Login_Attempts",
    "Locked_Until",
  ];
  const parsed = employeeFromRow(headers, [
    "EMP-001",
    "taufik",
    "pin-hash",
    "Taufik",
    "petugas",
    "CBG01BDG, CBG02CMH",
    "CBG01BDG, CBG02CMH",
    "TRUE",
    "0",
    "",
  ]);

  assert.equal(parsed.role, "petugas");
  assert.equal(parsed.cabangAktif, "CBG01BDG, CBG02CMH");
  assert.deepEqual(parsed.cabangTerafiliasi, ["CBG01BDG", "CBG02CMH"]);
  assert.equal(parsed.normalizedUsername, "taufik");
});

test("employeeFromRow reads expanded Registry fields by their headers", () => {
  const parsed = employeeFromRow(
    [
      "Employee_ID",
      "Username",
      "Normalized_Username",
      "PIN_Hash",
      "Nama",
      "Role",
      "Cabang_Aktif",
      "Cabang_Terafiliasi",
      "Aktif",
      "Failed_Login_Attempts",
      "Locked_Until",
      "Created_At",
      "Updated_At",
      "Deactivated_At",
    ],
    [
      "EMP-002",
      "ADMIN",
      "admin",
      "pin-hash",
      "Admin Pusat",
      "admin",
      "",
      "",
      "TRUE",
      "2",
      "",
      "2026-10-01T00:00:00.000Z",
      "2026-10-01T00:00:00.000Z",
      "",
    ],
  );

  assert.equal(parsed.role, "admin");
  assert.equal(parsed.normalizedUsername, "admin");
  assert.equal(parsed.createdAt, "2026-10-01T00:00:00.000Z");
});

test("parseAktif only accepts TRUE", () => {
  assert.equal(parseAktif("TRUE"), true);
  assert.equal(parseAktif(" true "), true);
  assert.equal(parseAktif("FALSE"), false);
  assert.equal(parseAktif(""), false);
});
