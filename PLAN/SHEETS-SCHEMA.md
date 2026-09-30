# MYSHIFT Sheets Schema (Source of Truth)

> **Versi:** 1.3.0
> **Tanggal:** 2026-09-29
> **Turunan dari:** `FULL-PRD.md`
> **Tujuan:** Karena admin bisa edit data langsung lewat spreadsheet, dokumen ini adalah kontrak PASTI struktur tiap sheet nama, urutan kolom, tipe data, dan mana yang boleh diedit manual vs auto-generate oleh sistem. **Jangan ubah struktur di spreadsheet tanpa update dokumen ini juga.**

Legend kolom "Sumber":
- 🔒 **Auto** digenerate sistem, jangan diedit manual (bisa merusak relasi/ID)
- ✏️ **Manual OK** aman diedit admin langsung di spreadsheet
- ⚠️ **Manual hati-hati** bisa diedit manual tapi harus ikut format yang ditentukan (enum/ID reference)

---

## 1. Registry Spreadsheet (1 file, terpisah dari data operasional per cabang)

### Sheet: `Daftar_Cabang`

| Kolom | Tipe | Sumber | Keterangan |
|---|---|---|---|
| `Cabang_ID` | string, format `CBG###` | 🔒 Auto | Primary key |
| `Nama_Cabang` | string | ✏️ Manual OK | |
| `Spreadsheet_ID` | string (Google Sheets ID) | 🔒 Auto | Diisi otomatis saat provisioning cabang baru |
| `Folder_Drive_ID` | string (Google Drive folder ID) | 🔒 Auto | Folder Drive milik cabang ini; semua file operasional (termasuk foto checklist) hidup di dalamnya |
| `Provision_Status` | enum: `pending` \| `ready` \| `failed` | 🔒 Auto | Status provisioning. `pending` = baris sudah ditulis, Drive belum jadi. `ready` = folder + spreadsheet siap. `failed` = provisioning gagal, bisa dicoba ulang lewat `retry-provision` |
| `Aktif` | boolean (`TRUE`/`FALSE`) | ✏️ Manual OK | Nonaktifkan cabang tanpa hapus data |

> Kolom `Aktif` tetap posisi **terakhir** (F). `Folder_Drive_ID` dan `Provision_Status` disisipkan di
>mgrinya, kolom lama tidak digeser. Urutan kolom ini dienkode di `REGISTRY_HEADERS.Daftar_Cabang`
> (`lib/google/sheet-schema.ts`) ubah di sini **dan** di sana dalam satu commit.

### Sheet: `TEMPLATES`

Sheet konfigurasi yang jadi **sumber kebenaran tunggal** untuk template cabang. Menantikan env var
`TEMPLATE_SPREADSHEET_ID` dan `MYSHIFT_FOLDER` (keduanya dihapus, lihat §2 "Alur pasang template").

| Kolom | Tipe | Sumber | Keterangan |
|---|---|---|---|
| `Template_Spreadsheet_ID` | string (Google Sheets ID) | 🔒 Auto | Template cabang yang di-`copy` saat provisioning |
| `Parent_Folder_ID` | string (Google Drive folder ID) | 🔒 Auto | Folder induk tempat folder per cabang dibuat |

Tepat **satu baris data** (baris 2). Nilai kosong di salah satu kolom → provisioning menolak dengan
`SHEETS_SETUP_REQUIRED` dan log ke server, bukan diam-diam memakai fallback.

### Sheet: `Employees`

| Kolom | Tipe | Sumber | Keterangan |
|---|---|---|---|
| `Employee_ID` | string, format `EMP-###` | 🔒 Auto | Primary key |
| `Username` | string, unique | ✏️ Manual OK | |
| `PIN_Hash` | string (scrypt hash) | 🔒 Auto | **Jangan pernah isi manual dalam bentuk plaintext** |
| `Nama` | string | ✏️ Manual OK | |
| `Role` | enum: `admin` \| `karyawan` | ⚠️ Manual hati-hati | Salah ketik = user kehilangan akses fitur |
| `Cabang_Aktif` | string, referensi `Cabang_ID` | ⚠️ Manual hati-hati | Harus cocok dengan ID valid di `Daftar_Cabang` |
| `Cabang_Terafiliasi` | string, comma-separated `Cabang_ID` | ⚠️ Manual hati-hati | Untuk karyawan yang bisa pindah-pindah cabang |
| `Aktif` | boolean | ✏️ Manual OK | |
| `Failed_Login_Attempts` | number | 🔒 Auto | Reset otomatis setelah lock berakhir |
| `Locked_Until` | datetime ISO 8601 | 🔒 Auto | |

