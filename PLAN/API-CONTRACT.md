# MYSHIFT API Contract

> **Versi:** 1.6.0
> **Tanggal:** 2026-09-30
> **Turunan dari:** `FULL-PRD.md`
> **Base URL:** `/api`
> **Format response standar (ikut pola STOKIS):**
> ```json
> // Sukses
> { "success": true, "data": { ... } }
> // Gagal
> { "success": false, "error": { "code": "STRING_CODE", "message": "Pesan untuk user", "data": { ... } } }
> ```
> Semua endpoint (kecuali `/api/auth/login`) memerlukan session cookie valid. Data per-cabang untuk
> Admin dapat di-scope ke cabang mana pun; Karyawan hanya dapat mengakses cabang yang terafiliasi
> dengannya. Laporan Karyawan khusus cabang aktif.
>
> **Perubahan v1.1.0** (audit backend): error code disamakan dengan §11 (`VALIDATION_ERROR`, bukan `INVALID_REQUEST`), detail per-field dipindah ke `error.data`, lockout login diimplementasikan, `/api/laporan` menggantikan `/api/reports`, dashboard mengembalikan array (bentuk aktual), dan `GET /api/schedules/:id` ditambahkan.
>
> **Perubahan v1.2.0** (db refactor): Registry jadi sumber konfigurasi template (§3 + `SHEETS-SCHEMA.md` §1 —
> sheet `TEMPLATES` menggantikan env var `TEMPLATE_SPREADSHEET_ID` / `MYSHIFT_FOLDER`). `Daftar_Cabang`
> dapat kolom `Folder_Drive_ID` + `Provision_Status`, provisioning jadi row-first, ada
> `POST /api/branches/:id/retry-provision`, dan ada endpoint unggah foto checklist (§8). Error code
> baru: `PROVISION_FAILED`, `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`.
>
> **Perubahan v1.3.0** (db refactor Step 2–3): header hasil `files.copy` **diverifikasi** terhadap
> `SHEETS-SCHEMA.md` §2 sebelum `Provision_Status=ready` (bukan ditulis ulang) lewat script yang
> sama, `pnpm verify:template`; `Spreadsheet_ID` dicatat ke registry segera setelah copy supaya tidak
> ada spreadsheet yatim; `retry-provision` idempoten (folder dan salinan yang masih sesuai dipakai
> ulang, tidak pernah menyalin dua kali); semua endpoint per-cabang menolak cabang non-`ready`
> dengan `SHEETS_SETUP_REQUIRED`; dashboard/laporan melewati cabang non-`ready` sambil mencatat ke
> log server; `POST /api/branches/:id/retry-provision` sekarang tersedia di UI `/cabang`.
>
> **Perubahan v1.4.0** (Drive bridge): service account aplikasi terbukti punya `storageQuota.limit = 0`
> (`Db refactor-plan.md` Step 0b), sehingga **semua pembuatan file Drive** copy template, konversi
> template, upload foto dijalankan lewat Web App Apps Script `gas/Code.js` sebagai pemilik folder
> (`lib/google/drive-bridge.ts`, env `GAS_DRIVE_BRIDGE_URL` + `GAS_BRIDGE_SECRET`). Baca/tulis *isi*
> spreadsheet tetap Google Sheets API v4 dengan service account. Operational: bridge belum
> terkonfigurasi → `503 SHEETS_SETUP_REQUIRED` (sebelum menyentuh Drive); bridge ditolak/timeout →
> `502 PROVISION_FAILED`; cabang `pending`/`failed` tetap tidak bisa dipakai sampai `retry-provision`
> sukses. Verifikasi end-to-end: `pnpm check:bridge`.
>
> **Perubahan v1.5.0** (simplifikasi role + laporan karyawan): role yang didukung tinggal
> `admin` dan `karyawan`; template checklist dan dashboard hanya untuk Admin. Laporan tersedia
> untuk Karyawan, mencakup progres checklist/handover, dan dibatasi ke cabang aktif.
>
> **Perubahan v1.6.0** (jenis laporan): `/api/laporan` menerima filter `reportType` agar JSON dan CSV
> dapat menampilkan satu jenis laporan. Rekap Checklist sekarang menyertakan progres SOP dan point
> yang belum selesai pada setiap shift.

