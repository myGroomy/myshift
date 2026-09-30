# MYSHIFT Product Requirements Document (Full / Production)

> **Versi:** 1.4.0
> **Tanggal:** 2026-09-30
> **Status:** Draft PRD Awal + Incident Feature
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
2. Memberi Petugas visibilitas jadwal sendiri dan konteks operasional cabang per jadwal
3. Memfasilitasi pertukaran shift & pengajuan izin dengan alur approval yang jelas
4. Memastikan checklist operasional (opening/closing) benar-benar dikerjakan sebelum shift ditutup
5. Menjaga kontinuitas informasi antar shift lewat handover terstruktur

---

## 3. Pengguna & Role

| Role | Cakupan | Kewenangan |
|---|---|---|
| **Admin (Pusat)** | Semua cabang | Membuat/edit jadwal semua cabang, approve swap & izin, kelola master data (cabang, shift, checklist template), kelola karyawan |
| **Petugas** | 1 cabang (bisa berpindah) | Lihat jadwal sendiri, ajukan swap/izin, isi checklist opening/closing, isi handover, tandai mulai shift |

Role yang digunakan hanya `admin` dan `petugas`. Role lama `karyawan` dan `kepala_cabang`
dinormalisasi menjadi `petugas`; pengelolaan data dan template hanya tersedia bagi Admin. Petugas bisa ditugaskan ke beberapa cabang. Setiap jadwal menetapkan cabang tempat shift
berlangsung; konteks operasional Petugas mengikuti jadwal yang dibuka, tanpa memilih cabang aktif
secara manual. Admin tetap dapat memilih cabang untuk pengelolaan data.

---

## 4. Arsitektur & Tech Stack

Mengikuti pola aplikasi sibling di ekosistem (STOKIS, MYCUSTOMER, MYLAUNCHER):

| Layer | Teknologi |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes |
| Database | **Google Sheets API v4** konsisten dengan seluruh ekosistem (bukan Postgres, bukan GAS) |
| Isolasi data | Registry pattern ala STOKIS: 1 spreadsheet Registry + 1 spreadsheet per cabang (isolasi fisik) |
| Auth | PIN-based login, hash **scrypt** (ikut pola MYLAUNCHER, bukan pola belum-terverifikasi STOKIS/MYCUSTOMER), session cookie HMAC-signed, httpOnly |
| Hosting | Vercel |
| Security headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy dipasang sejak awal (belajar dari gap MYLAUNCHER) |
| Validasi | Dedicated validation layer per domain (ikut pola `so-validation.ts` STOKIS), format error terstruktur `{ success, error: { code, message } }` |
| Cache | Tidak pakai in-memory module-level cache (belajar dari masalah multi-instance di LAUNCHER & STOKIS) |

**Kenapa Sheets, bukan real DB?** Konsisten dengan seluruh ekosistem, admin bisa edit/migrasi data langsung lewat spreadsheet tanpa tool tambahan, dan skala target (3–10 cabang, ~5 karyawan/cabang) masih jauh di bawah batas praktis Google Sheets.

---

## 5. Skema Data (Google Sheets)

### 5.1 Registry Spreadsheet (1 file)

| Sheet | Kolom |
|---|---|
| `Daftar_Cabang` | `Cabang_ID`, `Nama_Cabang`, `Spreadsheet_ID`, `Aktif` |
| `Employees` | `Employee_ID`, `Username`, `PIN_Hash`, `Nama`, `Role` (admin/petugas), `Cabang_Aktif`, `Aktif` |
| `Settings_Global` | `Key`, `Value` |

### 5.2 Per-Cabang Spreadsheet (1 file per cabang)

