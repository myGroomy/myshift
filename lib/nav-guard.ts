/**
 * Guard arah untuk halaman — bukan untuk API.
 *
 * Setiap peran punya halaman yang memang bukan miliknya: petugas tidak perlu membuka
 * dashboard/approval/kelola master, dan admin tidak memakai halaman shift-picker milik
 * petugas. Guard ini memantulkan ke halaman rumah peran masing-masing supaya tidak ada
 * yang mendarat di layar yang tidak berarti baginya.
 *
 * Ditaruh di `middleware.ts` karena session sudah diverifikasi di sana. Logikanya murni
 * (tanpa request/Sheets) supaya bisa diuji langsung di `test/nav-guard.test.ts`.
 *
 * Catatan: guard ini menutup celah **halaman**. Otorisasi data tetap dikunci per-endpoint
 * lewat `adminSession`/`staffSession` di `lib/route-auth.ts` — keduanya saling melengkapi,
 * bukan saling menggantikan.
 */

/** Halaman yang hanya masuk akal untuk admin. */
export const ADMIN_ONLY_PAGES = [
  "/dashboard",
  "/jadwal",
  "/approval",
  "/cabang",
  "/karyawan",
  "/shift-template",
  "/checklist-template",
  "/handover-template",
  "/kategori-izin",
  "/kategori-incident",
] as const;

/** Halaman kerja lapangan yang hanya dipakai petugas (karyawan). */
export const STAFF_ONLY_PAGES = ["/jadwal-saya", "/checklist", "/handover"] as const;

/**
 * Cocokkan path persis atau sebagai induk segmen.
 *
 * Syarat `startsWith(entry + "/")` — bukan sekadar `startsWith(entry)` — yang membuat
 * tabrakan nama aman: `/jadwal` tidak menangkap `/jadwal-saya`, `/checklist` tidak
 * menangkap `/checklist-template`, dan `/shift` bisa sengaja tidak ikut masuk set
 * karena halaman detail shift (`/shift/[id]`) dipakai kedua peran.
 */
function matches(path: string, entries: readonly string[]): boolean {
  return entries.some((entry) => path === entry || path.startsWith(`${entry}/`));
}

/**
 * Tujuan redirect untuk sebuah halaman, atau `null` bila boleh dilanjutkan.
 *
 * `role` kosong mengembalikan `null` — "belum login" sudah ditangani terpisah di
 * middleware. Role selain `admin` diperlakukan sebagai karyawan, jadi nilai tak dikenal
 * gagal ke arah yang tertutup, bukan ke arah yang terbuka.
 */
export function redirectForPage(pathname: string, role: string | null | undefined): string | null {
  if (!role) return null;

  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const isAdmin = role === "admin";

  if (isAdmin) return matches(path, STAFF_ONLY_PAGES) ? "/dashboard" : null;
  return matches(path, ADMIN_ONLY_PAGES) ? "/jadwal-saya" : null;
}