---

## 0. Aturan umum

- **Branch scope.** Semua endpoint per-cabang menerima `?branchId=` (opsional). Untuk `karyawan`, `branchId` harus salah satu cabang di sesi mereka kalau tidak → `403 FORBIDDEN`. Untuk `admin`, `branchId` boleh cabang mana pun; kalau tidak dikirim, dipakai `activeBranchId` dari sesi admin. Laporan Karyawan dibatasi ke `activeBranchId`.
- **Cabang harus siap pakai.** `getBranch()` (`lib/google/branch-data.ts`) adalah satu-satunya cara kode menemukan spreadsheet/folder cabang. Cabang nonaktif → `404 NOT_FOUND`; cabang dengan `Provision_Status` bukan `ready` → `503 SHEETS_SETUP_REQUIRED` (pesannya menyebut status dan `retry-provision`). Tidak ada ID cabang yang di-hardcode atau dibaca dari env per cabang.
- **Revalidasi sesi.** Token HMAC berlaku 12 jam, tapi tiap request dicek ulang ke registry: karyawan nonaktif atau role yang berubah langsung kehilangan akses (401), tanpa menunggu expiry.
- **Idempotensi (§12).** POST yang menulis baris baru menolak duplikat (`409 DUPLICATE_SUBMIT`), dan POST log checklist/handover bersifat upsert (bukan append kedua).

---

## 1. Auth

### `POST /api/auth/login`
Body: `{ "username": string, "pin": string }`
Response 200: `{ "success": true, "data": { "employeeId": string, "nama": string, "role": "admin"|"karyawan", "branches": [{ "branchId", "nama" }] } }`
Response 400: `error.code = "VALIDATION_ERROR"` (username/PIN kosong atau PIN bukan 4-8 digit)
Response 401: `error.code = "INVALID_CREDENTIALS"`
Response 423: `error.code = "ACCOUNT_LOCKED"` + `error.data.lockedUntil` (ISO 8601)

**Kebijakan lockout:** 5 percobaan gagal berturut-turut → akun terkunci 15 menit. Counter disimpan di `Employees.Failed_Login_Attempts` / `Employees.Locked_Until`, direset saat login sukses atau saat lock berakhir. Setiap kegagalan diberi delay 300 ms, dan username tak dikenal diperlakukan sama (anti-enumerasi).

### `POST /api/auth/logout`
Response 200: `{ "success": true }` cookie dibersihkan (`Max-Age=0`).

### `POST /api/auth/select-branch`
Body: `{ "branchId": string }`
Response 200: `{ "data": { "activeBranchId": string } }` + cookie sesi baru (`iat`/`exp` di-refresh server-side).
Response 400: `error.code = "VALIDATION_ERROR"` kalau cabang bukan milik user.

### `GET /api/auth/session`
Response 200: `{ "data": { "employeeId", "nama", "role", "branches", "activeBranchId" } }`
Response 401: `error.code = "UNAUTHORIZED"` (cookie tidak ada, tidak valid, expired, atau karyawan sudah nonaktif/berubah role).

---

## 2. Employees (Admin only)

### `GET /api/employees?branchId=&status=`
Response 200: `{ "data": EmployeePublic[] }` dengan
`EmployeePublic = { employeeId, username, nama, role, cabangAktif, cabangTerafiliasi: string[], aktif }`.
**`PIN_Hash` tidak pernah dikembalikan ke client.**

### `POST /api/employees`
Body: `{ "name", "username", "pin", "role", "branchId" }`
Response 201: `{ "data": { employeeId, username, name, role, branchId, isActive } }`
Response 400: `error.code = "VALIDATION_ERROR"` (role/PIN/branch tidak valid, username sudah dipakai) detail di `error.data.fields`.

### `PATCH /api/employees/:id`
Body: partial `{ "name"?, "role"?, "branchId"?, "isActive"? }`
- `role` divalidasi terhadap enum (typo ditolak, tidak lagi diam-diam jadi `karyawan`).
- `branchId` wajib cabang yang ada dan aktif; `Cabang_Terafiliasi` **digabung** (tidak menimpa afiliasi lain), `Cabang_Aktif` ikut berubah.

