/**
 * Sumber tunggal untuk semua item navigasi (UI-PLAN §Navigasi).
 *
 * Desktop memakai nav horizontal, mobile memakai dock 4 tab + "Lainnya" — keduanya membaca dari
 * file ini, jadi keduanya tidak mungkin melenceng. Item yang promoted ke tab dock otomatis
 * dikeluarkan dari grup "Lainnya" lewat `groupsWithoutTabs()`.
 *
 * Menu pengelolaan dan template hanya boleh dibuka Admin; Karyawan mendapat menu kerja shift.
 */

export type NavItem = { href: string; label: string; icon: string; adminOnly?: boolean };
export type NavGroup = { label: string; items: NavItem[]; adminOnly?: boolean };

const OPERASIONAL: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", adminOnly: true },
  { href: "/jadwal", label: "Jadwal", icon: "calendar_today", adminOnly: true },
  { href: "/incident", label: "Incident", icon: "report" },
  { href: "/laporan", label: "Laporan", icon: "bar_chart" },
];

const MASTER_DATA: NavItem[] = [
  { href: "/cabang", label: "Cabang", icon: "storefront" },
  { href: "/karyawan", label: "Karyawan", icon: "group" },
  { href: "/shift-template", label: "Shift Template", icon: "schedule" },
  { href: "/kategori-izin", label: "Kategori Izin", icon: "label" },
  { href: "/kategori-incident", label: "Kategori Incident", icon: "label" },
];

const TEMPLATE: NavItem[] = [
  { href: "/checklist-template", label: "Checklist", icon: "checklist", adminOnly: true },
  { href: "/handover-template", label: "Handover", icon: "swap_calls", adminOnly: true },
];

const APPROVAL: NavItem[] = [{ href: "/approval", label: "Approval Hub", icon: "approval", adminOnly: true }];

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  { label: "Operasional", items: OPERASIONAL },
  // Master data hanya dikelola oleh Admin.
  { label: "Master Data", adminOnly: true, items: MASTER_DATA },
  { label: "Template", items: TEMPLATE },
  { label: "Approval", items: APPROVAL },
];

/**
 * Empat tab dock untuk admin. Alasannya: Dashboard (monitoring), Jadwal (pekerjaan
 * inti), Approval (antrean harian), Laporan (rekap). Sisanya konfigurasi yang jarang dibuka dan
 * pindah ke sheet "Lainnya". Menukar prioritas cukup mengubah array ini.
 */
export const ADMIN_DOCK_TABS: NavItem[] = [
  OPERASIONAL[0],
  OPERASIONAL[1],
  APPROVAL[0],
  OPERASIONAL[2],
];

/** Ekstra di sheet "Lainnya" untuk admin. Profil & Keluar tetap di header, jadi tidak diulang. */
export const ADMIN_DOCK_EXTRAS: NavItem[] = [
  { href: "/pilih-cabang", label: "Pilih Cabang", icon: "storefront" },
];

/**
 * Karyawan (petugas shift) — hanya pekerjaan lapangan, tanpa menu admin.
 *
 * Empat pekerjaan nyata petugas: lihat jadwal & urus swap/izin, kerjakan checklist,
 * isi handover, dan laporkan incident. Swap/izin/riwayat digabung sebagai tab di dalam
 * `/jadwal-saya`, bukan entri dock terpisah — jadi route lama `/swap/ajukan`,
 * `/izin/ajukan`, dan `/riwayat` tetap ada sebagai redirect tapi keluar dari semua nav.
 */
export const KARYAWAN_ITEMS: NavItem[] = [
  { href: "/jadwal-saya", label: "Jadwal", icon: "event_note" },
  { href: "/checklist", label: "Checklist", icon: "checklist" },
  { href: "/handover", label: "Handover", icon: "swap_calls" },
  { href: "/incident", label: "Incident", icon: "report" },
];

export const KARYAWAN_NAV_ITEMS: NavItem[] = [
  ...KARYAWAN_ITEMS,
  { href: "/laporan", label: "Laporan", icon: "bar_chart" },
  { href: "/profil", label: "Profil", icon: "person" },
];

export const KARYAWAN_DOCK_TABS: NavItem[] = KARYAWAN_ITEMS;

export const KARYAWAN_DOCK_EXTRAS: NavItem[] = [
  { href: "/laporan", label: "Laporan", icon: "bar_chart" },
  { href: "/profil", label: "Profil", icon: "person" },
  { href: "/pilih-cabang", label: "Pilih Cabang", icon: "storefront" },
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
