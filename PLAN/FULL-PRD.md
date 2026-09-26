# MYSHIFT — Product Requirements Document (Full / Production)

> **Versi:** 1.0.0
> **Tanggal:** 2026-09-26
> **Status:** Draft — PRD Awal
> **Bagian dari:** Ekosistem MOCHIKIN-APPS (F&B UMKM internal operational apps)

---

## 1. Latar Belakang & Konteks

MYSHIFT adalah aplikasi manajemen shift & operasional harian untuk Mochikin, F&B UMKM multi-cabang. MYSHIFT adalah bagian dari ekosistem MOCHIKIN-APPS yang juga terdiri dari MYLAUNCHER (app hub/SSO), STOKIS (inventory), MYCUSTOMER/Retain-ly (CRM), dan rencana MYHR (people management).

**Keputusan penting:** MYSHIFT dibangun **standalone terlebih dahulu**. Integrasi SSO dengan MYLAUNCHER sengaja **di-skip untuk fase ini** dan akan direvisit nanti. Artinya MYSHIFT punya auth, employee management, dan branch management sendiri untuk saat ini.

### 1.1 Batasan Tegas (Non-Goals)

- **Bukan sistem absensi clock-in/out formal.** Absensi resmi sudah dicatat di sistem POS terpisah. MYSHIFT hanya punya tanda "mulai shift" yang sangat sederhana (tanpa verifikasi wajah/GPS), bukan sistem kehadiran resmi.
- **Bukan sistem payroll/gaji.** Sama sekali tidak menyentuh perhitungan gaji. Itu domain MYHR di fase mendatang.
- **Bukan sistem SSO/identity.** Untuk fase ini, MYSHIFT independen dari MYLAUNCHER.

---

## 2. Tujuan Produk

MYSHIFT menjawab: **"Siapa yang bekerja, kapan, di mana, dan apa yang harus dilakukan selama shift itu?"**

Tujuan utama:
1. Memudahkan admin pusat membuat & mengelola jadwal kerja mingguan lintas cabang
2. Memberi karyawan visibilitas jadwal mereka sendiri
3. Memfasilitasi pertukaran shift & pengajuan izin dengan alur approval yang jelas
4. Memastikan checklist operasional (opening/closing) benar-benar dikerjakan sebelum shift ditutup
5. Menjaga kontinuitas informasi antar shift lewat handover terstruktur

---

## 3. Pengguna & Role

| Role | Cakupan | Kewenangan |
|---|---|---|
| **Admin (Pusat)** | Semua cabang | Membuat/edit jadwal semua cabang, approve swap & izin, kelola master data (cabang, shift, checklist template), kelola karyawan |
| **Kepala Cabang** | 1 cabang | Kelola checklist template cabangnya, lihat jadwal & laporan cabangnya (detail kewenangan approval swap/izin: default tetap terpusat ke Admin kecuali diputuskan lain saat implementasi) |
| **Karyawan** | 1 cabang (bisa berpindah) | Lihat jadwal sendiri, ajukan swap/izin, isi checklist opening/closing, isi handover, tandai mulai shift |

Catatan: karyawan bisa ditugaskan pindah-pindah cabang (tidak terikat 1 cabang permanen).

---

## 4. Arsitektur & Tech Stack

Mengikuti pola aplikasi sibling di ekosistem (STOKIS, MYCUSTOMER, MYLAUNCHER):

| Layer | Teknologi |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes |
| Database | **Google Sheets API v4** — konsisten dengan seluruh ekosistem (bukan Postgres, bukan GAS) |
| Isolasi data | Registry pattern ala STOKIS: 1 spreadsheet Registry + 1 spreadsheet per cabang (isolasi fisik) |
| Auth | PIN-based login, hash **scrypt** (ikut pola MYLAUNCHER, bukan pola belum-terverifikasi STOKIS/MYCUSTOMER), session cookie HMAC-signed, httpOnly |
| Hosting | Vercel |
| Security headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy — dipasang sejak awal (belajar dari gap MYLAUNCHER) |
| Validasi | Dedicated validation layer per domain (ikut pola `so-validation.ts` STOKIS), format error terstruktur `{ success, error: { code, message } }` |
| Cache | Tidak pakai in-memory module-level cache (belajar dari masalah multi-instance di LAUNCHER & STOKIS) |

**Kenapa Sheets, bukan real DB?** Konsisten dengan seluruh ekosistem, admin bisa edit/migrasi data langsung lewat spreadsheet tanpa tool tambahan, dan skala target (3–10 cabang, ~5 karyawan/cabang) masih jauh di bawah batas praktis Google Sheets.

---

## 5. Skema Data (Google Sheets)

### 5.1 Registry Spreadsheet (1 file)

| Sheet | Kolom |
|---|---|
| `Daftar_Cabang` | `Cabang_ID`, `Nama_Cabang`, `Spreadsheet_ID`, `Aktif` |
| `Employees` | `Employee_ID`, `Username`, `PIN_Hash`, `Nama`, `Role` (admin/kepala_cabang/karyawan), `Cabang_Aktif`, `Aktif` |
| `Settings_Global` | `Key`, `Value` |

### 5.2 Per-Cabang Spreadsheet (1 file per cabang)