### `POST /api/employees/:id/reset-pin`
Body: `{ "pin": string }` sekaligus mereset `Failed_Login_Attempts`/`Locked_Until`.

---

## 3. Branches (Admin only)

### `GET /api/branches`
Response 200: `{ "data": [{ branchId, nama, spreadsheetId, spreadsheetConfigured, folderConfigured, provisionStatus, aktif }] }`
`spreadsheetId` dikembalikan **ter-mask** (mis. `1AbCdE…6789`) ID Google internal tidak lagi dikirim utuh ke client; spreadsheet cabang tetap bisa dibuka lewat folder cabangnya di Drive.

- `spreadsheetConfigured` `Provision_Status === "ready" && Spreadsheet_ID` terisi
- `folderConfigured` `Folder_Drive_ID` terisi
- `provisionStatus` `pending` | `ready` | `failed`

`provisionStatus` ada supaya UI admin bisa membedakan "cabang belum selesai di-provision" dari
"cabang rusak", tanpa harus menebak dari `spreadsheetConfigured` saja.

### `POST /api/branches`
Body: `{ "name": string }`
Response 201: `{ "data": { branchId, name, spreadsheetId, spreadsheetConfigured, folderConfigured, provisionStatus, aktif } }` (ID spreadsheet juga ter-mask)
Response 503: `error.code = "SHEETS_SETUP_REQUIRED"` kalau `TEMPLATES` di registry belum terisi `Template_Spreadsheet_ID` / `Parent_Folder_ID`.
Response 502: `error.code = "PROVISION_FAILED"` folder atau spreadsheet gagal dibuat. Registry tidak menyisakan baris half-configured; detail error Google hanya masuk log server.

**Provisioning otomatis (row-first):** urutan disengaja supaya ID cabang ter-reserve sebelum panggil
Drive yang lambat:

1. Validasi `name`, turunkan `CBG###` berikutnya, susun nama folder.
2. Tulis baris registry dengan `Provision_Status=pending` (`Spreadsheet_ID`/`Folder_Drive_ID` kosong).
3. Buat folder cabang di `TEMPLATES.Parent_Folder_ID`; `Folder_Drive_ID` langsung ditulis ke baris.
4. `files.copy` template dari `TEMPLATES.Template_Spreadsheet_ID` ke folder itu dilakukan lewat
   Drive bridge Apps Script sebagai pemilik folder (service account tidak punya kuota Drive);
   `Spreadsheet_ID` ditulis ke baris **sebelum** verifikasi, supaya kegagalan berikutnya tidak
   meninggalkan spreadsheet yatim yang tidak dirujuk siapa pun.
5. Verifikasi header 13 sheet terhadap `SHEETS-SCHEMA.md` §2 (`lib/google/template-verify.ts`).
   Menyimpang → `SHEETS_SETUP_REQUIRED`, `Provision_Status` tetap bukan `ready`.
6. Update baris → `Spreadsheet_ID`, `Folder_Drive_ID`, `Provision_Status=ready`.

Kalau langkah 3–4 gagal: baris ditandai `failed` lalu **dihapus**, dan error dilempar jadi tidak
ada cabang yatim di registry. Objek Drive yang terlanjur dibuat mungkin tertinggal; ID-nya
dikembalikan di `error.data.orphans` supaya jadi sampah yang terlihat, bukan diam-diam. Sisa
tersebut bisa dibersihkan manual dari Drive atau otomatis oleh cron terpisah (belum ada di scope ini).

### `PATCH /api/branches/:id`
Body: `{ "name"?, "isActive"? }`
- Hanya `Nama_Cabang` dan `Aktif` yang boleh ditulis. `Spreadsheet_ID`, `Folder_Drive_ID`, dan
  `Provision_Status` dipertahankan utuh dari baris yang dibaca.

