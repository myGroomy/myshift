# MYSHIFT — Sheets Schema (Source of Truth)

> **Versi:** 1.1.0
> **Tanggal:** 2026-09-28
> **Turunan dari:** `FULL-PRD.md`
> **Tujuan:** Karena admin bisa edit data langsung lewat spreadsheet, dokumen ini adalah kontrak PASTI struktur tiap sheet — nama, urutan kolom, tipe data, dan mana yang boleh diedit manual vs auto-generate oleh sistem. **Jangan ubah struktur di spreadsheet tanpa update dokumen ini juga.**

Legend kolom "Sumber":
- 🔒 **Auto** — digenerate sistem, jangan diedit manual (bisa merusak relasi/ID)
- ✏️ **Manual OK** — aman diedit admin langsung di spreadsheet
- ⚠️ **Manual hati-hati** — bisa diedit manual tapi harus ikut format yang ditentukan (enum/ID reference)

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
> (`lib/google/sheet-schema.ts`) — ubah di sini **dan** di sana dalam satu commit.

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
| `Role` | enum: `admin` \| `kepala_cabang` \| `karyawan` | ⚠️ Manual hati-hati | Salah ketik = user kehilangan akses fitur |
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
- Isi file: 9 sheet pada urutan `BRANCH_SHEET_NAMES`, baris header di baris 1, freeze pane di baris 2.
- **Sheet ber-seed** (master data, boleh diubah admin): `Shifts` (3 shift), `Kategori_Izin` (3 kategori), `Checklist_Template` (6 item), `Handover_Template` (4 field).
- **Sheet header-only** (log/permintaan, ditulis aplikasi): `Schedules`, `Shift_Swaps`, `Izin`, `Checklist_Log`, `Handover_Log`.
- Semua kolom diformat sebagai teks (`@`) kecuali `Urutan` yang numerik — app membaca `FORMATTED_VALUE`, dan `validDate` butuh literal `YYYY-MM-DD` serta `timeOverlaps` butuh literal `HH:mm` (bukan serial number Sheets).

Alur pasang template (sekali, manual):

1. `pnpm template:branch`
2. `pnpm template:import` — meng-import `.xlsx` ke folder induk lewat Drive API
   (`uploadType: "import"`, `importAs: "application/vnd.google-apps.spreadsheet"`) lalu menulis ulang
   header 9 sheet. **Bukan** upload manual lalu "Save as Google Sheets" — upload `.xlsx` mentah
   menghasilkan file `.xlsx`, dan `files.copy` memang tidak bisa dipakai untuk template `.xlsx`.
3. Bagikan hasil import ke `GOOGLE_SERVICE_ACCOUNT_EMAIL` sebagai **Editor**
4. Tulis ID hasil import ke `TEMPLATES.Template_Spreadsheet_ID` dan folder induk ke
   `TEMPLATES.Parent_Folder_ID` (lihat §1). Env var `TEMPLATE_SPREADSHEET_ID` / `MYSHIFT_FOLDER`
   sudah dihapus — sheet `TEMPLATES` yang jadi sumber config.

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

> ⚠️ Sheet ini sebaiknya **tidak diedit manual** untuk baris yang sudah ada (buat/ubah jadwal lewat aplikasi, bukan langsung di spreadsheet) — kolom `Status`/`Started_At` bisa jadi tidak konsisten kalau diedit manual. Menambah baris manual untuk migrasi data awal masih aman selama format ID diikuti persis.

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

### Sheet: `Checklist_Template`

| Kolom | Tipe | Sumber |
|---|---|---|
| `Item_ID` | string, format `CHK-###` | 🔒 Auto |
| `Tipe` | enum: `opening` \| `closing` | ✏️ Manual OK |
| `Deskripsi` | string | ✏️ Manual OK |
| `Wajib_Foto` | boolean | ✏️ Manual OK |
| `Urutan` | number (untuk sorting tampilan) | ✏️ Manual OK |
| `Aktif` | boolean | ✏️ Manual OK |

