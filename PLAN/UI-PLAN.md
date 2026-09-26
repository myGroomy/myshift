# MYSHIFT — UI Plan

> **Versi:** 1.0.0
> **Tanggal:** 2026-09-26
> **Turunan dari:** `FULL-PRD.md`, `MVP-plan.md`
> **Styling & Design Tokens:** lihat `atlassian-DESIGN.md` (di direktori yang sama: `PLANS/atlassian-DESIGN.md`) — **adaptasi desain di file ini** untuk semua warna, tipografi, spacing, dan komponen. UI-PLAN.md ini **tidak** mendefinisikan styling; fokusnya adalah struktur halaman, konten, dan fungsi tiap layar.

---

## Cara Pakai Dokumen Ini

Untuk tiap halaman di bawah: bangun struktur & fungsi sesuai deskripsi di sini, lalu **adaptasi desain di `atlassian-DESIGN.md`** untuk warna, komponen, dan gaya visual. Dokumen ini adalah kontrak fungsi + layout, bukan kontrak visual.

---

## 1. Peta Halaman

| # | Halaman | Path | Role | Prioritas |
|---|---|---|---|---|
| 1 | Login | `/login` | Semua | MVP |
| 2 | Pilih Cabang | `/pilih-cabang` | Semua (yang aktif >1 cabang) | MVP |
| 3 | Profil Saya | `/profil` | Semua | Fase 2 |
| 4 | Jadwal Saya | `/jadwal-saya` | Karyawan | MVP |
| 5 | Detail Shift | `/shift/[id]` | Karyawan | Fase 2 |
| 6 | Checklist Shift | `/shift/[id]/checklist` | Karyawan | Fase 3 |
| 7 | Handover | `/shift/[id]/handover` | Karyawan | Fase 3 |
| 8 | Ajukan Swap | `/swap/ajukan` | Karyawan | Fase 2 |
| 9 | Ajukan Izin | `/izin/ajukan` | Karyawan | Fase 2 |
| 10 | Riwayat Pengajuan | `/riwayat` | Karyawan | Fase 2 |
| 11 | Dashboard | `/dashboard` | Admin, Kepala Cabang | Fase 4 |
| 12 | Kelola Jadwal | `/jadwal` | Admin (edit), Kepala Cabang (read-only) | MVP |
| 13 | Kelola Karyawan | `/karyawan` | Admin | MVP |
| 14 | Kelola Cabang | `/cabang` | Admin | MVP |
| 15 | Kelola Shift Template | `/shift-template` | Admin | MVP |
| 16 | Kelola Checklist Template | `/checklist-template` | Admin, Kepala Cabang (scoped) | Fase 3 |
| 17 | Kelola Handover Template | `/handover-template` | Admin | Fase 3 |
| 18 | Kelola Kategori Izin | `/kategori-izin` | Admin | Fase 2 |
| 19 | Approval Swap | `/approval/swap` | Admin | Fase 2 |
| 20 | Approval Izin | `/approval/izin` | Admin | Fase 2 |
| 21 | Laporan | `/laporan` | Admin, Kepala Cabang (scoped) | Fase 4 |

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

### 2.4 Detail Shift (`/shift/[id]`)

**Layout:** Detail single shift, jadi hub navigasi ke checklist & handover.

**Elemen:**
- Info shift: cabang, jam, tanggal
- Status: belum mulai / berjalan / selesai
- Link ke Checklist (dengan progress badge X/Y)
- Link ke Handover (dengan status: sudah/belum diisi)
- Link ke Handover shift sebelumnya (read-only, untuk konteks)

---

### 2.5 Checklist Shift (`/shift/[id]/checklist`)

**Layout:** List item checklist vertikal + progress bar di atas.

**Elemen:**
- Progress bar + counter "(X/Y selesai)"
- List item: checkbox + label, item yang butuh foto punya icon kamera/tombol upload
- Tombol Submit — **disabled sampai semua item tercentang** (state disabled harus jelas secara visual, bukan cuma non-klik)

**Fungsi:** Checklist berbeda isinya tergantung tipe shift (opening vs closing) dan cabang (template per-cabang). Validasi submit di frontend DAN backend (jangan andalkan frontend saja).

---

### 2.6 Handover (`/shift/[id]/handover`)

**Layout:** Form terstruktur, field wajib ditandai jelas, plus section "Handover shift sebelumnya" (read-only) di atas atau di sisi form.

**Elemen:**
- Section read-only: isi handover dari shift sebelumnya (kalau ada)
- Form: field-field sesuai `Handover_Template` (textarea/input tergantung tipe), field wajib punya penanda visual
- Tombol Submit — validasi field wajib sebelum submit

---

### 2.7 Ajukan Swap (`/swap/ajukan`)

**Layout:** Form bertahap sederhana (bukan wizard multi-step, cukup 1 halaman).

**Elemen:**
- Pilih shift milik sendiri yang mau ditukar (dropdown/list, dari jadwal mendatang)
- Pilih partner tukar (dari karyawan lain yang jadwalnya cocok — filter otomatis, jangan biarkan user pilih sembarang orang)
- Textarea alasan (wajib)
- Tombol submit → masuk status "pending"

---

### 2.8 Ajukan Izin (`/izin/ajukan`)

**Layout:** Form sederhana.

**Elemen:**
- Pilih tanggal/shift terdampak
- Dropdown kategori izin (dari `Kategori Izin` yang dikonfigurasi admin)
- Textarea keterangan (wajib)
- Tombol submit → status "pending"

---

### 2.9 Riwayat Pengajuan (`/riwayat`)

**Layout:** List/tab (Swap | Izin), tiap item card dengan status badge.