| Sheet | Kolom |
|---|---|
| `Shifts` | `Shift_ID`, `Nama` (Opening/Middle/Closing/custom), `Jam_Mulai`, `Jam_Selesai` |
| `Schedules` | `Schedule_ID`, `Employee_ID`, `Shift_ID`, `Tanggal`, `Status` (scheduled/started/completed) |
| `Shift_Swaps` | `Swap_ID`, `Schedule_ID`, `Requested_By`, `Requested_With`, `Alasan`, `Status` (pending/approved/rejected), `Approved_By` |
| `Izin` | `Izin_ID`, `Employee_ID`, `Tanggal`, `Kategori`, `Keterangan`, `Status`, `Approved_By` |
| `Schedules` (tambahan) | `Report_Generated_At`, `Report_Token` |
| `SOP_Kategori` | `Kategori_ID` (`SOP-###`), `Nama`, `Urutan`, `Aktif` |
| `Checklist_Point` | `Point_ID`, `Kategori_ID`, `Deskripsi`, `Tipe_Penyelesaian`, `Satuan`, `Batas_Min`, `Batas_Max`, `Opsi_Pilihan`, `Berlaku_Semua_Shift`, `Shift_IDs`, `Urutan`, `Aktif` |
| `Checklist_Log` | `Log_ID`, `Schedule_ID`, `Point_ID`, `Nilai`, `Foto_URL`, `Checked_By`, `Checked_At` |
| `Shift_Report_Audit` | `Audit_ID`, `Schedule_ID`, `Bagian`, `Record_ID`, `Field`, `Nilai_Lama`, `Nilai_Baru`, `Actor_ID`, `Changed_At` |
| `Handover_Template` | `Field_ID`, `Label`, `Wajib` (bool) |
| `Handover_Log` | `Log_ID`, `Schedule_ID`, `Field_ID`, `Isi`, `Created_By`, `Created_At` |
| `Kategori_Incident` | `Kategori_ID`, `Label`, `Aktif` |
| `Incidents` | `Incident_ID`, `Kategori_ID`, `Deskripsi`, `Severity`, `Foto_URL`, `Status`, `Resolved_By`, `Resolved_At`, `Created_By`, `Created_At` |

**Format ID:** ikut pola prefix bermakna ala STOKIS (contoh: `EMP-CBG01-001`, `SCH-20260401-001`) supaya lebih mudah dipetakan manual ke MYLAUNCHER saat integrasi SSO nanti dilakukan.

---

## 6. Spesifikasi Fitur

### 6.1 Auth & Employee Management
- Login: username + PIN (scrypt hash)
- CRUD karyawan (admin): nama, role, cabang aktif, status aktif
- Petugas bisa dipindah cabang oleh admin

### 6.2 Master Data
- CRUD cabang (admin)
- CRUD template shift per cabang (nama, jam mulai-selesai)

### 6.3 Penjadwalan
- Admin membuat jadwal **mingguan**, customizable per cabang
- Assign: karyawan → shift → tanggal
- Konflik jadwal (karyawan dobel di jam bentrok) → **warning**, tidak hard-block (admin tetap bisa lanjut kalau memang disengaja)
- Petugas hanya melihat jadwal miliknya di seluruh cabang yang menjadi afiliasinya; cabang spesifik
  ditentukan oleh jadwal, bukan pilihan cabang aktif di sisi Petugas
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

### 6.6 Checklist SOP per Shift
- Admin membuat kategori SOP dan Checklist Point per cabang; setiap point dapat berlaku untuk semua shift atau shift tertentu.
- Tipe penyelesaian per point: centang, centang + foto, angka (satuan/batas), teks, atau pilihan.
- Isian checklist otomatis disimpan per jadwal dengan identitas akun karyawan; teks/angka memakai jeda singkat agar pengetikan tidak menghasilkan request per karakter.
- Nilai angka di luar batas memberi warning dan tidak memblokir penyelesaian.
- Checklist yang disajikan pada jadwal hanya berisi point aktif yang cocok dengan Shift_ID-nya; seluruh point tersebut wajib lengkap sebelum laporan dibuat.
- Perubahan checklist setelah laporan dibuat tetap diperbolehkan oleh Admin dan pemilik jadwal serta dicatat pada `Shift_Report_Audit`.

### 6.7 Handover
- **Wajib diisi setiap akhir shift** tidak bisa diskip
- Terdiri dari form-form terstruktur; sebagian field **wajib**, sebagian **opsional** (dikonfigurasi lewat `Handover_Template`)
- Terlihat oleh karyawan shift berikutnya saat mereka mulai shift

### 6.8 Mulai Shift (bukan absensi formal)
- Tombol sederhana "mulai shift" hanya menandai waktu, tanpa verifikasi wajah/lokasi
- Bukan pengganti sistem absensi resmi di POS