### `POST /api/branches/:id/retry-provision` (Admin only)
Body: kosong.
Response 200: `{ "data": { branchId, spreadsheetId, folderConfigured, provisionStatus } }` (ID ter-mask)
Response 409: `VALIDATION_ERROR` kalau `Provision_Status` sudah `ready` provisioning ulang bukan
jalan keluar untuk cabang yang sudah siap, dan menimpa spreadsheet yang isinya sudah terpakai
justru lebih berisiko daripada errornya.
Response 502: `PROVISION_FAILED`.
Response 503: `SHEETS_SETUP_REQUIRED`.

Menjalankan ulang langkah 3–6 di atas untuk cabang yang gagal. Folder cabang yang sudah ada
dipakai lagi (dari `Folder_Drive_ID`), jadi foto checklist lama tidak hilang; `Spreadsheet_ID` yang
sudah terisi juga dipakai ulang kalau spreadsheet-nya masih ada **dan** header-nya masih sesuai
skema retry tidak pernah membuat salinan kedua hanya karena gagal di langkah verifikasi. Salinan
yang sudah tidak sesuai (template berubah, penulisan terputus) diganti salinan baru, dan barisnya
selalu menunjuk ke salinan yang lolos verifikasi. Baris registry cabang ini tidak pernah dihapus
oleh endpoint ini hanya cabang yang masih `pending`/`failed` yang diterima.

> Logika provisioning di endpoint ini ada di `provisionExistingBranch()`
> (`lib/google/branch-provisioning.ts`) dan dipakai juga oleh CLI `pnpm provision:branch -- --id=CBG001`,
> untuk cabang yang provisioning-nya tertinggal dan tidak mau lewat HTTP. Keduanya memanggil
> fungsi yang sama, jadi tidak bisa melenceng.
>
> Cabang yang belum `ready` membuat seluruh endpoint per-cabang membalas
> `503 SHEETS_SETUP_REQUIRED` (lihat §0 "Cabang harus siap pakai") ini perilaku yang dimaksud,
> bukan kegagalan: membaca spreadsheet yang belum ada hanya menghasilkan error yang lebih membingungkan.

---

## 4. Shift Templates (Admin only)

### `GET /api/shifts?branchId=`
### `POST /api/shifts` Body: `{ "branchId", "name", "startTime", "endTime" }` → 201
### `PATCH /api/shifts/:id` Body: `{ "branchId", "name"?, "startTime"?, "endTime"? }`
### `DELETE /api/shifts/:id?branchId=`

---

## 5. Schedules

### `GET /api/schedules?branchId=&startDate=&endDate=`
Response 200: `{ "data": ScheduleEntry[] }`; `karyawan` difilter ke `employeeId` sendiri. Setiap `ScheduleEntry` diperkaya dengan `{ scheduleId, employeeId, shiftId, shiftName, startTime, endTime, date, status, startedAt, conflictWarning }`.

### `GET /api/schedules/:id?branchId=`
Response 200: `{ "data": { scheduleId, employeeId, employeeName, shiftId, shiftName, date, status, startedAt, branchId } }`
Response 403 untuk `karyawan` yang bukan pemilik jadwal. Tanpa `branchId`, admin dicari lintas cabang aktif.

### `POST /api/schedules` (Admin)
Body: `{ "employeeId", "shiftId", "date", "branchId" }`
Response 201: `{ "data": ScheduleEntry }` (field `conflictWarning: true` kalau bentrok terdeteksi **tidak** di-block, sesuai keputusan PRD)
Response 409: `error.code = "DUPLICATE_SUBMIT"` kalau kombinasi karyawan+shift+tanggal sudah ada.

### `PATCH /api/schedules/:id` (Admin) Body partial `{ employeeId?, shiftId?, date? }`
### `DELETE /api/schedules/:id?branchId=` (Admin)

### `POST /api/schedules/:id/start-shift` (Karyawan pemilik jadwal)
Menandai waktu mulai shift (bukan absensi formal). Response 200: `{ "data": { "scheduleId", "startedAt" } }`.
Hanya dari status `scheduled` kalau sudah `started`/`completed` → 400 `VALIDATION_ERROR`.

