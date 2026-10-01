/**
 * Sumber tunggal untuk semua item navigasi (UI-PLAN §Navigasi).
 *
 * Desktop memakai nav horizontal, mobile memakai dock 4 tab + "Lainnya" keduanya membaca dari
 * file ini, jadi keduanya tidak mungkin melenceng. Item yang promoted ke tab dock otomatis
 * dikeluarkan dari grup "Lainnya" lewat `groupsWithoutTabs()`.
 *
 * Menu pengelolaan dan template hanya boleh dibuka Admin; Petugas mendapat menu kerja shift.
 */

export type NavItem = { href: string; label: string; icon: string; adminOnly?: boolean };
export type NavGroup = { label: string; items: NavItem[]; adminOnly?: boolean };

const OPERASIONAL: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", adminOnly: true },
  { href: "/jadwal", label: "Jadwal", icon: "event_note", adminOnly: true },
  { href: "/jadwal-petugas", label: "Jadwal Petugas", icon: "event_note", adminOnly: true },
  { href: "/checklist", label: "Checklist", icon: "checklist" },
  { href: "/handover", label: "Handover", icon: "swap_calls" },
  { href: "/incident", label: "Incident", icon: "report" },
  { href: "/laporan", label: "Laporan", icon: "bar_chart" },
];

const MASTER_DATA: NavItem[] = [
  { href: "/cabang", label: "Cabang", icon: "storefront", adminOnly: true },
  { href: "/karyawan", label: "Petugas", icon: "group", adminOnly: true },
  { href: "/shift-template", label: "Shift Template", icon: "schedule", adminOnly: true },
  { href: "/kategori-izin", label: "Kategori Izin", icon: "label", adminOnly: true },
  { href: "/kategori-incident", label: "Kategori Incident", icon: "label", adminOnly: true },
];

const TEMPLATE: NavItem[] = [
  { href: "/checklist-template", label: "Checklist", icon: "checklist", adminOnly: true },
  { href: "/handover-template", label: "Handover", icon: "swap_calls", adminOnly: true },
];

const APPROVAL: NavItem[] = [{ href: "/approval", label: "Approval Hub", icon: "approval", adminOnly: true }];

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: "Monitoring & Laporan",
    items: [OPERASIONAL[0], OPERASIONAL[6], APPROVAL[0]],
  },
  { label: "KELOLA SHIFT", items: [OPERASIONAL[1], OPERASIONAL[2], OPERASIONAL[4], MASTER_DATA[2]] },
  { label: "KELOLA PETUGAS", adminOnly: true, items: [MASTER_DATA[0], MASTER_DATA[1], MASTER_DATA[3]] },
  { label: "KELOLA INCIDENT", items: [OPERASIONAL[5], MASTER_DATA[4]] },
  { label: "KELOLA CHECKLIST", items: [OPERASIONAL[3], TEMPLATE[0], TEMPLATE[1]] },
];

/** Dashboard, approval, laporan, dan pengaturan khusus Admin dikelompokkan di luar tab kerja. */
export const ADMIN_DESKTOP_PRIMARY: NavItem[] = [
  { href: "/jadwal", label: "Jadwal", icon: "event_note", adminOnly: true },
  { href: "/checklist", label: "Checklist", icon: "checklist" },
  { href: "/handover", label: "Handover", icon: "swap_calls" },
  { href: "/incident", label: "Incident", icon: "report" },
];

export const ADMIN_SETTINGS_GROUPS: NavGroup[] = [
  { label: "Monitoring & Laporan", items: [OPERASIONAL[0], APPROVAL[0], OPERASIONAL[6]] },
  { label: "KELOLA SHIFT", items: [OPERASIONAL[1], OPERASIONAL[2], OPERASIONAL[4], MASTER_DATA[2]] },
  { label: "KELOLA PETUGAS", items: [MASTER_DATA[0], MASTER_DATA[1], MASTER_DATA[3]] },
  { label: "KELOLA INCIDENT", items: [OPERASIONAL[5], MASTER_DATA[4]] },
  { label: "KELOLA CHECKLIST", items: [OPERASIONAL[3], TEMPLATE[0], TEMPLATE[1]] },
];

/**
 * Empat tab kerja Admin memakai label/fungsi yang sama dengan tab Petugas.
 * Jadwal Admin menuju kalender pengelolaan; Checklist dan Handover membuka shift picker
 * yang juga dapat dipakai Admin untuk memeriksa atau mengoreksi data operasional.
 */
export const ADMIN_DOCK_TABS: NavItem[] = [
  { href: "/jadwal", label: "Jadwal", icon: "event_note", adminOnly: true },
  { href: "/checklist", label: "Checklist", icon: "checklist" },
  { href: "/handover", label: "Handover", icon: "swap_calls" },
  { href: "/incident", label: "Incident", icon: "report" },
];

/** Ekstra di sheet "Lainnya" untuk admin. Profil & Keluar tetap di header, jadi tidak diulang. */
export const ADMIN_DOCK_EXTRAS: NavItem[] = [
  { href: "/pilih-cabang", label: "Pilih Cabang", icon: "storefront" },
];

/**
 * Petugas hanya mendapat pekerjaan lapangan, tanpa menu pengelolaan Admin.
 *
 * Empat pekerjaan nyata petugas: lihat jadwal & urus swap/izin, kerjakan checklist,
 * isi handover, dan laporkan incident. Swap/izin/riwayat digabung sebagai tab di dalam
 * `/jadwal-saya`, bukan entri dock terpisah jadi route lama `/swap/ajukan`,
 * `/izin/ajukan`, dan `/riwayat` tetap ada sebagai redirect tapi keluar dari semua nav.
 */
export const PETUGAS_ITEMS: NavItem[] = [
  { href: "/jadwal-saya", label: "Jadwal", icon: "event_note" },
  { href: "/checklist", label: "Checklist", icon: "checklist" },
  { href: "/handover", label: "Handover", icon: "swap_calls" },
  { href: "/incident", label: "Incident", icon: "report" },
];

export const PETUGAS_NAV_ITEMS: NavItem[] = [
  ...PETUGAS_ITEMS,
  { href: "/laporan", label: "Laporan", icon: "bar_chart" },
  { href: "/profil", label: "Profil", icon: "person" },
];

export const PETUGAS_DOCK_TABS: NavItem[] = PETUGAS_ITEMS;

export const PETUGAS_DOCK_EXTRAS: NavItem[] = [
  { href: "/laporan", label: "Laporan", icon: "bar_chart" },
  { href: "/profil", label: "Profil", icon: "person" },
];

/** Buang grup/item bertanda `adminOnly` saat pengguna bukan admin. */
export function groupsForRole(groups: NavGroup[], isAdmin: boolean): NavGroup[] {
  return groups
    .filter((group) => isAdmin || !group.adminOnly)
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => isAdmin || !item.adminOnly),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Buang item yang sudah jadi tab dock dari grup "Lainnya", lalu buang grup yang jadi kosong.
 * Tanpa ini, "Jadwal" akan muncul dua kali: sekali di dock, sekali di sheet.
 */
export function groupsWithoutTabs(groups: NavGroup[], tabs: NavItem[]): NavGroup[] {
  const promoted = new Set(tabs.map((item) => item.href));
  return groups
    .map((group) => ({ label: group.label, items: group.items.filter((item) => !promoted.has(item.href)) }))
    .filter((group) => group.items.length > 0);
}

export function itemsForRole(items: NavItem[], isAdmin: boolean): NavItem[] {
  return items.filter((item) => isAdmin || !item.adminOnly);
}
