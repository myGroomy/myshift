import test from "node:test";
import assert from "node:assert/strict";
import { redirectForPage } from "@/lib/nav-guard";

test("redirectForPage mengembalikan null bila role kosong / belum login", () => {
  assert.equal(redirectForPage("/dashboard", null), null);
  assert.equal(redirectForPage("/jadwal-saya", undefined), null);
});

test("redirectForPage mengarahkan petugas yang mengakses halaman admin-only ke /jadwal-saya", () => {
  assert.equal(redirectForPage("/dashboard", "petugas"), "/jadwal-saya");
  assert.equal(redirectForPage("/jadwal", "petugas"), "/jadwal-saya");
  assert.equal(redirectForPage("/approval", "petugas"), "/jadwal-saya");
  assert.equal(redirectForPage("/cabang", "petugas"), "/jadwal-saya");
  assert.equal(redirectForPage("/karyawan", "petugas"), "/jadwal-saya");
  assert.equal(redirectForPage("/laporan", "petugas"), null);
});

test("redirectForPage mengizinkan petugas mengakses halaman kerja dan halaman bersama", () => {
  assert.equal(redirectForPage("/jadwal-saya", "petugas"), null);
  assert.equal(redirectForPage("/checklist", "petugas"), null);
  assert.equal(redirectForPage("/handover", "petugas"), null);
  assert.equal(redirectForPage("/shift/SCH-20260930-001", "petugas"), null);
  assert.equal(redirectForPage("/incident", "petugas"), null);
});

test("redirectForPage mengarahkan admin dari jadwal personal ke /dashboard", () => {
  assert.equal(redirectForPage("/jadwal-saya", "admin"), "/dashboard");
});

test("redirectForPage mengizinkan admin mengakses halaman admin dan bersama", () => {
  assert.equal(redirectForPage("/dashboard", "admin"), null);
  assert.equal(redirectForPage("/jadwal", "admin"), null);
  assert.equal(redirectForPage("/checklist-template", "admin"), null);
  assert.equal(redirectForPage("/shift/SCH-20260930-001", "admin"), null);
  assert.equal(redirectForPage("/checklist", "admin"), null);
  assert.equal(redirectForPage("/handover", "admin"), null);
  assert.equal(redirectForPage("/incident", "admin"), null);
  assert.equal(redirectForPage("/laporan", "admin"), null);
});

test("mencegah tabrakan prefix antara /jadwal vs /jadwal-saya dan /checklist vs /checklist-template", () => {
  // Petugas mengakses /jadwal-saya -> null (bukan dipantulkan karena /jadwal)
  assert.equal(redirectForPage("/jadwal-saya", "petugas"), null);

  // admin mengakses /checklist-template -> null (bukan dipantulkan karena /checklist)
  assert.equal(redirectForPage("/checklist-template", "admin"), null);
});