### Lifecycle status shift
`scheduled` → `started` → `completed`. Shift ditutup oleh `POST /api/schedules/:id/checklist/submit` (lihat §8).

---

## 6. Shift Swap

### `GET /api/swaps?status=&branchId=`
### `GET /api/swaps/eligible-partners?scheduleId=&branchId=`
Response 200: daftar karyawan yang jadwalnya cocok untuk ditukar (filter di backend).
### `POST /api/swaps` (Karyawan) Body `{ "scheduleId", "requestedWithEmployeeId", "reason" }` → 201, status `pending`
Response 409 `DUPLICATE_SUBMIT` kalau sudah ada pengajuan pending untuk jadwal itu.
### `POST /api/swaps/:id/approve` (Admin) menukar `Employee_ID` dua jadwal; kalau tulisan kedua gagal, yang pertama di-rollback.
### `POST /api/swaps/:id/reject` (Admin) Body `{ "reason"? }`

---

## 7. Izin

### `GET /api/izin?status=&branchId=`
### `POST /api/izin` (Karyawan) Body `{ "scheduleId", "categoryId", "note" }` → 201
Validasi: pemilik jadwal, status jadwal masih `scheduled`, kategori ada & aktif, tidak ada pengajuan pending ganda.
### `POST /api/izin/:id/approve` (Admin)
### `POST /api/izin/:id/reject` (Admin) Body `{ "reason"? }`

### `GET /api/izin-categories?branchId=` (semua role)
### `POST /api/izin-categories` (Admin) → 201
### `DELETE /api/izin-categories/:id?branchId=` (Admin) soft delete (`Aktif=FALSE`)

---

## 8. Checklist

### `GET|POST /api/sop-categories?branchId=` (Admin)
Category shape: `{ categoryId, name, order, active }`. POST body `{ name, order? }` → 201; IDs use
`SOP-###`. PATCH `/api/sop-categories/:id` accepts `{ name?, order?, active? }`; DELETE
soft-deactivates a category.

### `GET|POST /api/checklist-points?branchId=` (Admin)
Point shape: `{ pointId, categoryId, description, completionType, unit, min, max, options,
appliesAllShifts, shiftIds, order, active }`. `completionType` ∈ `centang|centang_foto|angka|teks|pilihan`.
POST accepts the shape without `pointId`/`active` → 201. PATCH
`/api/checklist-points/:id` accepts editable fields; DELETE permanently removes points without
logs and soft-deactivates points that already have logs.

### `GET /api/schedules/:scheduleId/checklist`
Response 200: `{ "data": { "groups": [{ categoryId, categoryName, items }], "items": ChecklistPoint[],
completed, total } }`. Only active points applicable to the schedule's `Shift_ID` are returned.
Each item includes `value`, `photoUrl`, and `warning` for numeric values outside configured bounds.

### `POST /api/schedules/:scheduleId/checklist` (Admin or schedule owner)
Body `{ "pointId": string, "value": string, "photoUrl"?: string }`. Values are validated against
the server-side point type/options; photo is required for `centang_foto`. Numeric bounds warn but
do not block. Upsert current value per (`Schedule_ID`, `Point_ID`); edits after report generation
are allowed and written to `Shift_Report_Audit`. The checklist UI autosaves to this endpoint;
each write uses the authenticated employee as `Checked_By` and remains scoped to the authorized
schedule, so progress is available after signing in to the same account on another device.

### `POST /api/schedules/:scheduleId/checklist/photo` (Karyawan pemilik jadwal)
`multipart/form-data`, satu field `file`. Upload foto bukti sebelum dicentang di endpoint di atas.
Query: `?itemId=<Item_ID>` (wajib, item checklist yang difoto bukan field form) dan `branchId` opsional
untuk karyawan multi-cabang, sama seperti endpoint jadwal lain.

> `itemId` sengaja di query param, bukan field form: body tetap "satu field `file>" sesuai bentuk di
> atas, dan validasi item (404 kalau tidak ada / non-aktif) terjadi sebelum body dibaca.