### Sheet: `Checklist_Log`

| Kolom | Tipe | Sumber |
|---|---|---|
| `Log_ID` | string, format `CLG-###` | 🔒 Auto |
| `Schedule_ID` | string | 🔒 Auto |
| `Item_ID` | string | 🔒 Auto |
| `Checked_By` | string, `Employee_ID` | 🔒 Auto |
| `Checked_At` | datetime ISO 8601 | 🔒 Auto |
| `Foto_URL` | string, nullable (URL http/https) | 🔒 Auto | Diisi dari `POST /api/schedules/:id/checklist/photo`. Untuk foto yang diunggah app, nilainya URL viewer Drive `https://drive.google.com/uc?id=<fileId>`. Field URL manual di UI tetap diterima, jadi nilainya tidak selalu URL viewer Drive |

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

---

## 3. Format ID — Ringkasan

Semua ID pakai prefix bermakna + nomor urut (konsisten dengan pola STOKIS, bukan UUID polos ala MYCUSTOMER — supaya lebih mudah dipetakan manual saat integrasi SSO nanti):

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
| Checklist log | `CLG-###` | `CLG-102` |
| Handover field | `HOF-###` | `HOF-003` |
| Handover log | `HLG-###` | `HLG-088` |

---

## 4. Panduan Migrasi Data Manual

Karena data awal (karyawan, cabang, shift) rencananya diinput langsung ke spreadsheet:

1. **Isi Registry dulu**: `Daftar_Cabang` → `Employees` (pastikan `Cabang_ID` di `Employees` sudah ada di `Daftar_Cabang`)
2. **PIN tidak boleh diisi plaintext** — kalau migrasi manual, PIN harus di-hash dulu lewat script kecil (scrypt) sebelum dimasukkan ke kolom `PIN_Hash`, atau isi lewat form aplikasi (bukan langsung spreadsheet) untuk baris karyawan
3. **Baru isi per-cabang spreadsheet**: `Shifts` dulu, baru `Schedules` kalau mau migrasi jadwal existing
4. Sheet yang murni log/auto (`Checklist_Log`, `Handover_Log`) **tidak perlu** diisi manual — biarkan kosong, terisi otomatis begitu aplikasi jalan

---

## 5. Yang TIDAK Boleh Diubah Tanpa Update Dokumen Ini

- Nama sheet
- Urutan/nama kolom pada baris header
- Format ID (prefix, jumlah digit)
- Enum values (`Status`, `Role`, `Tipe`) — menambah/mengubah nilai enum butuh update kode aplikasi juga

Semua hal di atas dipatok oleh satu modul kode (`lib/google/sheet-schema.ts`) dan diverifikasi test `test/sheet-schema.test.ts` terhadap tabel di dokumen ini — kalau dokumen dan kode berbeda, test gagal.

---

## 6. Catatan Implementasi Kolom Otomatis

- **`Failed_Login_Attempts` / `Locked_Until`** — ditulis aplikasi pada `POST /api/auth/login`: bertambah 1 tiap kegagalan, akun terkunci 15 menit setelah 5 kegagalan berturut-turut, direset saat login sukses / reset PIN / lock berakhir. Jangan diisi manual.
- **`Spreadsheet_ID`** — diisi otomatis oleh provisioning saat `POST /api/branches`: spreadsheet cabang dibuat dari `TEMPLATE_SPREADSHEET_ID` (atau spreadsheet baru), header 9 sheet ditulis ulang dari modul skema, baru baris `Daftar_Cabang` dibuat.
- **ID log** (`CLG-###`, `HLG-###`) dan **ID master** (`CHK-###`, `HOF-###`) memakai penomoran urut sesuai §3 — bukan UUID. Nomor berikutnya dihitung dari nilai maksimum yang ada di sheet.
- **`Status` jadwal** hanya boleh berubah lewat aplikasi: `scheduled` → `started` (`start-shift`) → `completed` (`checklist/submit`, hanya jika checklist 100% dan semua field handover wajib terisi).
