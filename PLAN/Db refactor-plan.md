# MYSHIFT — DB Refactor Plan (Registry + Copy Template)

> **Tujuan:** memindahkan pembuatan spreadsheet cabang dari `spreadsheets.create` (kena quota) ke **copy template**, dan merapikan Registry supaya jadi satu-satunya sumber untuk mengetahui spreadsheet dan folder tiap cabang. **Sumber kebenaran struktur:** [`SHEETS-SCHEMA.md`](http://SHEETS-SCHEMA.md) (Registry, `TEMPLATES`, alur provisioning) dan [`API-CONTRACT.md`](http://API-CONTRACT.md) (§3 Branches). **Untuk:** coding agent. Kerjakan berurutan, jangan loncat step.

---

## Kondisi Awal (sudah tersedia)

- Template spreadsheet per-cabang **sudah dibuat** dan mengikuti [`SHEETS-SCHEMA.md`](http://SHEETS-SCHEMA.md) (§2 Per-Cabang Spreadsheet). Template tidak perlu dibuat ulang.
- Spreadsheet Registry sudah ada. ID Registry dan ID folder induk aplikasi sudah dikenal agent (dari konfigurasi proyek yang ada). Gunakan yang sudah ada, jangan buat Registry baru.
- Yang perlu diubah: **isi dan struktur Registry**, serta kode yang mengakses spreadsheet cabang dan yang membuat cabang baru.

## Di Luar Scope

- Mengubah struktur sheet di dalam template per-cabang (sudah sesuai skema)
- Integrasi SSO, payroll, absensi
- Perubahan fitur bisnis (jadwal, swap, izin, checklist, handover)

---

## Step 0 — Audit Kode Saat Ini

Sebelum mengubah apa pun, laporkan temuan berikut ke user:

- \[ \] Semua pemanggilan `spreadsheets.create` (atau setara) di kode
- \[ \] Semua tempat yang menentukan spreadsheet cabang (hardcode, env per cabang, atau lookup Registry)
- \[ \] Modul yang membaca Registry sekarang dan kolom apa yang dipakai
- \[ \] Ada tidaknya cache module-level di modul tersebut (dilarang oleh [`AGENTS.md`](http://AGENTS.md) §4)

## Step 0b — Spike Kuota (kerjakan sebelum refactor)

Kuota yang gagal kemarin adalah `spreadsheets.create`. Pastikan jalur baru tidak kena masalah serupa. Dengan service account yang dipakai aplikasi, coba **sekali**:

1. `files.copy` dari template ke folder induk
2. Buat sub-folder di folder induk
3. Upload satu file kecil ke sub-folder itu, lalu hapus semua hasil percobaan

Catat pesan error persis kalau ada yang gagal. Kalau errornya `storageQuotaExceeded`, **berhenti dan laporkan ke user** (kemungkinan perlu Shared Drive atau pendekatan kepemilikan file lain). Jangan lanjut ke Step 3 sebelum spike ini lolos.

Cek juga: hasil copy harus bisa dibuka admin manusia (PRD mengharuskan admin bisa edit spreadsheet langsung). Pastikan folder induk sudah dibagikan ke akun admin sehingga hasil copy mewarisi akses, atau tambahkan pemberian akses eksplisit saat provisioning.

---

## Step 1 — Migrasi Registry

Edit spreadsheet Registry yang sudah ada agar sesuai [`SHEETS-SCHEMA.md`](http://SHEETS-SCHEMA.md) §1:

`Daftar_Cabang`: kolom akhir `Cabang_ID`, `Nama_Cabang`, `Spreadsheet_ID`, `Folder_Drive_ID`, `Provision_Status`, `Aktif`

- Tambahkan kolom yang belum ada, jangan hapus data yang ada
- Untuk cabang yang sudah terdaftar dan spreadsheet-nya sudah ada: isi `Spreadsheet_ID`, isi `Folder_Drive_ID` (buat folder cabang kalau belum ada), set `Provision_Status = ready`
- Kalau ada cabang yang spreadsheet-nya belum pernah berhasil dibuat: set `pending`

`TEMPLATES`: `Template_Spreadsheet_ID`, `Parent_Folder_ID`, satu baris data

> **Superseded saat eksekusi.** Step 1 di atas menyebut sheet baru bernama `Template_Config`. Keputusan
> user: pakai sheet `TEMPLATES` yang sudah ada, jangan buat sheet baru. Kolom A tetap
> `Template_Spreadsheet_ID` (nilai `.xlsx` di A2 dipertahankan, dijaga guard `mimeType`), kolom B
> `Parent_Folder_ID` ditambahkan. Nilai efektif ada di `SHEETS-SCHEMA.md` §1.

`Employees` dan `Settings_Global`: cocokkan header dengan skema, laporkan selisih, jangan hapus data.

Sebelum mengubah, tampilkan rencana perubahan (kolom yang ditambah, baris yang diisi) dan **minta konfirmasi user**, karena ini mengubah data live.

## Step 2 — Verifikasi Template terhadap Skema

Buat script kecil (`scripts/verify-template`) yang membaca header tiap sheet di template dan membandingkannya dengan [`SHEETS-SCHEMA.md`](http://SHEETS-SCHEMA.md) §2 (nama sheet, urutan kolom). Script ini dipakai dua kali: sekarang, dan sebagai validasi setelah setiap copy di Step 3. Kalau ada selisih, laporkan, jangan diperbaiki diam-diam.

---

## Step 3 — Refactor Kode

### 3.1 Modul lookup cabang

Satu fungsi tunggal, misal `getBranch(cabangId)`, mengembalikan `{ spreadsheetId, folderId, status }` dari `Daftar_Cabang`.

- Tolak (error jelas) kalau `Provision_Status` bukan `ready` atau `Aktif` bukan `TRUE`
- Semua kode yang butuh spreadsheet cabang wajib lewat fungsi ini, tidak ada ID yang di-hardcode atau diambil dari env per cabang
- **Caching:** jangan pakai variabel module-level. Lookup Registry di setiap request memakan kuota baca Sheets, jadi kalau perlu cache, gunakan cache bawaan Next.js (`unstable_cache` atau `use cache`, sesuai versi Next yang dipakai) dengan invalidasi saat Registry berubah. Sampaikan opsi yang dipilih ke user sebelum implementasi.

### 3.2 Service provisioning

`lib/google/provision.ts`, mengikuti alur di [`SHEETS-SCHEMA.md`](http://SHEETS-SCHEMA.md) ("Alur Provisioning Cabang Baru"):

1. Buat baris `Daftar_Cabang` (`Cabang_ID` baru, `pending`)
2. `files.copy` dari `Template_Spreadsheet_ID`
3. Rename hasil copy dengan nama cabang
4. Buat folder cabang di `Parent_Folder_ID`
5. Tulis `Spreadsheet_ID` dan `Folder_Drive_ID`, set `ready`
6. Jalankan verifikasi header (Step 2) pada hasil copy sebelum set `ready`
7. Kalau ada langkah gagal: set `failed`, jangan hapus baris, simpan error di log server

Syarat:

- **Idempotent:** retry pada cabang `failed` tidak membuat baris ganda, dan tidak membuat copy kedua kalau `Spreadsheet_ID` sudah terisi
- Urutan penulisan aman: catat ID hasil copy ke Registry secepat mungkin setelah copy berhasil, supaya tidak ada spreadsheet yatim
- Hapus semua pemanggilan `spreadsheets.create`

### 3.3 Endpoint

Sesuaikan dengan [`API-CONTRACT.md`](http://API-CONTRACT.md) §3:

- `POST /api/branches` memicu provisioning (respons 201 atau 502 `PROVISION_FAILED`)
- `POST /api/branches/:id/retry-provision`

### 3.4 Foto

Upload foto checklist memakai `Folder_Drive_ID` cabang dari `getBranch()`. Simpan link file di `Checklist_Log.Foto_URL`. Tidak ada folder di-hardcode.

---

## Step 4 — Verifikasi (Acceptance)

- \[ \] Tidak ada lagi pemanggilan `spreadsheets.create` di kode
- \[ \] Membuat cabang uji lewat aplikasi: muncul spreadsheet ber-nama cabang, folder cabang, baris Registry lengkap berstatus `ready`
- \[ \] Header spreadsheet hasil copy lolos script verifikasi
- \[ \] Admin manusia bisa membuka dan mengedit spreadsheet hasil copy
- \[ \] Simulasi gagal (misal template ID salah): status `failed`, retry berhasil tanpa baris ganda
- \[ \] Upload foto uji masuk ke folder cabang yang benar
- \[ \] Cabang berstatus `pending`/`failed`/nonaktif ditolak oleh `getBranch()`
- \[ \] Data cabang lama (kalau ada) tetap bisa diakses setelah migrasi Registry
- \[ \] Hapus cabang uji beserta spreadsheet dan foldernya setelah selesai

## Step 5 — Sinkronisasi Dokumen

Kalau ada penyimpangan dari [`SHEETS-SCHEMA.md`](http://SHEETS-SCHEMA.md) atau [`API-CONTRACT.md`](http://API-CONTRACT.md) selama implementasi, update dokumen itu di commit yang sama (aturan [`AGENTS.md`](http://AGENTS.md) §5).