Response 200: `{ "data": { photoUrl: string, fileId: string } }`
Response 400: `VALIDATION_ERROR` (field `file` bukan file / kosong, atau `itemId` tidak diisi).
Response 403: `FORBIDDEN` (bukan pemilik jadwal).
Response 404: `NOT_FOUND` (schedule atau item checklist tidak ada).
Response 413: `FILE_TOO_LARGE`. Response 415: `UNSUPPORTED_FILE_TYPE`. Response 502: `PROVISION_FAILED`.

> Penyimpanan file lewat Drive bridge Apps Script (pemilik folder), karena service account tidak punya
> kuota Drive (`storageQuota.limit = 0`). Ukuran/MIME tetap divalidasi **di backend** sebelum bridge
> dipanggil; file masuk ke `<branchFolder>/Checklist Foto/` dengan nama
> `<Schedule_ID>_<Item_ID>_<timestamp>.<ext>` dan idempotent-by-name (retry tidak menggandakan foto).
> Bridge belum terkonfigurasi → `503 SHEETS_SETUP_REQUIRED`.

Checklist/photo changes are allowed for the schedule owner and Admin even after shift completion
or report generation; changes after report generation must be audited.

Aturan upload (divalidasi backend, bukan hanya `accept` di `<input type=file>`):

- MIME type harus salah satu dari `image/jpeg`, `image/png`, `image/webp`, `image/heic`. Selain itu
  → 415 `UNSUPPORTED_FILE_TYPE`. `image/svg+xml` sengaja ditolak: SVG bisa berisi skrip.
- Ukuran maksimal **5 MB** → 413 `FILE_TOO_LARGE`.
- Disimpan ke `Folder_Drive_ID/Checklist Foto/` (subfolder dibuat otomatis saat upload pertama)
  dengan nama `<Schedule_ID>_<Item_ID>_<timestamp>.<ext>`. File di luar folder cabang →
  502 `PROVISION_FAILED` (folder cabang belum ada).
- Ekstensi `.ext` **diturunkan dari whitelist MIME di atas**, bukan dari nama file kiriman jadi
  `.svg` tidak pernah bisa dibuat meski part-nya diklaim `image/jpeg`. Nama disanitasi dengan aturan
  yang sama seperti folder cabang (`lib/google/provisioning.ts` `driveSafeName`) dan dipotong 60 char.
- `photoUrl` yang dikembalikan adalah URL viewer Drive (`https://drive.google.com/uc?id=<fileId>`),
  yang langsung bisa dikirim ke `POST /api/schedules/:id/checklist` dan disimpan di
  `Checklist_Log.Foto_URL`.

> Batas 5 MB dipilih supaya aman di bawah limit body Vercel (10 MB) tanpa perlu streaming.

### `POST /api/schedules/:scheduleId/checklist/submit` (Admin or schedule owner)
Menutup shift: `started`/`scheduled` → `completed`.
Response 200: `{ "data": { "submitted": true, "status": "completed" } }` (submit ulang idempotent: `alreadyClosed: true`).
Response 400 `error.code = "CHECKLIST_INCOMPLETE"` + `error.data.fields` (item kosong) divalidasi backend.
Response 400 `error.code = "REQUIRED_FIELD_MISSING"` + `error.data.fields` kalau ada field handover wajib yang belum diisi.

### `GET|POST /api/schedules/:scheduleId/report` (Admin or schedule owner)
GET returns report preview/current report with checklist, handover, and edit history. POST generates
the report after backend validation: all applicable checklist points are complete and required
handover fields are filled. It sets `Report_Generated_At` once and creates a permanent
HMAC-signed `Report_Token`; repeated generation is idempotent and keeps the same public link.

### `GET /api/public/reports/:token` (public, no login)
Returns the read-only report for a valid stored token. The token has no expiry; access is scoped to
the schedule embedded in the verified HMAC and the exact token stored on that schedule.

---

## 9. Handover

### `GET /api/handover-templates?branchId=` (Admin)
### `POST /api/handover-templates` (Admin) Body `{ "label", "isRequired": boolean }` → 201
### `PATCH /api/handover-templates/:id` Body `{ label?, isRequired? }`
### `DELETE /api/handover-templates/:id`