### Sheet: `Settings_Global`

| Kolom | Tipe | Sumber |
|---|---|---|
| `Key` | string | ✏️ Manual OK |
| `Value` | string | ✏️ Manual OK |

---

## 2. Per-Cabang Spreadsheet (1 file per cabang, duplikat dari template)

### Template: `PLAN/templates/MYSHIFT-Template-Cabang.xlsx`

Template cabang dibuat dari kode, bukan dibuat manual di Drive:

```
pnpm template:branch   # -> PLAN/templates/MYSHIFT-Template-Cabang.xlsx
```

- Generator: `scripts/build-branch-template.ts`. Header dibaca dari `BRANCH_HEADERS` dan ID seed dari `ID_PREFIX`, jadi template tidak mungkin melenceng dari `lib/google/sheet-schema.ts` / `lib/ids.ts`.
- Isi file: 13 sheet pada urutan `BRANCH_SHEET_NAMES`, baris header di baris 1, freeze pane di baris 2.
- **Sheet ber-seed** (master data, boleh diubah admin): `Shifts` (3 shift), `Kategori_Izin` (3 kategori), `SOP_Kategori` (1 kategori), `Checklist_Point` (6 point), `Handover_Template` (4 field), `Kategori_Incident` (9 kategori).
- **Sheet header-only** (log/permintaan, ditulis aplikasi): `Schedules`, `Shift_Swaps`, `Izin`, `Checklist_Log`, `Shift_Report_Audit`, `Handover_Log`, `Incidents`.
- Semua kolom diformat sebagai teks (`@`) kecuali `Urutan` yang numerik app membaca `FORMATTED_VALUE`, dan `validDate` butuh literal `YYYY-MM-DD` serta `timeOverlaps` butuh literal `HH:mm` (bukan serial number Sheets).

Alur pasang template (sekali, manual):

1. `pnpm template:branch`
2. `pnpm template:import` meng-import `.xlsx` ke folder induk **lewat Drive bridge**
   (`gas/Code.js`, `uploadType`-konversi setara) lalu menulis ulang header 13 sheet. **Bukan** upload
   manual lalu "Save as Google Sheets" upload `.xlsx` mentah menghasilkan file `.xlsx`, dan
   `files.copy` memang tidak bisa dipakai untuk template `.xlsx`. (Konversi harus lewat bridge:
   service account tidak punya kuota Drive untuk membuat file. Paksa jalur lama dengan
   `--via=service-account` hanya kalau akunnya punya kuota sendiri.)
3. Bagikan hasil import ke `GOOGLE_SERVICE_ACCOUNT_EMAIL` sebagai **Editor**
4. Tulis ID hasil import ke `TEMPLATES.Template_Spreadsheet_ID` dan folder induk ke
   `TEMPLATES.Parent_Folder_ID` (lihat §1). Env var `TEMPLATE_SPREADSHEET_ID` / `MYSHIFT_FOLDER`
   sudah dihapus sheet `TEMPLATES` yang jadi sumber config.
5. Verifikasi: `pnpm verify:template` harus melaporkan header 13 sheet sesuai §2 sebelum cabang
   pertama dibuat.

> **Prasyarat Drive (keputusan user 2026-09-29): Drive bridge Apps Script.** Service account aplikasi
> punya `storageQuota.limit = 0`, jadi **semua pembuatan file** olehnya ditolak Drive
> (`Service Accounts do not have storage quota` / `The user's Drive storage quota has been exceeded`)
> termasuk `files.copy` dan pembuatan Google Sheet native, tidak hanya upload. Folders tetap bisa
> dibuat (folder tidak makan kuota). Karena itu: konversi template, copy template ke folder cabang, dan
> upload foto checklist dijalankan lewat `gas/Code.js` sebagai pemilik folder; baca/tulis isi
> spreadsheet tetap lewat service account. Cek jalannya dengan `pnpm spike:drive` (jalur service
> account) dan `pnpm check:bridge` (jalur bridge). Detail temuan ada di `Db refactor-plan.md` Step 0b.

