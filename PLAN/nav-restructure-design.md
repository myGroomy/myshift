# Nav Restructure Design Navigasi Bersama 4 Tab & Halaman Jadwal Terpadu

Status: implementasi awal 2026-09-29; disempurnakan sesuai keputusan user (2026-09-30)

## 1. Masalah

Dock Petugas saat ini: **Dashboard · Jadwal · Approval · Incident** memakai menu admin.
Padahal Petugas bukan pengelola: dashboard, approval, dan kelola
jadwal bukan kerjaannya. Petugas punya 4 pekerjaan nyata:

1. Lihat jadwal & urus swap/izin
2. Kerjakan checklist shift
3. Isi handover shift
4. Laporkan incident

Selain itu, `icon="report"` dipakai oleh `/incident` tapi **tidak ada di `ICON_MAP`**
(`components/dock.tsx`) jadi ikonnya jatuh ke fallback `LayoutDashboard`.

Ada cela terkait: `GET /api/shifts` bersifat admin-only (`app/api/shifts/route.ts:11`) dan
`SchedulePage` versi Petugas sengaja tidak memanggilnya (`components/phase1.tsx:825`).
Akibatnya tab Jadwal Saya menampilkan ID shift mentah ("SFT001"), bukan nama shift.

## 2. Keputusan desain

### 2.1 Navigasi & Dock (`components/nav-config.ts`)

**Empat tab kerja utama sama pada kedua role:**

| href | label | ikon |
|---|---|---|
| `/jadwal-saya` | Jadwal | `event_note` |
| `/checklist` | Checklist | `checklist` |
| `/handover` | Handover | `swap_calls` |
| `/incident` | Incident | `report` |

- `PETUGAS_DOCK_TABS` = `PETUGAS_ITEMS` (tepat 4)
- `ADMIN_DOCK_TABS` memakai label dan fungsi yang sama: Jadwal (`/jadwal` untuk kelola kalender),
  Checklist (`/checklist`), Handover (`/handover`), dan Incident (`/incident`)
- `PETUGAS_NAV_ITEMS` = items + `/profil` (desktop)
- `PETUGAS_DOCK_EXTRAS` tidak berubah
- Dashboard, Approval, Laporan, template, dan master data Admin tidak mengambil slot tab utama;
  semuanya dikelompokkan pada menu **Pengelolaan** desktop dan **Lainnya** mobile
- Admin dapat memakai shift picker Checklist/Handover untuk memeriksa atau mengoreksi catatan pada
  cabang aktif; halaman tersebut menggunakan navigasi Admin ketika dibuka oleh Admin
- Route lama `/swap/ajukan`, `/izin/ajukan`, `/riwayat` tetap ada tapi keluar dari semua nav
- `ICON_MAP` diberi kunci `report: AlertTriangle`

### 2.2 Halaman Jadwal jadi 4 tab

`/jadwal-saya?tab=jadwal|swap|izin|riwayat` (default `jadwal`), 4 tab datar.

- Tab 1 `jadwal` → `ScheduleContent` (konten dari `SchedulePage(mine)` tanpa Shell)
- Tab 2 `swap` → `SwapAjukanContent`
- Tab 3 `izin` → `IzinAjukanContent`
- Tab 4 `riwayat` → `RiwayatContent`

Komponen baru `components/jadwal-saya.tsx` memegang Shell + segmented control + state tab.
`SchedulePage` (admin, dipakai `/jadwal`) **tidak berubah perilaku**.

Redirect (hanya `page.tsx` diganti, komponen tetap):

- `/swap/ajukan` → `/jadwal-saya?tab=swap`
- `/izin/ajukan` → `/jadwal-saya?tab=izin`
- `/riwayat` → `/jadwal-saya?tab=riwayat`

### 2.3 Halaman `/checklist` & `/handover`

Komponen bersama `ShiftPicker({ mode })` di `components/shift-picker.tsx`.

- Ambil `/api/schedules?startDate=…&endDate=…` API sudah otomatis menyaring ke jadwal
  sendiri untuk Petugas (`app/api/schedules/route.ts:71`), sementara Admin melihat jadwal cabang
  aktif; API mendukung rentang tanggal
- Kelompok: **Hari ini** → **Mendatang** → **Selesai (7 hari terakhir)**
- Tiap baris: tanggal, nama shift + jam, `StatusBadge`, progres checklist
- Klik → `/shift/[id]?tab=checklist` atau `?tab=handover` (Layar Shift Terpadu, tanpa
  perubahan)

