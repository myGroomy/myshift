# MYSHIFT UI Plan

> **Versi:** 1.5.0 (Role kanonis Admin/Petugas)
> **Tanggal:** 2026-09-30
> **Turunan dari:** `FULL-PRD.md`, `MVP-plan.md`, `UI_UX_AUDIT_MYSHIFT.md`
> **Styling & Design Tokens:** lihat `atlassian-DESIGN.md` (di direktori yang sama: `PLANS/atlassian-DESIGN.md`) **adaptasi desain di file ini** untuk semua warna, tipografi, spacing, dan komponen. UI-PLAN.md ini **tidak** mendefinisikan styling; fokusnya adalah struktur halaman, konten, dan fungsi tiap layar.

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
| 4 | Jadwal Saya | `/jadwal-saya` | Petugas | MVP (Unified 4-Tab Hub: Jadwal, Swap, Izin, Riwayat) |
| 5 | Layar Shift Terpadu | `/shift/[id]` | Petugas | Fase 2/3 (Hub 3-Tab: Info, Checklist, Handover) |
| 6 | Checklist & Riwayat Checklist | `/checklist`, `/checklist/history` | Admin, Petugas | Input checklist langsung untuk jadwal hari ini; riwayat shift/laporan |
| 7 | Shift Picker Handover | `/handover` | Petugas | Nav Restructure (Shift Picker -> `/shift/[id]?tab=handover`) |
| 8 | Redirect Swap / Izin / Riwayat | `/swap/ajukan`, `/izin/ajukan`, `/riwayat` | Petugas | Redirect ke `/jadwal-saya?tab=...` |
| 9 | Dashboard | `/dashboard` | Admin | Fase 4 |
| 10 | Kelola Jadwal | `/jadwal` | Admin | MVP |
| 11 | Kelola Karyawan | `/karyawan` | Admin | MVP |
| 12 | Kelola Cabang | `/cabang` | Admin | MVP |
| 13 | Kelola Shift Template | `/shift-template` | Admin | MVP |
| 14 | Kelola Checklist Template | `/checklist-template` | Admin | Fase 3 |
| 15 | Kelola Handover Template | `/handover-template` | Admin | Fase 3 |
| 16 | Kelola Kategori Izin | `/kategori-izin` | Admin | Fase 2 |
| 17 | Unified Approval Hub | `/approval` | Admin | Fase 2 (Tab Swap & Izin gabung) |
| 18 | Laporan | `/laporan` | Admin, Petugas (cabang aktif) | Fase 4 |
| 19 | Laporan Shift | `/shift/[id]/laporan` | Admin, Petugas pemilik jadwal | Checklist Specs |
| 20 | Laporan Publik | `/laporan-publik/[token]` | Publik tanpa login | Checklist Specs |

---

## 2. Detail Halaman

### 2.1 Login (`/login`)

**Layout:** Form terpusat, single column, max-width kecil (mobile-first kemungkinan besar dipakai dari HP petugas di lapangan).

**Elemen:**
- Logo/nama app
- Input: Username
- Input: PIN (masked, numeric)
- Tombol "Masuk"
- State error: PIN salah / akun terkunci (tampilkan sisa waktu lock kalau kena rate-limit)

**Fungsi:** POST ke endpoint auth, dapat session cookie, redirect sesuai role (Admin → `/dashboard`, Petugas → `/jadwal-saya`).

---

### 2.2 Pilih Cabang (`/pilih-cabang`)

**Layout:** List/grid card cabang aktif milik user.

**Elemen:**
- Card per cabang: nama cabang, indikator "cabang saat ini" kalau ada
- Tap untuk pilih → set konteks cabang aktif di sesi

**Fungsi:** Muncul hanya kalau user (petugas pindah-pindah, atau admin) punya >1 cabang terafiliasi. Kalau cuma 1 cabang, skip halaman ini otomatis.

---

### 2.3 Jadwal Saya (`/jadwal-saya`) home Petugas

**Layout:** Header + strip tanggal horizontal (7 hari) + card shift hari terpilih.

**Elemen:**
- Strip tanggal: hari ini di-highlight (pakai token accent dari design file)
- Card shift: nama shift, jam mulai-selesai, tombol "Mulai shift" (kalau hari ini & belum dimulai)
- Shortcut: tombol "Ajukan swap" dan "Ajukan izin"
- Empty state: kalau tidak ada shift di tanggal terpilih ("Tidak ada shift hari ini")