### Struktur folder Drive

```
<Parent_Folder_ID>/                       ← TEMPLATES.Parent_Folder_ID
├── <Template>                            ← TEMPLATES.Template_Spreadsheet_ID (tidak di-copy keluar)
└── <Nama_Cabang> (CBG###)/               ← Daftar_Cabang.Folder_Drive_ID, satu per cabang
    ├── <Nama_Cabang> (CBG###)            ← Google Sheet cabang (Salinan_ID)
    └── Checklist Foto/                   ← unggahan foto checklist shift
        └── <Schedule_ID>_<Item_ID>_<timestamp>.<ext>
```

Nama folder cabang = `Nama_Cabang` + ` (CBG###)`, setelah karakter `/\?*:<>|` dibuang (Drive
menolak karakter itu) dan dipotong agar total ≤ 60 karakter (batas Drive). Folder dibuat oleh
service account, jadi mewarisi permission folder induk.

---

### Sheet: `Shifts`

| Kolom | Tipe | Sumber | Keterangan |
|---|---|---|---|
| `Shift_ID` | string, format `SFT-###` | 🔒 Auto | Primary key |
| `Nama` | string (misal Opening/Middle/Closing) | ✏️ Manual OK | |
| `Jam_Mulai` | time `HH:mm` | ✏️ Manual OK | |
| `Jam_Selesai` | time `HH:mm` | ✏️ Manual OK | |

### Sheet: `Schedules`

| Kolom | Tipe | Sumber | Keterangan |
|---|---|---|---|
| `Schedule_ID` | string, format `SCH-YYYYMMDD-###` | 🔒 Auto | Primary key |
| `Employee_ID` | string, referensi Registry `Employees` | 🔒 Auto (dari form admin) | |
| `Shift_ID` | string, referensi `Shifts` | 🔒 Auto | |
| `Tanggal` | date `YYYY-MM-DD` | 🔒 Auto | |
| `Status` | enum: `scheduled` \| `started` \| `completed` | 🔒 Auto | Diupdate sistem saat karyawan mulai/selesai shift |
| `Started_At` | datetime ISO 8601 | 🔒 Auto | Diisi saat tombol "mulai shift" ditekan |
| `Updated_Via` | string (nama app: `myshift`) | 🔒 Auto | Untuk jejak integrasi nanti dengan MYLAUNCHER |
| `Report_Generated_At` | datetime ISO 8601, nullable | 🔒 Auto | Waktu laporan shift dibuat; checklist dan handover tetap dapat diedit, dengan audit perubahan |
| `Report_Token` | string, nullable | 🔒 Auto | HMAC-signed, akses publik tanpa kedaluwarsa; token tetap tersimpan pada jadwal |

> ⚠️ Sheet ini sebaiknya **tidak diedit manual** untuk baris yang sudah ada (buat/ubah jadwal lewat aplikasi, bukan langsung di spreadsheet) kolom `Status`/`Started_At` bisa jadi tidak konsisten kalau diedit manual. Menambah baris manual untuk migrasi data awal masih aman selama format ID diikuti persis.

### Sheet: `Shift_Swaps`

| Kolom | Tipe | Sumber |
|---|---|---|
| `Swap_ID` | string, format `SWP-###` | 🔒 Auto |
| `Schedule_ID` | string, referensi `Schedules` | 🔒 Auto |
| `Requested_By` | string, `Employee_ID` | 🔒 Auto |
| `Requested_With` | string, `Employee_ID` | 🔒 Auto |
| `Alasan` | string | 🔒 Auto (dari form) |
| `Status` | enum: `pending` \| `approved` \| `rejected` | 🔒 Auto |
| `Approved_By` | string, `Employee_ID`, nullable | 🔒 Auto |
| `Reject_Reason` | string, nullable | 🔒 Auto (dari form) |

