import test from "node:test";
import assert from "node:assert/strict";
import { parseAktif, parseRole, toPublicEmployee, type Employee } from "@/lib/google/registry";

const employee: Employee = {
  employeeId: "EMP-001",
  username: "admin",
  pinHash: "deadbeef$c0ffee",
  nama: "Admin Pusat",
  role: "admin",
  cabangAktif: "CBG001",
  cabangTerafiliasi: ["CBG002"],
  aktif: true,
};

test("toPublicEmployee drops pinHash from the API projection", () => {
  const projection = toPublicEmployee(employee);
  assert.equal("pinHash" in projection, false);
  assert.equal("pinHash" in toPublicEmployee({ ...employee, pinHash: "x$y" }), false);
  assert.deepEqual(Object.keys(projection).sort(), [
    "aktif",
    "cabangAktif",
    "cabangTerafiliasi",
    "employeeId",
    "nama",
    "role",
    "username",
  ]);
  assert.ok(!JSON.stringify(projection).includes("c0ffee"));
});

test("parseRole maps only admin to admin and migrates every other stored role to karyawan", () => {
  assert.equal(parseRole("admin"), "admin");
  assert.equal(parseRole("karyawan"), "karyawan");
  assert.equal(parseRole(" kepala_cabang "), "karyawan");
  assert.equal(parseRole("kepala-cabang"), "karyawan");
  assert.equal(parseRole(""), "karyawan");
});

test("parseAktif only accepts TRUE", () => {
  assert.equal(parseAktif("TRUE"), true);
  assert.equal(parseAktif(" true "), true);
  assert.equal(parseAktif("FALSE"), false);
  assert.equal(parseAktif(""), false);
});
