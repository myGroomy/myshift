# MYSHIFT — UI Plan

> **Versi:** 1.2.0 (1.1.0 pasca Audit UI/UX + §4 Navigasi: dock 4 tab, hamburger dihapus)
> **Tanggal:** 2026-09-29
> **Turunan dari:** `FULL-PRD.md`, `MVP-plan.md`, `UI_UX_AUDIT_MYSHIFT.md`
> **Styling & Design Tokens:** lihat `atlassian-DESIGN.md` (di direktori yang sama: `PLANS/atlassian-DESIGN.md`) — **adaptasi desain di file ini** untuk semua warna, tipografi, spacing, dan komponen. UI-PLAN.md ini **tidak** mendefinisikan styling; fokusnya adalah struktur halaman, konten, dan fungsi tiap layar.

---

## Cara Pakai Dokumen Ini

Untuk tiap halaman di bawah: bangun struktur & fungsi sesuai deskripsi di sini, lalu **adaptasi desain di `atlassian-DESIGN.md`** untuk warna, komponen, dan gaya visual. Dokumen ini adalah kontrak fungsi + layout, bukan kontrak visual.

---

## 1. Peta Halaman

| # | Halaman | Path | Role | Prioritas |
|---|---|---|---|---|
| 1 | Login | `/login` | Semua | MVP |
| 2 | Pilih Cabang | `/pilih-cabang` | Semua (auto-skip jika cabang aktif = 1) | MVP |
| 3 | Profil Saya | `/profil` | Semua | Fase 2 |
| 4 | Jadwal Saya | `/jadwal-saya` | Karyawan | MVP |
| 5 | Layar Shift Terpadu | `/shift/[id]` | Karyawan | Fase 2/3 (Hub 3-Tab: Info, Checklist, Handover) |
| 6 | Ajukan Swap | `/swap/ajukan` | Karyawan | Fase 2 |
| 7 | Ajukan Izin | `/izin/ajukan` | Karyawan | Fase 2 |
| 8 | Riwayat Pengajuan | `/riwayat` | Karyawan | Fase 2 |
| 9 | Dashboard | `/dashboard` | Admin, Kepala Cabang | Fase 4 |
| 10 | Kelola Jadwal | `/jadwal` | Admin (edit), Kepala Cabang (read-only) | MVP |
| 11 | Kelola Karyawan | `/karyawan` | Admin | MVP |
| 12 | Kelola Cabang | `/cabang` | Admin | MVP |
| 13 | Kelola Shift Template | `/shift-template` | Admin | MVP |
| 14 | Kelola Checklist Template | `/checklist-template` | Admin, Kepala Cabang (scoped) | Fase 3 |
| 15 | Kelola Handover Template | `/handover-template` | Admin | Fase 3 |
| 16 | Kelola Kategori Izin | `/kategori-izin` | Admin | Fase 2 |
| 17 | Unified Approval Hub | `/approval` | Admin | Fase 2 (Tab Swap & Izin gabung) |
| 18 | Laporan | `/laporan` | Admin, Kepala Cabang (scoped) | Fase 4 |

---

## 2. Detail Halaman

### 2.1 Login (`/login`)

**Layout:** Form terpusat, single column, max-width kecil (mobile-first — kemungkinan besar dipakai dari HP karyawan di lapangan).

**Elemen:**
- Logo/nama app
- Input: Username
- Input: PIN (masked, numeric)
- Tombol "Masuk"
- State error: PIN salah / akun terkunci (tampilkan sisa waktu lock kalau kena rate-limit)

**Fungsi:** POST ke endpoint auth, dapat session cookie, redirect sesuai role (Admin → `/dashboard`, Karyawan → `/jadwal-saya`).

---

### 2.2 Pilih Cabang (`/pilih-cabang`)

**Layout:** List/grid card cabang aktif milik user.

**Elemen:**
- Card per cabang: nama cabang, indikator "cabang saat ini" kalau ada
- Tap untuk pilih → set konteks cabang aktif di sesi

**Fungsi:** Muncul hanya kalau user (karyawan pindah-pindah, atau admin) punya >1 cabang terafiliasi. Kalau cuma 1 cabang, skip halaman ini otomatis.