### Sheet: `Izin`

| Kolom | Tipe | Sumber |
|---|---|---|
| `Izin_ID` | string, format `IZN-###` | 🔒 Auto |
| `Employee_ID` | string | 🔒 Auto |
| `Schedule_ID` | string, referensi `Schedules` | 🔒 Auto |
| `Kategori_ID` | string, referensi `Kategori_Izin` | 🔒 Auto (dari form) |
| `Keterangan` | string | 🔒 Auto (dari form) |
| `Status` | enum: `pending` \| `approved` \| `rejected` | 🔒 Auto |
| `Approved_By` | string, nullable | 🔒 Auto |
| `Reject_Reason` | string, nullable | 🔒 Auto (dari form reject) |

### Sheet: `Kategori_Izin`

| Kolom | Tipe | Sumber |
|---|---|---|
| `Kategori_ID` | string, format `KTG-###` | 🔒 Auto |
| `Label` | string (misal "Sakit", "Cuti", "Keperluan pribadi") | ✏️ Manual OK |
| `Aktif` | boolean | ✏️ Manual OK |

### Sheet: `SOP_Kategori`

| Kolom | Tipe | Sumber |
|---|---|---|
| `Kategori_ID` | string, format `SOP-###` | 🔒 Auto |
| `Nama` | string | ✏️ Manual OK |
| `Urutan` | number | ✏️ Manual OK |
| `Aktif` | boolean | ✏️ Manual OK |

### Sheet: `Checklist_Point`

| Kolom | Tipe | Sumber | Keterangan |
|---|---|---|---|
| `Point_ID` | string, format `CHK-###` | 🔒 Auto | Primary key |
| `Kategori_ID` | string, referensi `SOP_Kategori` | ⚠️ Manual hati-hati | |
| `Deskripsi` | string | ✏️ Manual OK | |
| `Tipe_Penyelesaian` | enum `centang` \| `centang_foto` \| `angka` \| `teks` \| `pilihan` | ✏️ Manual OK | Per point |
| `Satuan` | string, nullable | ✏️ Manual OK | Hanya `angka` |
| `Batas_Min` | number, nullable | ✏️ Manual OK | Hanya `angka`; di luar batas memberi warning, tidak memblokir |
| `Batas_Max` | number, nullable | ✏️ Manual OK | Hanya `angka`; di luar batas memberi warning, tidak memblokir |
| `Opsi_Pilihan` | string comma-separated, nullable | ✏️ Manual OK | Hanya `pilihan` |
| `Berlaku_Semua_Shift` | boolean | ✏️ Manual OK | |
| `Shift_IDs` | string comma-separated `Shift_ID`, nullable | ⚠️ Manual hati-hati | Diisi hanya jika tidak berlaku untuk semua shift |
| `Urutan` | number | ✏️ Manual OK | Urutan dalam kategori |
| `Aktif` | boolean | ✏️ Manual OK | Point dengan log dinonaktifkan, bukan dihapus |

### Sheet: `Checklist_Log`

| Kolom | Tipe | Sumber |
|---|---|---|
| `Log_ID` | string, format `CLG-###` | 🔒 Auto |
| `Schedule_ID` | string | 🔒 Auto |
| `Point_ID` | string | 🔒 Auto |
| `Nilai` | string | 🔒 Auto | `TRUE`, angka, teks, atau opsi sesuai tipe point |
| `Foto_URL` | string, nullable | 🔒 Auto |
| `Checked_By` | string, `Employee_ID` | 🔒 Auto |
| `Checked_At` | datetime ISO 8601 | 🔒 Auto |

Satu row menyimpan nilai terbaru per (`Schedule_ID`, `Point_ID`). Perubahan setelah laporan dibuat
dicatat append-only di `Shift_Report_Audit`.

### Sheet: `Shift_Report_Audit`