**Fungsi:** Fetch jadwal minggu berjalan untuk petugas + cabang aktifnya. Tap tanggal lain di strip → ganti card shift yang ditampilkan.

---

### 2.4 Layar Shift Terpadu (`/shift/[id]`)

**Layout:** Single-page hub dengan **Segmented Control / Tab Bar** di atas (atau sticky bottom bar di HP). Mencegah *back-and-forth navigation* di perangkat seluler.

**Struktur Ringkasan & 2 Tab kerja:**
1. **Tab 1: Ringkasan & Mulai Shift**
   - Info shift: cabang, jam, tanggal, status (belum mulai / berjalan / selesai)
   - Tombol utama "Mulai Shift" (timestamp) & indikator durasi berjalan
   - Link/preview Handover shift sebelumnya (read-only) untuk konteks operasional
2. **Checklist Shift** dibuka pada `/shift/[id]/checklist` tanpa tab shift tambahan. Point discope otomatis menurut shift dan dikelompokkan per kategori SOP. Kontrol mengikuti tipe (centang, foto, angka, teks, pilihan); progress menghitung semua point applicable.
3. **Tab Handover Shift**
   - Read-only section: isi handover dari shift sebelumnya
   - Form terstruktur (sesuai `Handover_Template`) dengan penanda visual field wajib
   - Tombol Submit Handover validasi field wajib sebelum submit

### Checklist & Riwayat Checklist (`/checklist`, `/checklist/history`)

- Petugas membuka checklist otomatis untuk jadwal hari ini: prioritaskan shift yang sedang berjalan, lalu jadwal terdekat yang belum dimulai. Jika tidak ada jadwal hari ini, tampilkan jadwal lain yang tersedia dan pintasan ke riwayat.
- Jika ada beberapa shift hari ini, pilihan jadwal tetap tersedia. Admin tetap menggunakan pemilih shift untuk pemeriksaan/koreksi di cabang aktif.
- Halaman input menampilkan nama petugas, cabang, tanggal/jam, status shift, progres checklist, dan tautan laporan shift.
- Riwayat memuat shift yang sudah lewat dan status laporan; tautan "Lihat Laporan" hanya tampil jika `reportGeneratedAt` tersedia.

---

### 2.5 Ajukan Swap (`/swap/ajukan`)

**Layout:** Form bertahap sederhana (1 halaman).

**Elemen:**
- Pilih shift milik sendiri yang mau ditukar (dropdown/list, dari jadwal mendatang)
- Pilih partner tukar (filter otomatis: hanya tampilkan petugas yang punya jadwal valid/memungkinkan di tanggal tersebut)
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
- Card per pengajuan: tanggal, ringkasan, status badge (pending/approved/rejected warna dari role token: warning/success/danger)
- Tap untuk lihat detail (termasuk alasan reject kalau ada)

---

### 2.8 Dashboard (`/dashboard`)

**Layout:** Grid metric cards di atas + tabel status per cabang di bawah. Hanya untuk Admin.

**Elemen:**
- Metric cards: jumlah cabang aktif, shift hari ini, approval pending (dengan shortcut langsung ke `/approval`)
- Tabel status cabang: nama cabang, status checklist (badge), status handover (teks/badge)
- Untuk Admin: selector/filter cabang di header

---

### 2.9 Kelola Jadwal (`/jadwal`)

**Layout:** Grid kalender mingguan (baris = shift, kolom = hari), mode edit untuk Admin.

**Elemen:**
- Selector cabang untuk Admin
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
- Aksi per baris: edit nama, username, role, cabang; nonaktifkan/aktifkan (soft-delete); reset PIN sebagai aksi terpisah
- Search/filter sederhana (nama, cabang)

---

### 2.11 Kelola Cabang (`/cabang`)

**Layout:** Sama pola dengan Kelola Karyawan tabel + CRUD.

**Elemen:** Nama cabang, status aktif, tombol tambah/edit.

---

### 2.12 Kelola Shift Template (`/shift-template`)

**Layout:** Tabel/list per cabang, CRUD.

**Elemen:** Nama shift (Opening/Middle/Closing/custom), jam mulai, jam selesai.

---

### 2.13 Kelola Checklist Template (`/checklist-template`)

**Layout:** Pilih cabang dan shift; point disusun dalam section kategori SOP.