### `GET /api/schedules/:scheduleId/handover`
Response 200: `{ "data": { "fields": [{ fieldId, label, isRequired, order, value }], "filledCount", "total", "completed" } }`

### `GET /api/schedules/:scheduleId/handover/previous`
Response 200: handover shift sebelumnya (read-only) atau `null`.

### `POST /api/schedules/:scheduleId/handover` (Admin or schedule owner)
Body: `{ "fields": [{ "fieldId", "value" }] }`
- `isRequired` **selalu** diambil dari `Handover_Template` di server, bukan dari body.
- `fieldId` yang tidak ada di template → 400 `VALIDATION_ERROR` + `error.data.fields`.
- Field wajib kosong → 400 `REQUIRED_FIELD_MISSING` + `error.data.fields`.
- Upsert per (`Schedule_ID`, `Field_ID`): submit ulang menimpa, tidak menambah baris ganda. After
  report generation, changed values are appended to `Shift_Report_Audit`.
Response 200: `{ "data": { "submitted": true, "savedFields": number } }`

---

## 9b. Incident / Catatan Operasional

### `GET /api/incidents?status=&severity=&categoryId=&branchId=` (semua role)
Response 200: `{ "data": Incident[] }` `Incident = { incidentId, categoryId, deskripsi, severity, fotoUrl, status, resolvedBy, resolvedAt, createdBy, createdAt }`.
- Filter opsional: `status=open|resolved`, `severity=low|medium|high`, `categoryId=KIC-###`.

### `POST /api/incidents` (semua role) Body `{ "categoryId", "deskripsi", "severity", "fotoUrl"? }` → 201
Validasi: kategori ada & aktif, `deskripsi` min. 10 karakter, `severity` ∈ `low|medium|high`, `fotoUrl` harus URL valid kalau dikirim.
`createdBy` diisi otomatis dari session, `status` selalu `open`.

### `GET /api/incidents/:id?branchId=` (semua role)
Response 200: `{ "data": Incident }` atau 404.

### `PATCH /api/incidents/:id` (Admin) Body `{ }` (resolve)
Set `status=resolved`, `resolvedBy=session.employeeId`, `resolvedAt=nowIso()`.
Response 400 `VALIDATION_ERROR` kalau sudah `resolved`.

### `GET /api/incident-categories?branchId=` (semua role)
Response 200: `{ "data": IncidentCategory[] }` `IncidentCategory = { id, label, aktif }`.

### `POST /api/incident-categories` (Admin) Body `{ "label" }` → 201
ID format `KIC-###`, `aktif` selalu `true`.

### `DELETE /api/incident-categories/:id?branchId=` (Admin) soft delete (`Aktif=FALSE`)

---

## 10. Dashboard & Laporan

### `GET /api/dashboard?branchId=` (Admin)
Response 200: `{ "data": DashboardBranch[] }` dengan
`DashboardBranch = { branchId, branchName, shiftsToday, shiftsStarted, shiftsCompleted, checklistPercent, handoverCount, pendingSwaps, pendingIzins }`.
- `checklistPercent` = item tercentang / (jumlah shift hari ini × item checklist aktif), bukan "shift yang punya ≥1 centang".
- "Hari ini" memakai kalender WIB (Asia/Jakarta), bukan UTC.
- Cabang yang spreadsheetnya bermasalah di-skip (dicatat di log server) supaya tidak mematikan seluruh dashboard.
- Cabang yang belum `ready` (atau nonaktif) juga di-skip oleh `usableBranches()`, dengan alasan tertulis di log server.