---

### 2.3 Jadwal Saya (`/jadwal-saya`) — home karyawan

**Layout:** Header + strip tanggal horizontal (7 hari) + card shift hari terpilih.

**Elemen:**
- Strip tanggal: hari ini di-highlight (pakai token accent dari design file)
- Card shift: nama shift, jam mulai-selesai, tombol "Mulai shift" (kalau hari ini & belum dimulai)
- Shortcut: tombol "Ajukan swap" dan "Ajukan izin"
- Empty state: kalau tidak ada shift di tanggal terpilih ("Tidak ada shift hari ini")

**Fungsi:** Fetch jadwal minggu berjalan untuk karyawan + cabang aktifnya. Tap tanggal lain di strip → ganti card shift yang ditampilkan.

---

### 2.4 Layar Shift Terpadu (`/shift/[id]`)

**Layout:** Single-page hub dengan **Segmented Control / Tab Bar** di atas (atau sticky bottom bar di HP). Mencegah *back-and-forth navigation* di perangkat seluler.

**Struktur 3 Tab:**
1. **Tab 1: Ringkasan & Mulai Shift**
   - Info shift: cabang, jam, tanggal, status (belum mulai / berjalan / selesai)
   - Tombol utama "Mulai Shift" (timestamp) & indikator durasi berjalan
   - Link/preview Handover shift sebelumnya (read-only) untuk konteks operasional
2. **Tab 2: Checklist Shift**
   - Progress bar + counter `(X/Y Selesai)`
   - List item: checkbox + label, item wajib foto punya icon kamera/upload dengan kompresi client-side (<500KB WebP)
   - Tombol Submit — **disabled sampai 100% item tercentang** (disertai feedback/popover penjelas jika dipencet saat belum lengkap)
3. **Tab 3: Handover Shift**
   - Read-only section: isi handover dari shift sebelumnya
   - Form terstruktur (sesuai `Handover_Template`) dengan penanda visual field wajib
   - Tombol Submit Handover — validasi field wajib sebelum submit

---

### 2.5 Ajukan Swap (`/swap/ajukan`)

**Layout:** Form bertahap sederhana (1 halaman).

**Elemen:**
- Pilih shift milik sendiri yang mau ditukar (dropdown/list, dari jadwal mendatang)
- Pilih partner tukar (filter otomatis: hanya tampilkan karyawan yang punya jadwal valid/memungkinkan di tanggal tersebut)
- Textarea alasan (wajib)
- Tombol submit → masuk status "pending"

---

### 2.6 Ajukan Izin (`/izin/ajukan`)

**Layout:** Form sederhana.

**Elemen:**
- Pilih tanggal/shift terdampak
- Dropdown kategori izin (dari `Kategori Izin` yang dikonfigurasi admin)
- Textarea keterangan (wajib)
- Tombol submit → status "pending"

---

### 2.7 Riwayat Pengajuan (`/riwayat`)

**Layout:** List/tab (Swap | Izin | Semua), tiap item card dengan status badge.

**Elemen:**
- Filter tab: Swap / Izin / Semua
- Card per pengajuan: tanggal, ringkasan, status badge (pending/approved/rejected — warna dari role token: warning/success/danger)
- Tap untuk lihat detail (termasuk alasan reject kalau ada)

---

### 2.8 Dashboard (`/dashboard`)

**Layout:** Grid metric cards di atas + tabel status per cabang di bawah. Untuk Kepala Cabang, versi scoped (cuma cabangnya, tanpa selector cabang).

**Elemen:**
- Metric cards: jumlah cabang aktif, shift hari ini, approval pending (dengan shortcut langsung ke `/approval`)
- Tabel status cabang: nama cabang, status checklist (badge), status handover (teks/badge)
- Untuk Admin: selector/filter cabang di header

---

### 2.9 Kelola Jadwal (`/jadwal`)

**Layout:** Grid kalender mingguan (baris = shift, kolom = hari), mode edit untuk Admin, read-only untuk Kepala Cabang.

