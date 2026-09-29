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

> **Hasil Step 0b (spike dieksekusi 2026-09-29, `pnpm spike:drive`): GAGAL — berhenti dan
> dilaporkan ke user, sesuai instruksi Step 0b.** Service account yang dipakai aplikasi punya
> `storageQuota.limit = 0`, jadi Drive menolak semua pembuatan file:
>
> | Operasi | Hasil |
> |---|---|
> | buat sub-folder di folder induk | **OK** (`1M-QLrh_0YFVVDxVx8Zoljbw2ntVpLGXD` = folder `MYSHIFT`, bukan Shared Drive) |
> | upload file kecil ke sub-folder | **403** `Service Accounts do not have storage quota. Leverage shared drives ... or use OAuth delegation` |
> | `files.copy` dari `Template_Spreadsheet_ID` (saat ini masih `.xlsx`) | **403** pesan sama |
> | buat Google Sheet native tanpa media | **403** `The user's Drive storage quota has been exceeded.` |
>
> Semua artefak percobaan sudah dihapus (cleanup OK). Folder induk dibagikan ke
> `taufikalwan47@gmail.com` (owner) + 3 service account (writer), jadi hasil copy akan mewarisi akses
> admin manusia begitu pembuatan file bisa jalan.
>
> Konsekuensi: jalur **copy template belum bisa diverifikasi runtime** — bukan karena kodenya, tapi
> karena kuota Drive service account. Step 2, Step 3.1, Step 3.2 dan Step 3.3 sudah dikerjakan dan
> diuji lewat `test/template-verify.test.ts`, `test/branch-lookup.test.ts`,
> `test/provisioning.test.ts` (fake Drive); Step 3.4 (foto) tetap terhalang batasan yang sama — foto
> adalah file biner, jadi wajib punya pemilik berkuota. Pilihan yang perlu keputusan user:
> (a) taruh folder induk di **Shared Drive** (butuh akun Google Workspace), atau
> (b) **delegasi OAuth** (impersonasi user berkuota) untuk Sheets+Drive, atau
> (c) provisioning manual oleh admin (folder + copy lewat UI Drive) sementara aplikasi hanya
> membaca/menulis isi spreadsheet, dan unggah foto dialihkan ke penyimpanan lain.
>
> Step 4 (acceptance end-to-end) belum dijalankan karena butuh Drive yang bisa menulis.

> **Keputusan user (setelah opsi didiskusikan): pakai Drive bridge Apps Script.** Script
> `gas/Code.js` (Script ID `1KbVNbwFKO9eMTLAnQBL_8Uu5dugF7bZYh-40ISWURx9QffS4S7saGhl8`) dijalankan
> sebagai pemilik folder dan mengeksekusi 3 operasi yang butuh kuota: `importFile` (konversi
> template), `copyFile` (provisioning), `uploadFile` (foto checklist). Alasan dipilih di atas OAuth:
> tidak ada refresh token dengan scope `drive` yang disimpan di Vercel, blast radius dibatasi oleh
> allowlist folder MYSHIFT + shared secret. Syarat yang dipenuhi: GAS tetap bodoh (tanpa pengetahuan
> skema/bisnis, semua aturan tetap di aplikasi + test), idempotent-by-name, dan ada carve-out tertulis
> di `AGENTS.md` §4 (larangan GAS tetap berlaku untuk database).
>
> Status implementasi: `lib/google/drive-bridge.ts` (client + retry + pemetaan error), provisioning
> dan foto dialihkan ke bridge, tests `test/drive-bridge.test.ts` / `test/provisioning.test.ts` /
> `test/photo-upload.test.ts`, plus skrip operasional `pnpm probe:bridge` (diagnosa endpoint),
> `pnpm check:bridge` (copy + upload + idempotensi, self-cleaning), dan
> `pnpm check:provisioning` (acceptance end-to-end, self-cleaning).
>
> **Selesai 2026-09-29.** Bridge hidup di project Apps Script baru
> (`1hUkZgY1A9wnVdXZoWnBwkWqOHjrXm9TmV3N73RGSBsDuK_q9SFDKaM2O`; deployment `Execute as: Me`,
> `Who has access: Anyone`). Insiden yang tercatat: project pertama (`1KbVNbw…`) sempat berhasil,
> lalu **tidak bisa dipulihkan** setelah `oauthScopes` dideklarasikan eksplisit di manifest — semua
> deployment membalas 401, dan re-auth maupun revert manifest tidak menolong. Pelajaran yang
> tersimpan: jangan tulis `oauthScopes`; biarkan auto-detect dari kode. Catatan operasional lain:
> service account **tidak bisa menghapus** file milik user, jadi artefak uji dibersihkan dengan
> membuang folder induknya (isi ikut ke trash), bukan menghapus file satu per satu.
>
> **Step 4 (acceptance) — LOLOS** lewat `pnpm check:provisioning`: reserve baris `pending`;
> provisioning lewat bridge (folder + copy template, ID ditulis sebelum verifikasi); header salinan
> sesuai §2 (9 sheet, urutan kolom); `getBranch()` resolve spreadsheet + folder; salinan bisa dibuka
> admin manusia (`taufikalwan47@gmail.com=owner` + 3 service account `writer`); retry saat `failed`
> reuse folder & salinan tanpa baris/salinan kedua; foto checklist masuk `<folder>/Checklist Foto/`;
> cabang `pending` → 503 `SHEETS_SETUP_REQUIRED`, nonaktif → 404 `NOT_FOUND`; cabang uji + folder-nya
> dibersihkan. Sisa: `CBG001` masih `pending` (belum pernah punya spreadsheet) dan bisa
> diprovisioning lewat `POST /api/branches/:id/retry-provision`.

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