**Elemen:**
- Tab/selector shift; point lintas shift tampil pada setiap shift yang berlaku
- CRUD kategori SOP dan Checklist Point (deskripsi, tipe, satuan/batas angka, opsi, cakupan shift, urutan, aktif)
- Point yang telah memiliki log hanya dapat dinonaktifkan; perubahan tipe menampilkan peringatan bahwa log lama tetap utuh
- Untuk Karyawan: laporan otomatis dibatasi ke cabang aktif, tanpa selector cabang

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
- Filter: rentang tanggal; cabang untuk Admin, cabang aktif tetap untuk Karyawan
- Tab jenis laporan: Semua, Jadwal, Checklist, Handover, Swap & Izin, Incident
- Tab Checklist merangkum progres per shift dan SOP, termasuk daftar point yang belum selesai
- Tombol export CSV mengikuti jenis laporan dan filter yang sedang dipilih

### 2.18 Laporan Shift (`/shift/[id]/laporan`)

- Sebelum generate: preview shift, checklist per SOP, handover, status kelengkapan, lalu tombol Generate Laporan.
- Generate hanya berhasil bila semua point applicable dan field handover wajib sudah lengkap (validasi backend).
- Setelah generate: tautan publik permanen, tombol Share ke WhatsApp (`wa.me/?text=`), dan laporan terbaru.
- Admin/pemilik jadwal masih dapat mengedit checklist/handover; riwayat nilai lama→baru, aktor, dan waktu tampil di laporan.

### 2.19 Laporan Publik (`/laporan-publik/[token]`)

- Read-only tanpa login; isi sama dengan laporan shift termasuk riwayat perubahan.
- Token HMAC tanpa expiry, diverifikasi terhadap token tersimpan pada jadwal.

---

## 3. Prinsip UI Lintas Halaman

- **Mobile-first untuk sisi Karyawan** diakses dari HP di lapangan (Jadwal Saya, Layar Shift Terpadu, Ajukan Swap/Izin).
- **Desktop-first untuk sisi Admin** halaman kelola & laporan (tabel, kalender grid mingguan).
- **Filter pada mobile** dibungkus panel surface dengan grid satu kolom pada layar sempit, label tetap terlihat, dan kontrol/aksi memakai lebar penuh bila dibutuhkan. Filter majemuk membentuk grid dua kolom hanya saat ruang cukup; segmented control boleh digeser horizontal tanpa membuat halaman ikut overflow.
- **Box dan form** memakai padding mobile yang lebih rapat (`16px`) lalu kembali ke kepadatan desktop pada breakpoint `sm`; field grid wajib memakai `min-width: 0` agar input, label panjang, dan tombol tidak mendorong viewport melebar.
- **Tabel data di mobile** tetap dapat digeser horizontal, memiliki lebar kolom minimum agar isi tidak terjepit, dan menampilkan petunjuk geser sebelum breakpoint desktop.
- **Auto-Skip Pilih Cabang:** Jika user hanya terafiliasi dengan 1 cabang aktif, bypass halaman `/pilih-cabang` langsung ke `/jadwal-saya` atau `/dashboard`.
- **Thumb-Zone Optimization (Mobile):** Tombol aksi utama (Mulai Shift, Submit Checklist, Send Handover) ditempatkan di area jangkauan jempol (sticky bottom bar).
- **Kompresi Client-side:** Foto bukti checklist dikompres otomatis (<500KB WebP) di frontend sebelum diunggah ke Google Drive via GAS bridge.
- **Status pakai badge warna semantik** (pending=warning amber `#D97706`, approved=success green `#059669`, rejected/bentrok=danger red `#DC2626`, shift aktif=accent navy `#1c2b42`) ambil warna dari role tokens di `atlassian-DESIGN.md`.
- **Aksi destruktif** (hapus karyawan, reject pengajuan) selalu ada konfirmasi ringan sebelum eksekusi.
- **Empty state** di semua list/tabel (belum ada jadwal, belum ada pengajuan, dst) dilengkapi ilustrasi/teks jelas & tombol aksi.
- **Validasi submit** (checklist harus 100%, handover field wajib) divalidasi di frontend untuk UX (dengan feedback/popover jelas), dan **wajib** divalidasi di backend.

---

## 4. Navigasi

Satu model navigasi untuk semua role, dengan dua bentuk tergantung ukuran layar:

| Layar | Admin | Petugas |
|---|---|---|
| `< lg` (mobile) | **Dock 4 tab** + tombol **"Lainnya"** | **Dock 4 tab** + tombol **"Lainnya"** |
| `lg+` (desktop) | Jadwal, Checklist, Handover, Incident + dropdown **Pengelolaan** | Nav horizontal di header |

### 4.1 Dock (mobile)

- Bentuk: bar mengambang `fixed bottom-4`, `max-w-md`, `rounded-xl` (token 24px), `border-border`,
  `bg-card`, tanpa shadow berat (desain datar pemisahan lewat warna/spasi, bukan kedalaman).
- Isi: **4 tab esensial** (ikon Material Symbols + label, target sentuh `min-h-14` ≥44px) +
  1 tombol **"Lainnya"** → `Sheet` bawah berisi sisanya, dikelompokkan, dengan state aktif pada item
  yang sedang dibuka. Tombol "Lainnya" ikut aktif kalau halaman yang sedang dibuka ada di dalamnya.
- Padding bawah konten `pb-28` di mobile (`lg:pb-0`) supaya dock tidak menutupi konten.
- `env(safe-area-inset-bottom)` dipakai untuk perangkat ber-notch.
- **Tidak ada hamburger** dock menggantikan menu hamburger untuk Admin.

**Empat tab kerja yang sama pada kedua role:**

| Role | 4 tab dock | Masuk sheet "Lainnya" |
|---|---|---|
| Admin | Jadwal, Checklist, Handover, Incident | Dashboard, Approval, Laporan, Checklist Template, Handover Template, Cabang, Karyawan, Shift Template, Kategori Izin, Kategori Incident, Pilih Cabang |
| Petugas | Jadwal, Checklist, Handover, Incident | Swap, Izin, Riwayat, Laporan, Profil, Pilih Cabang, Keluar dari Akun |

Untuk Admin, tab Jadwal membuka kalender kelola jadwal; tab Checklist dan Handover membuka pemilih shift
operasional yang sama dan dapat digunakan untuk memeriksa atau mengoreksi catatan. Semua akses Admin
tambahan dikelompokkan di menu **Pengelolaan** pada desktop dan **Lainnya** di mobile.

Karyawan juga dapat membuka **Laporan** melalui menu "Lainnya" di mobile atau nav horizontal di
desktop. Isinya ringkasan jadwal, swap, izin, checklist, handover, dan incident cabang aktif.

Profil dan Keluar milik admin tetap di header (terlihat di semua ukuran), jadi tidak diulang di
"Lainnya". Karyawan memakai tombol Keluar di header (desktop) **dan** di sheet "Lainnya" (mobile),
karena dock-nya tidak muncul di layar lebar.

### 4.2 Sumber data menu

Semua item navigasi (label, `href`, ikon, tanda admin-only) berasal dari
`components/nav-config.ts`. Admin menggunakan empat tab kerja yang sama dengan Karyawan; Dashboard,
Approval, Laporan, master data, dan template dikelompokkan di menu **Pengelolaan**. Dock tetap memakai
4 tab utama dan sheet **Lainnya** untuk halaman sisanya.
`groupsWithoutTabs()` otomatis membuang item yang sudah jadi tab dock dari sheet supaya tidak
pernah tampil dua kali. Menukar prioritas 4 tab cukup mengubah `ADMIN_DOCK_TABS`.

### 4.3 Keluar dari akun

`useLogout()` dipakai bersama oleh header admin, header petugas, dan sheet "Lainnya": POST
`/api/auth/logout`, toast, lalu pindah ke `/login` (pindah layar tetap dilakukan walau request
gagal, supaya pengguna tidak terjebak di halaman yang tidak bisa diakses).

---

## 5. Referensi Styling

Semua keputusan visual (warna, tipografi, spacing, radius, komponen button/input/badge/card) mengikuti `PLANS/atlassian-DESIGN.md`. Saat implementasi tiap halaman di atas, gunakan instruksi:

> "Adaptasi desain di file ini" → link ke `atlassian-DESIGN.md`

Dokumen ini (`UI-PLAN.md`) sengaja tidak menyebutkan warna/font spesifik apapun supaya tidak konflik dengan sumber kebenaran styling di `atlassian-DESIGN.md`.

Komponen UI (button, input, dialog, dropdown, table) memakai **shadcn/ui** (Tailwind + Radix). Warna/tipografi komponennya tetap wajib diadaptasi dari token `atlassian-DESIGN.md` jangan pakai styling default shadcn (palet zinc/neutral) apa adanya.