| Kolom | Tipe | Sumber |
|---|---|---|
| `Audit_ID` | string, format `AUD-###` | 🔒 Auto |
| `Schedule_ID` | string, referensi `Schedules` | 🔒 Auto |
| `Bagian` | enum `checklist` \| `handover` | 🔒 Auto |
| `Record_ID` | string, `Point_ID` atau `Field_ID` | 🔒 Auto |
| `Field` | string | 🔒 Auto |
| `Nilai_Lama` | string | 🔒 Auto |
| `Nilai_Baru` | string | 🔒 Auto |
| `Actor_ID` | string, `Employee_ID` | 🔒 Auto |
| `Changed_At` | datetime ISO 8601 | 🔒 Auto |

### Sheet: `Handover_Template`

| Kolom | Tipe | Sumber |
|---|---|---|
| `Field_ID` | string, format `HOF-###` | 🔒 Auto |
| `Label` | string | ✏️ Manual OK |
| `Wajib` | boolean | ✏️ Manual OK |
| `Urutan` | number | ✏️ Manual OK |

### Sheet: `Handover_Log`

| Kolom | Tipe | Sumber |
|---|---|---|
| `Log_ID` | string, format `HLG-###` | 🔒 Auto |
| `Schedule_ID` | string | 🔒 Auto |
| `Field_ID` | string | 🔒 Auto |
| `Isi` | string | 🔒 Auto (dari form) |
| `Created_By` | string, `Employee_ID` | 🔒 Auto |
| `Created_At` | datetime ISO 8601 | 🔒 Auto |

### Sheet: `Kategori_Incident`

| Kolom | Tipe | Sumber |
|---|---|---|
| `Kategori_ID` | string, format `KIC-###` | 🔒 Auto |
| `Label` | string | ✏️ Manual OK |
| `Aktif` | boolean (`TRUE`/`FALSE`) | ✏️ Manual OK |

> 9 kategori default di-seed: Mesin Rusak, Komplain Customer, Barang Rusak, Stok Habis, Kesalahan Order, Kebersihan, Keamanan, Karyawan Berhalangan, Lainnya.

### Sheet: `Incidents`

| Kolom | Tipe | Sumber |
|---|---|---|
| `Incident_ID` | string, format `INC-###` | 🔒 Auto |
| `Kategori_ID` | string, `KIC-###` reference | 🔒 Auto |
| `Deskripsi` | string (min. 10 karakter) | 🔒 Auto (dari form) |
| `Severity` | enum: `low` \| `medium` \| `high` | ⚠️ Manual hati-hati |
| `Foto_URL` | string (URL, opsional) | 🔒 Auto |
| `Status` | enum: `open` \| `resolved` | ⚠️ Manual hati-hati |
| `Resolved_By` | string, `Employee_ID` | 🔒 Auto |
| `Resolved_At` | datetime ISO 8601 | 🔒 Auto |
| `Created_By` | string, `Employee_ID` | 🔒 Auto |
| `Created_At` | datetime ISO 8601 | 🔒 Auto |

---

## 3. Format ID Ringkasan

Semua ID pakai prefix bermakna + nomor urut (konsisten dengan pola STOKIS, bukan UUID polos ala MYCUSTOMER supaya lebih mudah dipetakan manual saat integrasi SSO nanti):

| Entitas | Format | Contoh |
|---|---|---|
| Cabang | `CBG###` | `CBG001` |
| Karyawan | `EMP-###` | `EMP-014` |
| Shift template | `SFT-###` | `SFT-002` |
| Jadwal | `SCH-YYYYMMDD-###` | `SCH-20260401-003` |
| Swap | `SWP-###` | `SWP-011` |
| Izin | `IZN-###` | `IZN-007` |
| Kategori izin | `KTG-###` | `KTG-002` |
| Checklist item | `CHK-###` | `CHK-005` |
| Kategori SOP | `SOP-###` | `SOP-001` |
| Checklist log | `CLG-###` | `CLG-102` |
| Laporan shift audit | `AUD-###` | `AUD-018` |
| Handover field | `HOF-###` | `HOF-003` |
| Handover log | `HLG-###` | `HLG-088` |
| Incident | `INC-###` | `INC-001` |
| Kategori incident | `KIC-###` | `KIC-002` |

---

## 4. Panduan Migrasi Data Manual

Karena data awal (karyawan, cabang, shift) rencananya diinput langsung ke spreadsheet:

