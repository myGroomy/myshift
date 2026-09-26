# MYSHIFT — Sheets Schema (Source of Truth)

> **Versi:** 1.0.0
> **Tanggal:** 2026-09-26
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
| `Aktif` | boolean (`TRUE`/`FALSE`) | ✏️ Manual OK | Nonaktifkan cabang tanpa hapus data |

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
| `Foto_URL` | string, nullable (link Google Drive) | 🔒 Auto |

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