**Elemen:**
- Selector cabang (Admin) / fixed ke cabang sendiri (Kepala Cabang)
- Navigasi minggu (prev/next) + **Tombol "Duplikat Minggu Lalu"** (menyalin struktur jadwal minggu sebelumnya untuk mempercepat input Admin)
- Grid: klik cell kosong → assign karyawan; klik cell terisi → edit/hapus
- Cell dengan bentrok jadwal → **visual warning badge** + popover info detail bentrok (siapa, jam, cabang lain)
- Legend warna status di bawah grid

---

### 2.10 Kelola Karyawan (`/karyawan`)

**Layout:** Tabel/list dengan tombol tambah di header.

**Elemen:**
- Tabel: nama, role, cabang aktif, status (aktif/nonaktif)
- Tombol "Tambah karyawan" → form modal/halaman terpisah
- Aksi per baris: edit, nonaktifkan
- Search/filter sederhana (nama, cabang)

---

### 2.11 Kelola Cabang (`/cabang`)

**Layout:** Sama pola dengan Kelola Karyawan — tabel + CRUD.

**Elemen:** Nama cabang, status aktif, tombol tambah/edit.

---

### 2.12 Kelola Shift Template (`/shift-template`)

**Layout:** Tabel/list per cabang, CRUD.

**Elemen:** Nama shift (Opening/Middle/Closing/custom), jam mulai, jam selesai.

---

### 2.13 Kelola Checklist Template (`/checklist-template`)

**Layout:** List item checklist, bisa reorder, toggle "wajib foto" per item.

**Elemen:**
- Selector tipe: Opening / Closing
- List item dengan drag-handle (opsional untuk reorder), toggle "wajib foto"
- Tombol tambah item baru
- Untuk Kepala Cabang: scoped ke 1 cabang saja (tanpa selector cabang)

---

### 2.14 Kelola Handover Template (`/handover-template`)

**Layout:** List field, toggle wajib/opsional per field, tipe field (text/textarea).

---

### 2.15 Kelola Kategori Izin (`/kategori-izin`)

**Layout:** List sederhana + tambah/hapus kategori.

---

### 2.16 Unified Approval Hub (`/approval`)

**Layout:** Single-page Approval Hub dengan filter tab `[Semua | Swap | Izin]`.

**Elemen:**
- Card pengajuan (swap & izin terpadu dengan badge tipe pengajuan)
- Detail ringkas: nama pemohon, tipe, tanggal/shift, partner/kategori, alasan/keterangan
- Tombol Approve / Reject langsung di card (dengan konfirmasi ringan)
- Tab Status: Pending (default) / Riwayat (Approved + Rejected)

---

### 2.17 Laporan (`/laporan`)

**Layout:** Filter di atas (periode, cabang) + tabel hasil + tombol export.

**Elemen:**
- Filter: rentang tanggal, cabang (Admin) / fixed (Kepala Cabang)
- Tabel rekap: jadwal terlaksana, swap, izin per periode
- Tombol export CSV/XLSX

---

## 3. Prinsip UI Lintas Halaman

- **Mobile-first untuk sisi Karyawan** — diakses dari HP di lapangan (Jadwal Saya, Layar Shift Terpadu, Ajukan Swap/Izin).
- **Desktop-first untuk sisi Admin** — halaman kelola & laporan (tabel, kalender grid mingguan).
- **Auto-Skip Pilih Cabang:** Jika user hanya terafiliasi dengan 1 cabang aktif, bypass halaman `/pilih-cabang` langsung ke `/jadwal-saya` atau `/dashboard`.
- **Thumb-Zone Optimization (Mobile):** Tombol aksi utama (Mulai Shift, Submit Checklist, Send Handover) ditempatkan di area jangkauan jempol (sticky bottom bar).
- **Kompresi Client-side:** Foto bukti checklist dikompres otomatis (<500KB WebP) di frontend sebelum diunggah ke Google Drive via GAS bridge.
- **Status pakai badge warna semantik** (pending=warning amber `#D97706`, approved=success green `#059669`, rejected/bentrok=danger red `#DC2626`, shift aktif=accent navy `#1c2b42`) — ambil warna dari role tokens di `atlassian-DESIGN.md`.
- **Aksi destruktif** (hapus karyawan, reject pengajuan) selalu ada konfirmasi ringan sebelum eksekusi.
- **Empty state** di semua list/tabel (belum ada jadwal, belum ada pengajuan, dst) — dilengkapi ilustrasi/teks jelas & tombol aksi.
- **Validasi submit** (checklist harus 100%, handover field wajib) divalidasi di frontend untuk UX (dengan feedback/popover jelas), dan **wajib** divalidasi di backend.