### `GET /api/laporan?branchId=&startDate=&endDate=&reportType=&format=json|csv` (Admin, Karyawan)
### `POST /api/laporan?branchId=&startDate=&endDate=&reportType=` Body `{ "format": "json"|"csv" }`
Response 200 `format=json` (default): `{ "data": LaporanRow[] }` dengan
`LaporanRow = { type, id, date, branchName, employeeId, employeeName, details, status }` (rekap jadwal, swap,
izin, progres checklist, handover, dan incident). `reportType` opsional: `semua` (default),
`jadwal`, `checklist`, `handover`, `pengajuan` (swap dan izin), atau `incident`; nilai lain ditolak
dengan `VALIDATION_ERROR`. Detail checklist berisi shift, progres per SOP, dan nama point yang belum
selesai. Admin dapat meminta semua cabang atau satu cabang;
Karyawan selalu dibatasi ke cabang aktif dan dapat melihat ringkasan operasional seluruh karyawan
di cabang tersebut. Meminta cabang lain sebagai Karyawan → `403 FORBIDDEN`.
Detail Swap memuat nama rekan, tanggal dan nama/jam shift yang diminta, serta alasan. `branchName`
menyebut cabang sumber aktivitas. Response 200 `format=csv`: file CSV (`text/csv`, CRLF, kutip sesuai
RFC 4180, nilai yang diawali `= + - @` dinetralisasi, `employeeName` terisi).
Response 400 `error.code = "VALIDATION_ERROR"` untuk format lain (mis. `xlsx` belum tersedia lebih baik gagal jelas daripada mengirim JSON dengan ekstensi `.csv`).

---

## 11. Error Codes Standar

| Code | HTTP | Arti |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Username/PIN salah |
| `ACCOUNT_LOCKED` | 423 | Terkunci karena gagal login berkali-kali (+ `error.data.lockedUntil`) |
| `UNAUTHORIZED` | 401 | Sesi tidak valid/expired/nonaktif |
| `FORBIDDEN` | 403 | Role tidak punya akses ke resource ini |
| `NOT_FOUND` | 404 | Resource tidak ditemukan |
| `VALIDATION_ERROR` | 400 | Body/parameter tidak valid (+ `error.data.fields`) |
| `DUPLICATE_SUBMIT` | 409 | Pengajuan/jadwal identik sudah ada |
| `CHECKLIST_INCOMPLETE` | 400 | Submit checklist ditolak, ada item belum selesai (+ `error.data.fields`) |
| `REQUIRED_FIELD_MISSING` | 400 | Handover submit ditolak, field wajib kosong (+ `error.data.fields`) |
| `SHEETS_SETUP_REQUIRED` | 503 | `TEMPLATES` belum terisi, template bukan Google Sheet, header hasil copy menyimpang dari skema, atau cabang yang dipanggil belum `ready` |
| `PROVISION_FAILED` | 502 | Gagal membuat folder/spreadsheet/foto cabang (+ `error.data.orphans` kalau ada objek Drive yang tertinggal) |
| `FILE_TOO_LARGE` | 413 | Unggahan foto melebihi 5 MB |
| `UNSUPPORTED_FILE_TYPE` | 415 | MIME file foto tidak dalam allowlist gambar |
| `INTERNAL_ERROR` | 500 | Kesalahan tak terduga pesan internal (Google API) hanya masuk log server |
| `SCHEDULE_CONFLICT_WARNING` | | Bukan error flag informational di response sukses |

> `INVALID_REQUEST`, `INVALID_SESSION`, `PHOTO_REQUIRED`, `MISSING_BRANCH_ID`, `INVALID_BRANCH` (dipakai di kode sebelum audit) sudah dihapus dan dipetakan ke `VALIDATION_ERROR` / `UNAUTHORIZED` / `FORBIDDEN`.

---

## 12. Catatan Implementasi

- Semua endpoint yang menulis ke Sheets (POST/PATCH/DELETE) harus idempotent-safe secara wajar hindari double-submit dari double-tap di UI. Backend menahan duplikat (`DUPLICATE_SUBMIT`, upsert log, `alreadyChecked`/`alreadyClosed`).
- Validasi checklist & handover **wajib** di backend (lihat §8, §9) jangan andalkan disabled state di frontend saja, karena request API tetap bisa dipanggil langsung.
- Penulisan baris memakai pencarian ulang berdasarkan ID saat menulis (bukan nomor baris hasil pembacaan lama), supaya baris tidak tertimpa saat ada perubahan bersamaan.
- Tidak ada endpoint attendance/clock-in-out formal hanya `start-shift` yang sekadar timestamp (lihat §5), sesuai batasan scope di PRD.