### 6.9 Dashboard & Laporan
- Dashboard admin: jadwal hari ini per cabang, status checklist, status handover
- Laporan Admin: rekap jadwal, swap, izin, checklist, handover, dan incident lintas cabang
- Laporan Petugas: ringkasan operasional dibatasi ke cabang aktif pada sesi
- Export CSV/XLSX

### 6.10 Incident / Catatan Operasional

Fitur untuk mencatat kejadian abnormal selama operasi yang tidak cocok masuk checklist (tugas rutin) atau handover (info antar shift).

**Contoh penggunaan:** mesin rusak, komplain customer, barang rusak, stok mendadak habis, kesalahan order, masalah kebersihan, masalah keamanan, karyawan berhalangan, kejadian lain.

#### 6.10.1 Kategori Incident (Admin-Configurable)
- Kategori dikelola admin per cabang (pola sama dengan `Kategori_Izin`)
- CRUD kategori: tambah, edit label, nonaktifkan
- Kategori default saat provisioning: Mesin Rusak, Komplain Customer, Barang Rusak, Stok Habis, Kesalahan Order, Kebersihan, Keamanan, Karyawan Berhalangan, Lainnya

#### 6.10.2 Field per Incident

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `Incident_ID` | text (auto) | | Format `INC-###` |
| `Kategori_ID` | text | ✅ | FK ke `Kategori_Incident` |
| `Deskripsi` | text | ✅ | Penjelasan kejadian |
| `Severity` | enum | ✅ | `low` / `medium` / `high` |
| `Foto_URL` | text | ❌ | Bukti foto (upload via Drive bridge) |
| `Status` | enum | ✅ | `open` / `resolved` |
| `Resolved_By` | text | ❌ | Employee_ID admin yang resolve |
| `Resolved_At` | timestamp | ❌ | Waktu resolve |
| `Created_By` | text | ✅ | Employee_ID pelapor |
| `Created_At` | timestamp | ✅ | Auto timestamp |

#### 6.10.3 Hak Akses

| Role | Aksi |
|---|---|
| **Karyawan** | Buat incident, lihat incident cabang sendiri, filter by kategori/status/severity |
| **Admin** | Lihat semua incident semua cabang, kelola kategori, resolve incident, export |

#### 6.10.4 Validasi
- Kategori wajib dipilih
- Deskripsi wajib, min 10 karakter
- Severity wajib dipilih
- Foto opsional, maks 1 foto per incident
- Hanya admin yang bisa resolve incident
- Karyawan hanya bisa lihat incident cabangnya sendiri

#### 6.10.5 Integrasi
- Dashboard admin: widget "Incident hari ini" per cabang (count by severity)
- Laporan: rekap incident per periode, filter by kategori/severity/status
- Notifikasi (fase mendatang): incident severity `high` trigger notifikasi ke admin

### 6.11 Laporan Shift
- Admin atau pemilik jadwal dapat membuat laporan per shift setelah seluruh checklist applicable dan handover wajib lengkap.
- Laporan menampilkan konteks shift, ringkasan checklist per SOP, handover, nama pengisi, dan riwayat koreksi.
- Setelah generate, checklist dan handover tetap dapat diedit Admin/pemilik jadwal; setiap perubahan dicatat dengan nilai lama/baru, aktor, dan waktu.
- Link publik tanpa login menggunakan token HMAC tanpa masa kedaluwarsa; token diverifikasi terhadap nilai yang tersimpan pada jadwal.
- Tombol Share membuka `wa.me/?text=` dengan template hardcode; pengguna memilih penerima dan mengirim secara manual.
- Fitur ini terpisah dari `/laporan`, yaitu rekap periodik admin/karyawan.

---

## 7. Non-Functional Requirements

- **Skala target:** 3–10 cabang (adaptif/configurable), ~5 karyawan per cabang, 2–3 shift/hari, ~5×3 pengguna aktif bersamaan
- **Performa:** wajar untuk skala UMKM; tidak perlu optimasi ekstrem di awal
- **Keamanan:** PIN di-hash (scrypt), session HMAC-signed, security headers lengkap sejak hari pertama
- **Kecepatan development:** prioritas tinggi dibangun secepat mungkin, MVP dulu (lihat `MVP-plan.md`)

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