---

## 4. Navigasi

Satu model navigasi untuk semua role, dengan dua bentuk tergantung ukuran layar:

| Layar | Admin / Kepala Cabang | Karyawan |
|---|---|---|
| `< lg` (mobile) | **Dock 4 tab** + tombol **"Lainnya"** | **Dock 4 tab** + tombol **"Lainnya"** |
| `lg+` (desktop) | Nav horizontal di header | Nav horizontal di header |

### 4.1 Dock (mobile)

- Bentuk: bar mengambang `fixed bottom-4`, `max-w-md`, `rounded-xl` (token 24px), `border-border`,
  `bg-card`, tanpa shadow berat (desain datar — pemisahan lewat warna/spasi, bukan kedalaman).
- Isi: **4 tab esensial** (ikon Material Symbols + label, target sentuh `min-h-14` ≥44px) +
  1 tombol **"Lainnya"** → `Sheet` bawah berisi sisanya, dikelompokkan, dengan state aktif pada item
  yang sedang dibuka. Tombol "Lainnya" ikut aktif kalau halaman yang sedang dibuka ada di dalamnya.
- Padding bawah konten `pb-28` di mobile (`lg:pb-0`) supaya dock tidak menutupi konten.
- `env(safe-area-inset-bottom)` dipakai untuk perangkat ber-notch.
- **Tidak ada hamburger** — dock menggantikan menu hamburger untuk admin/kepala_cabang.

**4 tab per role:**

| Role | 4 tab dock | Masuk sheet "Lainnya" |
|---|---|---|
| Admin / Kepala Cabang | Dashboard, Jadwal, Approval, Laporan | Checklist Template, Handover Template (admin), Cabang, Karyawan, Shift Template, Kategori Izin, Pilih Cabang |
| Karyawan | Jadwal Saya, Swap, Izin, Riwayat | Profil, Pilih Cabang, Keluar dari Akun |

Profil dan Keluar milik admin tetap di header (terlihat di semua ukuran), jadi tidak diulang di
"Lainnya". Karyawan memakai tombol Keluar di header (desktop) **dan** di sheet "Lainnya" (mobile),
karena dock-nya tidak muncul di layar lebar.

### 4.2 Sumber data menu

Semua item navigasi (label, `href`, ikon, tanda admin-only) berasal dari
`components/nav-config.ts`. Nav horizontal dan dock membaca file yang sama, dan
`groupsWithoutTabs()` otomatis membuang item yang sudah jadi tab dock dari sheet "Lainnya" supaya
tidak pernah tampil dua kali. Menukar prioritas 4 tab cukup mengubah `ADMIN_DOCK_TABS`.

### 4.3 Keluar dari akun

`useLogout()` dipakai bersama oleh header admin, header karyawan, dan sheet "Lainnya": POST
`/api/auth/logout`, toast, lalu pindah ke `/login` (pindah layar tetap dilakukan walau request
gagal, supaya pengguna tidak terjebak di halaman yang tidak bisa diakses).

---

## 5. Referensi Styling

Semua keputusan visual (warna, tipografi, spacing, radius, komponen button/input/badge/card) mengikuti `PLANS/atlassian-DESIGN.md`. Saat implementasi tiap halaman di atas, gunakan instruksi:

> "Adaptasi desain di file ini" → link ke `atlassian-DESIGN.md`

Dokumen ini (`UI-PLAN.md`) sengaja tidak menyebutkan warna/font spesifik apapun supaya tidak konflik dengan sumber kebenaran styling di `atlassian-DESIGN.md`.

Komponen UI (button, input, dialog, dropdown, table) memakai **shadcn/ui** (Tailwind + Radix). Warna/tipografi komponennya tetap wajib diadaptasi dari token `atlassian-DESIGN.md` — jangan pakai styling default shadcn (palet zinc/neutral) apa adanya.