| Sheet | Kolom |
|---|---|
| `Shifts` | `Shift_ID`, `Nama` (Opening/Middle/Closing/custom), `Jam_Mulai`, `Jam_Selesai` |
| `Schedules` | `Schedule_ID`, `Employee_ID`, `Shift_ID`, `Tanggal`, `Status` (scheduled/started/completed) |
| `Shift_Swaps` | `Swap_ID`, `Schedule_ID`, `Requested_By`, `Requested_With`, `Alasan`, `Status` (pending/approved/rejected), `Approved_By` |
| `Izin` | `Izin_ID`, `Employee_ID`, `Tanggal`, `Kategori`, `Keterangan`, `Status`, `Approved_By` |
| `Checklist_Template` | `Item_ID`, `Tipe` (opening/closing), `Deskripsi`, `Wajib_Foto` (bool), `Aktif` |
| `Checklist_Log` | `Log_ID`, `Schedule_ID`, `Item_ID`, `Checked_By`, `Checked_At`, `Foto_URL` (opsional) |
| `Handover_Template` | `Field_ID`, `Label`, `Wajib` (bool) |
| `Handover_Log` | `Log_ID`, `Schedule_ID`, `Field_ID`, `Isi`, `Created_By`, `Created_At` |

**Format ID:** ikut pola prefix bermakna ala STOKIS (contoh: `EMP-CBG01-001`, `SCH-20260401-001`) supaya lebih mudah dipetakan manual ke MYLAUNCHER saat integrasi SSO nanti dilakukan.

---

## 6. Spesifikasi Fitur

### 6.1 Auth & Employee Management
- Login: username + PIN (scrypt hash)
- CRUD karyawan (admin): nama, role, cabang aktif, status aktif
- Karyawan bisa dipindah cabang oleh admin

### 6.2 Master Data
- CRUD cabang (admin)
- CRUD template shift per cabang (nama, jam mulai-selesai)

### 6.3 Penjadwalan
- Admin membuat jadwal **mingguan**, customizable per cabang
- Assign: karyawan → shift → tanggal
- Konflik jadwal (karyawan dobel di jam bentrok) → **warning**, tidak hard-block (admin tetap bisa lanjut kalau memang disengaja)
- Karyawan hanya bisa melihat jadwal cabangnya sendiri (bukan lintas cabang)
- Tampilan: kalender mingguan per cabang (admin), "jadwal saya" (karyawan)

### 6.4 Shift Swap
- Karyawan mengajukan tukar shift ke karyawan lain yang jadwalnya **cocok** (saling tukar)
- Wajib menyertakan alasan
- Approval oleh Admin (terpusat)
- Status: pending → approved/rejected

### 6.5 Izin
- Karyawan mengajukan izin dengan **kategori** + keterangan wajib
- Kategori izin dapat dikonfigurasi oleh admin (admin-configurable, bukan hardcoded)
- Approval oleh Admin (terpusat)

### 6.6 Checklist Opening/Closing
- Template dasar sama untuk semua cabang, tapi **customizable per cabang** oleh Admin atau Kepala Cabang
- Tiap item: checkbox, dengan opsi tambahan foto (tidak semua item wajib foto)
- **Shift/laporan tidak bisa disubmit kalau checklist belum 100% selesai**

### 6.7 Handover
- **Wajib diisi setiap akhir shift** — tidak bisa diskip
- Terdiri dari form-form terstruktur; sebagian field **wajib**, sebagian **opsional** (dikonfigurasi lewat `Handover_Template`)
- Terlihat oleh karyawan shift berikutnya saat mereka mulai shift

### 6.8 Mulai Shift (bukan absensi formal)
- Tombol sederhana "mulai shift" — hanya menandai waktu, tanpa verifikasi wajah/lokasi
- Bukan pengganti sistem absensi resmi di POS

### 6.9 Dashboard & Laporan
- Dashboard admin: jadwal hari ini per cabang, status checklist, status handover
- Laporan: rekap jadwal, swap, izin per periode
- Export CSV/XLSX

---

## 7. Non-Functional Requirements

- **Skala target:** 3–10 cabang (adaptif/configurable), ~5 karyawan per cabang, 2–3 shift/hari, ~5×3 pengguna aktif bersamaan
- **Performa:** wajar untuk skala UMKM; tidak perlu optimasi ekstrem di awal
- **Keamanan:** PIN di-hash (scrypt), session HMAC-signed, security headers lengkap sejak hari pertama
- **Kecepatan development:** prioritas tinggi — dibangun secepat mungkin, MVP dulu (lihat `MVP-plan.md`)

---

## 8. Di Luar Scope (Saat Ini)

- Absensi clock-in/out formal (ada di sistem POS terpisah)
- Payroll / perhitungan gaji
- Integrasi SSO dengan MYLAUNCHER
- Notifikasi WhatsApp/push (kandidat fase mendatang)

---

## 9. Fase Mendatang (Setelah MVP & Standalone Stabil)

- Integrasi SSO dengan MYLAUNCHER (`employee_id` MYSHIFT dipetakan ke `employee_id` MYLAUNCHER)
- Sinkronisasi `Branch_ID` dengan standar lintas ekosistem (jika sudah distandarisasi)
- Notifikasi pengingat shift
- Kemungkinan integrasi data performa shift ke MYHR (bukan payroll, tapi riwayat kerja)
