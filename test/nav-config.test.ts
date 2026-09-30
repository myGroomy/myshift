import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_DESKTOP_PRIMARY,
  ADMIN_DOCK_EXTRAS,
  ADMIN_DOCK_TABS,
  ADMIN_NAV_GROUPS,
  ADMIN_SETTINGS_GROUPS,
  PETUGAS_DOCK_EXTRAS,
  PETUGAS_DOCK_TABS,
  PETUGAS_NAV_ITEMS,
  groupsForRole,
  groupsWithoutTabs,
  type NavGroup,
} from "@/components/nav-config";

// UI-PLAN §4: dock 4 tab + "Lainnya". Invariant yang dijaga test ini kalau salah satu dilanggar,
// user akan melihat menu yang sama dua kali atau kehilangan jalan ke suatu halaman.

const flatten = (groups: NavGroup[]) => groups.flatMap((group) => group.items);

test("dock admin persis 4 tab", () => {
  assert.equal(ADMIN_DOCK_TABS.length, 4);
  assert.deepEqual(
    ADMIN_DOCK_TABS.map((item) => item.href),
    ["/jadwal", "/checklist", "/handover", "/incident"],
  );
});

test("navigasi Admin memakai empat tab kerja yang sama dan mengelompokkan fitur tambahannya", () => {
  assert.deepEqual(
    ADMIN_DESKTOP_PRIMARY.map((item) => item.href),
    ["/jadwal", "/checklist", "/handover", "/incident"],
  );
  const settings = flatten(ADMIN_SETTINGS_GROUPS).map((item) => item.href);
  assert.deepEqual(settings, [
    "/dashboard",
    "/approval",
    "/laporan",
    "/cabang",
    "/karyawan",
    "/shift-template",
    "/kategori-izin",
    "/kategori-incident",
    "/checklist-template",
    "/handover-template",
  ]);
  assert.equal(
    new Set([...ADMIN_DESKTOP_PRIMARY, ...flatten(ADMIN_SETTINGS_GROUPS)].map((item) => item.href)).size,
    14,
  );
});

test("dock Petugas persis 4 tab", () => {
  assert.equal(PETUGAS_DOCK_TABS.length, 4);
  assert.deepEqual(
    PETUGAS_DOCK_TABS.map((item) => item.href),
    ["/jadwal-saya", "/checklist", "/handover", "/incident"],
  );
});

test("tab utama Admin dan Karyawan sama secara fungsi dan label", () => {
  assert.deepEqual(
    ADMIN_DOCK_TABS.map(({ label, icon }) => [label, icon]),
    PETUGAS_DOCK_TABS.map(({ label, icon }) => [label, icon]),
  );
});

test("setiap tab dock punya ikon (Material Symbols) dan label", () => {
  for (const item of [...ADMIN_DOCK_TABS, ...PETUGAS_DOCK_TABS, ...PETUGAS_NAV_ITEMS]) {
    assert.ok(item.icon.length > 0, `${item.href} tanpa ikon`);
    assert.ok(item.label.length > 0, `${item.href} tanpa label`);
    assert.ok(item.href.startsWith("/"), `${item.href} bukan path absolut`);
  }
});

test("menu Admin tidak tersedia ke Karyawan dan grup kosong dihapus", () => {
  const asEmployee = groupsForRole(ADMIN_NAV_GROUPS, false);
  const hrefs = flatten(asEmployee).map((item) => item.href);
  assert.equal(hrefs.includes("/handover-template"), false, "Karyawan tidak boleh melihat template Handover");
  assert.equal(hrefs.includes("/checklist-template"), false, "Karyawan tidak boleh melihat template Checklist");
  assert.equal(hrefs.includes("/cabang"), false, "master data khusus Admin");
  assert.equal(hrefs.includes("/dashboard"), false);
  assert.equal(hrefs.includes("/jadwal"), false);
  assert.equal(hrefs.includes("/approval"), false);
  assert.equal(hrefs.includes("/incident"), true, "Incident dapat diakses kedua role");
  assert.equal(hrefs.includes("/laporan"), true, "Laporan dapat diakses kedua role");
  assert.equal(
    asEmployee.some((group) => group.items.length === 0),
    false,
    "grup kosong tidak boleh ikut (hanya terisi label tanpa isi)",
  );

  const asAdmin = flatten(groupsForRole(ADMIN_NAV_GROUPS, true)).map((item) => item.href);
  assert.equal(asAdmin.includes("/cabang"), true);
  assert.equal(asAdmin.includes("/handover-template"), true);
});

test("groupsWithoutTabs membuang tab dock dari 'Lainnya' supaya tidak tampil dua kali", () => {
  const groups = groupsWithoutTabs(groupsForRole(ADMIN_NAV_GROUPS, true), ADMIN_DOCK_TABS);
  const hrefs = flatten(groups).map((item) => item.href);
  for (const tab of ADMIN_DOCK_TABS) {
    assert.equal(hrefs.includes(tab.href), false, `${tab.href} masih muncul di Lainnya`);
  }
  // Sisa yang harusnya masih terjangkau lewat sheet.
  for (const href of ["/cabang", "/karyawan", "/shift-template", "/kategori-izin", "/checklist-template", "/handover-template"]) {
    assert.equal(hrefs.includes(href), true, `${href} hilang dari Lainnya jadi tidak terjangkau`);
  }
});

test("grup yang seluruh isinya jadi tab dock tidak muncul sebagai grup kosong", () => {
  const groups = groupsWithoutTabs(
    [
      { label: "Operasional", items: ADMIN_DOCK_TABS },
      { label: "Master Data", items: [{ href: "/cabang", label: "Cabang", icon: "storefront" }] },
    ],
    ADMIN_DOCK_TABS,
  );
  assert.deepEqual(groups.map((group) => group.label), ["Master Data"]);
});

test("tidak ada href yang muncul dua kali di dock admin (tabs + Lainnya + extras)", () => {
  const seen = new Map<string, string>();
  const register = (label: string, href: string) => {
    const previous = seen.get(href);
    assert.equal(previous, undefined, `${href} dobel: ${previous} dan ${label}`);
    seen.set(href, label);
  };
  for (const item of ADMIN_DOCK_TABS) register("tab", item.href);
  for (const item of flatten(groupsWithoutTabs(ADMIN_NAV_GROUPS, ADMIN_DOCK_TABS))) register("lainnya", item.href);
  for (const item of ADMIN_DOCK_EXTRAS) register("extras", item.href);
  assert.ok(seen.size > 4, "dock harus punya lebih dari 4 tujuan");
});

test("Petugas: profil & pilih cabang tetap terjangkau, logout ditangani pemanggil", () => {
  const hrefs = PETUGAS_DOCK_EXTRAS.map((item) => item.href);
  assert.ok(hrefs.includes("/profil"));
  assert.ok(hrefs.includes("/pilih-cabang"));
  // Nav desktop Petugas memuat Profil juga; dock + nav tidak boleh dobel di layar yang sama
  // (dock lg:hidden), jadi Profil sengaja ada di nav desktop DAN di Lainnya mobile.
  assert.ok(PETUGAS_NAV_ITEMS.some((item) => item.href === "/profil"));
  assert.ok(PETUGAS_NAV_ITEMS.some((item) => item.href === "/laporan"));
  assert.ok(hrefs.includes("/laporan"), "Laporan tersedia di Lainnya mobile");
  assert.equal(PETUGAS_DOCK_TABS.some((item) => item.href === "/profil"), false, "Profil bukan tab dock");
});