1. **Isi Registry dulu**: `Daftar_Cabang` → `Employees` (pastikan `Cabang_ID` di `Employees` sudah ada di `Daftar_Cabang`)
2. **PIN tidak boleh diisi plaintext** kalau migrasi manual, PIN harus di-hash dulu lewat script kecil (scrypt) sebelum dimasukkan ke kolom `PIN_Hash`, atau isi lewat form aplikasi (bukan langsung spreadsheet) untuk baris karyawan
3. **Baru isi per-cabang spreadsheet**: `Shifts` dulu, baru `Schedules` kalau mau migrasi jadwal existing
4. Sheet yang murni log/auto (`Checklist_Log`, `Handover_Log`) **tidak perlu** diisi manual biarkan kosong, terisi otomatis begitu aplikasi jalan

### Migrasi role `kepala_cabang`

Role yang didukung aplikasi adalah `admin` dan `karyawan`. Untuk mengubah seluruh akun lama
`kepala_cabang` menjadi `karyawan`, jalankan `pnpm migrate:employee-roles` untuk pratinjau jumlah
baris yang terdampak, lalu `pnpm migrate:employee-roles -- --apply` untuk menulis perubahan ke
Registry. Script hanya mengganti kolom `Role`; ID, PIN hash, cabang, dan status akun dipertahankan.

---

## 5. Yang TIDAK Boleh Diubah Tanpa Update Dokumen Ini

- Nama sheet
- Urutan/nama kolom pada baris header
- Format ID (prefix, jumlah digit)
- Enum values (`Status`, `Role`, `Tipe`) menambah/mengubah nilai enum butuh update kode aplikasi juga

Semua hal di atas dipatok oleh satu modul kode (`lib/google/sheet-schema.ts`) dan diverifikasi test `test/sheet-schema.test.ts` terhadap tabel di dokumen ini kalau dokumen dan kode berbeda, test gagal.

---

## 6. Catatan Implementasi Kolom Otomatis

- **`Failed_Login_Attempts` / `Locked_Until`** ditulis aplikasi pada `POST /api/auth/login`: bertambah 1 tiap kegagalan, akun terkunci 15 menit setelah 5 kegagalan berturut-turut, direset saat login sukses / reset PIN / lock berakhir. Jangan diisi manual.
- **`Spreadsheet_ID`** diisi otomatis oleh provisioning saat `POST /api/branches`: spreadsheet
  cabang dibuat dengan `drive.files.copy` dari `TEMPLATES.Template_Spreadsheet_ID` (bukan
  `spreadsheets.create`, yang kena kuota Drive), header 13 sheet **diverifikasi** terhadap
  `lib/google/sheet-schema.ts` bukan ditulis ulang lalu baris `Daftar_Cabang` dibuat. Kalau
  header hasil copy menyimpang, provisioning berhenti dengan `SHEETS_SETUP_REQUIRED` dan menyebut
  sheet yang bermasalah; perbaikannya di template, bukan di salinan.
- **Verifikasi header** dipakai dua kali lewat `lib/google/template-verify.ts`: script
  `pnpm verify:template` (manual, terhadap template) dan gate sebelum `Provision_Status=ready`
  (otomatis, terhadap tiap salinan). Sheet tambahan yang tidak dikenal hanya diperingatkan.
- **ID log** (`CLG-###`, `HLG-###`) dan **ID master** (`CHK-###`, `HOF-###`) memakai penomoran urut sesuai §3 bukan UUID. Nomor berikutnya dihitung dari nilai maksimum yang ada di sheet.
- **`Status` jadwal** hanya boleh berubah lewat aplikasi: `scheduled` → `started` (`start-shift`) → `completed` (`checklist/submit`, hanya jika checklist 100% dan semua field handover wajib terisi).
- **Migrasi checklist cabang lama**: jalankan `pnpm migrate:checklist` untuk preview (default read-only), lalu tinjau jumlah point/log. `pnpm migrate:checklist -- --branch=CBG### --apply` menerapkan satu cabang; `--apply` tanpa `--branch` menerapkan semua cabang ready. Sheet lama dipertahankan sebagai `Checklist_Template_Legacy` dan `Checklist_Log_Legacy`; data diproyeksikan ke struktur baru tanpa menghapus arsip.