### 2.4 Perbaikan nama shift Opsi A (dipilih user)

Enrich response `GET /api/schedules` dengan `shiftName`, `startTime`, `endTime`.

Route itu **sudah membaca** baris `Shifts` untuk hitung konflik
(`app/api/schedules/route.ts:24-28`), jadi nol request tambahan, **tanpa perubahan
otorisasi**, dan bug "SFT001" langsung hilang.

Proyeksi ditarik ke fungsi murni `lib/google/schedules-data.ts` (meniru pola
`ops-data.ts`) supaya bisa diuji tanpa Sheets. `API-CONTRACT.md` §5 di-update commit sama.

Ditolak: opsi B (longgarkan `GET /api/shifts` ke `staffSession`) perubahan otorisasi
endpoint, dan Petugas jadi bisa baca semua shift template cabang.

### 2.5 Guard arah (`middleware.ts` + `lib/nav-guard.ts`)

Guard di **middleware** satu tempat, session sudah diverifikasi di sana. Logika murni
diekstrak ke `lib/nav-guard.ts` supaya unit-testable.

Pencocokan: `path === entry || path.startsWith(entry + "/")`. Aturan ini membuat semua
tabrakan nama aman (`/jadwal` tidak menangkap `/jadwal-saya`, `/checklist` tidak
menangkap `/checklist-template`).

```
ADMIN_ONLY  /dashboard  /jadwal  /approval  /cabang  /karyawan
            /shift-template  /checklist-template  /handover-template
            /kategori-izin  /kategori-incident

STAFF_ONLY  /jadwal-saya
```

- Petugas masuk `ADMIN_ONLY` → `/jadwal-saya`
- checklist, handover, incident, laporan, dan halaman shift dapat diakses kedua role

Simetris dengan redirect login yang sudah ada (`middleware.ts:37-41`).

**Tanpa guard** (dua peran, tidak boleh diblokir): `/`, `/login`, `/profil`,
`/pilih-cabang`, `/incident` (+ `/ajukan`, `/[id]`), `/shift/[id]`.
`/shift` sengaja tidak masuk set karena dipakai kedua peran.

`/swap/ajukan`, `/izin/ajukan`, `/riwayat` tidak dimasukkan sudah redirect dari 2.2.

Catatan: API tetap dikunci per-endpoint lewat `adminSession` seperti sekarang. Guard ini
menutup celah **halaman**, bukan menggantikan API auth.

### 2.6 Perbaikan insidental: `EmptyState icon` render teks literal

`EmptyStateProps.icon` bertipe `React.ReactNode` (`components/ui/empty-state.tsx:5`), tapi
7 call site mengoper string (`icon="storefront"`, `icon="event"`, `icon="history"`, dst).
Karena string truthy, `{icon || <Inbox/>}` me-render **teks literal** "storefront"/"event",
bukan ikon. Semua call site diubah mengoper elemen Lucide (`<Store/>`, `<CalendarDays/>`,
dst).

## 3. Test

**Baru**

- `test/nav-guard.test.ts` aturan redirect murni + uji tabrakan awalan
  (`/jadwal` ≠ `/jadwal-saya`, `/checklist` ≠ `/checklist-template`, `/shift` di luar set)
- `test/schedules-projection.test.ts` proyeksi enrichmen 2.4 dari baris mentah

**Diupdate**

- `test/nav-config.test.ts` href `PETUGAS_DOCK_TABS` = `jadwal-saya · checklist ·
  handover · incident` (panjang 4), assert `/swap`, `/izin`, `/riwayat` keluar dari nav
  Petugas

## 4. Dokumen (commit yang sama AGENTS.md §6 poin 3–4)

- `PLAN/UI-PLAN.md` §4.1 dock Petugas; §2.3 Jadwal Saya jadi 4 tab; redirect lama;
  dua layar baru `/checklist` & `/handover`
- `PLAN/API-CONTRACT.md` §5 `GET /api/schedules` menambah `shiftName`, `startTime`,
  `endTime`
- `PLAN/SHEETS-SCHEMA.md` **tidak berubah** (tidak ada sheet/kolom baru)

## 5. Di luar lingkup

- Role kanonis adalah `admin` dan `petugas`; role lama `karyawan`/`kepala_cabang` dinormalisasi
  menjadi `petugas`. Seluruh konfigurasi/template dikelola Admin.
- Test Fase 5 incident
- Provisioning cabang `CBG01BDG` / `CBG02CMH`

## 6. Gerbang validasi

`tsc --noEmit` · `oxlint` · `npm test` · `next build`