**Elemen:**
- Filter tab: Swap / Izin / Semua
- Card per pengajuan: tanggal, ringkasan, status badge (pending/approved/rejected — warna dari role token: warning/success/danger)
- Tap untuk lihat detail (termasuk alasan reject kalau ada)

---

### 2.10 Dashboard (`/dashboard`)

**Layout:** Grid metric cards di atas + tabel status per cabang di bawah. Untuk Kepala Cabang, versi scoped (cuma cabangnya, tanpa selector cabang).

**Elemen:**
- Metric cards: jumlah cabang aktif, shift hari ini, approval pending
- Tabel status cabang: nama cabang, status checklist (badge), status handover (teks/badge)
- Untuk Admin: selector/filter cabang di header

---

### 2.11 Kelola Jadwal (`/jadwal`)

**Layout:** Grid kalender mingguan (baris = shift, kolom = hari), mode edit untuk Admin, read-only untuk Kepala Cabang.

**Elemen:**
- Selector cabang (Admin) / fixed ke cabang sendiri (Kepala Cabang)
- Navigasi minggu (prev/next)
- Grid: klik cell kosong → assign karyawan; klik cell terisi → edit/hapus
- Cell dengan bentrok jadwal → **visual warning** (bukan block), pakai token warna danger/warning dari design file
- Legend warna status di bawah grid

---

### 2.12 Kelola Karyawan (`/karyawan`)

**Layout:** Tabel/list dengan tombol tambah di header.

**Elemen:**
- Tabel: nama, role, cabang aktif, status (aktif/nonaktif)
- Tombol "Tambah karyawan" → form modal/halaman terpisah
- Aksi per baris: edit, nonaktifkan
- Search/filter sederhana (nama, cabang)

---

### 2.13 Kelola Cabang (`/cabang`)

**Layout:** Sama pola dengan Kelola Karyawan — tabel + CRUD.

**Elemen:** Nama cabang, status aktif, tombol tambah/edit.

---

### 2.14 Kelola Shift Template (`/shift-template`)

**Layout:** Tabel/list per cabang, CRUD.

**Elemen:** Nama shift (Opening/Middle/Closing/custom), jam mulai, jam selesai.

---

### 2.15 Kelola Checklist Template (`/checklist-template`)

**Layout:** List item checklist, bisa reorder, toggle "wajib foto" per item.

**Elemen:**
- Selector tipe: Opening / Closing
- List item dengan drag-handle (opsional untuk reorder), toggle "wajib foto"
- Tombol tambah item baru
- Untuk Kepala Cabang: scoped ke 1 cabang saja (tanpa selector cabang)

---

### 2.16 Kelola Handover Template (`/handover-template`)

**Layout:** List field, toggle wajib/opsional per field, tipe field (text/textarea).

---

### 2.17 Kelola Kategori Izin (`/kategori-izin`)

**Layout:** List sederhana + tambah/hapus kategori.

---

### 2.18 Approval Swap (`/approval/swap`)

**Layout:** List card pengajuan pending, aksi approve/reject langsung di card.

**Elemen:**
- Card: nama pemohon, shift yang ditukar, partner, alasan
- Tombol Approve / Reject langsung di card (dengan konfirmasi ringan)
- Tab/filter: Pending (default) / Riwayat (approved+rejected)

---

### 2.19 Approval Izin (`/approval/izin`)

**Layout:** Sama pola dengan Approval Swap.

**Elemen:** Card: nama pemohon, tanggal/shift, kategori, keterangan, tombol approve/reject.

---

### 2.20 Laporan (`/laporan`)

**Layout:** Filter di atas (periode, cabang) + tabel hasil + tombol export.

**Elemen:**
- Filter: rentang tanggal, cabang (Admin) / fixed (Kepala Cabang)
- Tabel rekap: jadwal terlaksana, swap, izin per periode
- Tombol export CSV/XLSX

---

## 3. Prinsip UI Lintas Halaman

- **Mobile-first untuk sisi Karyawan** — kemungkinan besar diakses dari HP di lapangan (Jadwal Saya, Checklist, Handover, Ajukan Swap/Izin)
- **Desktop-first untuk sisi Admin** — halaman kelola & laporan lebih nyaman di layar lebar (tabel, kalender grid)
- **Status selalu pakai badge warna semantik** (pending=warning, approved=success, rejected=danger, bentrok jadwal=danger) — ambil warna dari role tokens di `atlassian-DESIGN.md`, jangan hardcode hex
- **Aksi destruktif** (hapus karyawan, reject pengajuan) selalu ada konfirmasi ringan sebelum eksekusi
- **Empty state** di semua list/tabel (belum ada jadwal, belum ada pengajuan, dst) — jangan biarkan layar kosong tanpa penjelasan
- **Validasi submit** (checklist harus 100%, handover field wajib) divalidasi di frontend untuk UX, dan **wajib** juga di backend — jangan andalkan frontend saja

---

## 4. Referensi Styling

Semua keputusan visual (warna, tipografi, spacing, radius, komponen button/input/badge/card) mengikuti `PLANS/atlassian-DESIGN.md`. Saat implementasi tiap halaman di atas, gunakan instruksi:

> "Adaptasi desain di file ini" → link ke `atlassian-DESIGN.md`

Dokumen ini (`UI-PLAN.md`) sengaja tidak menyebutkan warna/font spesifik apapun supaya tidak konflik dengan sumber kebenaran styling di `atlassian-DESIGN.md`.

Komponen UI (button, input, dialog, dropdown, table) memakai **shadcn/ui** (Tailwind + Radix). Warna/tipografi komponennya tetap wajib diadaptasi dari token `atlassian-DESIGN.md` — jangan pakai styling default shadcn (palet zinc/neutral) apa adanya.