> **Eksekusi.** Fungsi tunggalnya adalah `getBranch()` → `lib/google/branch-data.ts`
> (`branchSpreadsheet()` / `branchSpreadsheetFrom()`), mengembalikan
> `{ branch, spreadsheetId, folderId, status }`. Gerbang `branchUnavailable()` menolak cabang
> nonaktif (`NOT_FOUND`) dan `Provision_Status` bukan `ready` (`SHEETS_SETUP_REQUIRED`); agregat
> (dashboard/laporan) memakai `usableBranches()` supaya satu cabang setengah jadi tidak mengosongkan
> seluruh laporan. Nama `getBranch` tidak dipakai supaya tidak ada dua nama untuk satu perilaku —
> `branchSpreadsheet()` tetap nama aslinya di repo.
>
> **Caching — opsi yang dipilih: TIDAK pakai cache.** Alasannya:
> 1. Nilainya kecil: satu lookup = satu `values.get`, sedangkan request yang sama biasanya membaca
>    1–6 range di spreadsheet cabang; penghematannya di bawah 20% kuota baca.
> 2. Risikonya nyata: PRD mengizinkan admin mengedit `Daftar_Cabang` langsung di spreadsheet, dan
>    cache (bahkan TTL 30 detik) menyajikan `Spreadsheet_ID` lama tepat saat admin sedang
>    memperbaiki cabang rusak.
> 3. `unstable_cache` di Next 16 menuntut argumen profil pada `revalidateTag(tag, profile)` dan
>    melempar `Invariant: incrementalCache missing` di luar konteks request (script/`node:test`),
>    jadi butuh jalur fallback tambahan.
>
> Kalau nanti kuota baca jadi masalah, tambahkannya di satu tempat (`getBranchRows()` di
> `lib/google/registry.ts`) dengan `tags: ["myshift:registry:branches"]`, `revalidate: 30`, dan
> `revalidateTag(...)` di POST/PATCH/retry-provision. **Jangan** cache `Employees`: lockout login dan
> penonaktifan karyawan wajib dicek ulang tiap request (API-CONTRACT §0).

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

> **Eksekusi.** `lib/google/provisioning.ts` — `provisionBranchDrive(branchId, nama, options, deps)`.
> `spreadsheets.create` sudah tidak dipakai di jalur cabang (`scripts/setup-sheets.ts` masih
> memakainya, tapi hanya untuk bootstrap Registry sekali, dan tidak pernah untuk cabang).
> `onDriveObject` dipakai route untuk menulis `Spreadsheet_ID`/`Folder_Drive_ID` ke Registry tepat
> setelah objek Drive jadi; verifikasi header (Step 2) jalan di dalam fungsi ini, jadi POST /api/branches
> dan retry-provision sama-sama tidak bisa menandai `ready` sebelum lolos. Retry idempoten: folder
> diambil dari baris, dan salinan lama dipakai ulang kalau masih ada **dan** lolos verifikasi.
> Anomali ditemukan & diperbaiki saat menulis test: kegagalan `files.create` (folder) dulu lolos
> sebagai error mentah (HTTP 500), sekarang `PROVISION_FAILED` (502) sesuai kontrak.

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