import test from "node:test";
import assert from "node:assert/strict";
import { redirectForPage } from "@/lib/nav-guard";

test("redirectForPage mengembalikan null bila role kosong / belum login", () => {
  assert.equal(redirectForPage("/dashboard", null), null);
  assert.equal(redirectForPage("/jadwal-saya", undefined), null);
});

test("redirectForPage mengarahkan karyawan yang mengakses halaman admin-only ke /jadwal-saya", () => {
  assert.equal(redirectForPage("/dashboard", "karyawan"), "/jadwal-saya");
  assert.equal(redirectForPage("/jadwal", "karyawan"), "/jadwal-saya");
  assert.equal(redirectForPage("/approval", "karyawan"), "/jadwal-saya");
  assert.equal(redirectForPage("/cabang", "karyawan"), "/jadwal-saya");
  assert.equal(redirectForPage("/karyawan", "karyawan"), "/jadwal-saya");
  assert.equal(redirectForPage("/laporan", "karyawan"), null);
});

test("redirectForPage mengizinkan karyawan mengakses halaman staff-only dan halaman bersama", () => {
  assert.equal(redirectForPage("/jadwal-saya", "karyawan"), null);
  assert.equal(redirectForPage("/checklist", "karyawan"), null);
  assert.equal(redirectForPage("/handover", "karyawan"), null);
  assert.equal(redirectForPage("/shift/SCH-20260930-001", "karyawan"), null);
  assert.equal(redirectForPage("/incident", "karyawan"), null);
});

test("redirectForPage mengarahkan admin yang mengakses halaman staff-only ke /dashboard", () => {
  assert.equal(redirectForPage("/jadwal-saya", "admin"), "/dashboard");
  assert.equal(redirectForPage("/checklist", "admin"), "/dashboard");
  assert.equal(redirectForPage("/handover", "admin"), "/dashboard");
});

test("redirectForPage mengizinkan admin mengakses halaman admin dan bersama", () => {
  assert.equal(redirectForPage("/dashboard", "admin"), null);
  assert.equal(redirectForPage("/jadwal", "admin"), null);
  assert.equal(redirectForPage("/checklist-template", "admin"), null);
  assert.equal(redirectForPage("/shift/SCH-20260930-001", "admin"), null);
  assert.equal(redirectForPage("/incident", "admin"), null);
  assert.equal(redirectForPage("/laporan", "admin"), null);
});

test("mencegah tabrakan prefix antara /jadwal vs /jadwal-saya dan /checklist vs /checklist-template", () => {
  // karyawan mengakses /jadwal-saya -> null (bukan dipantulkan karena /jadwal)
  assert.equal(redirectForPage("/jadwal-saya", "karyawan"), null);

  // admin mengakses /checklist-template -> null (bukan dipantulkan karena /checklist)
  assert.equal(redirectForPage("/checklist-template", "admin"), null);
});
