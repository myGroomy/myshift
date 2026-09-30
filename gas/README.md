# MYSHIFT Drive Bridge (Apps Script)

Bridge tipis antara aplikasi Next.js dan Google Drive, dipakai **hanya** untuk tiga operasi yang
butuh identitas berkuota penyimpanan (`Execute as: Me`):

| Action | Dipakai oleh | Fungsi |
|---|---|---|
| `importFile` | `pnpm template:import` | konversi `.xlsx` template jadi Google Sheet native |
| `copyFile` | `POST /api/branches`, `retry-provision` | copy template ke folder cabang |
| `uploadFile` | `POST /api/schedules/:id/checklist/photo` | simpan foto bukti checklist |

Kenapa perlu: service account aplikasi punya `storageQuota.limit = 0`, jadi Drive menolak
**pembuatan file** olehnya (`Service Accounts do not have storage quota` lihat
`PLAN/Db refactor-plan.md` Step 0b). Membaca/menulis *isi* spreadsheet yang sudah di-share tetap
jalan, jadi Sheets, verifikasi header, dan seluruh business rule tetap di aplikasi.

Aturan desain (jangan dilanggar):

- Script ini **bodoh**: penamaan, validasi, verifikasi header, dan idempotensi di Registry tetap di
  aplikasi (yang punya test). Jangan pindahkan pengetahuan skema ke sini.
- **Idempotent by name**: kalau folder tujuan sudah berisi file dengan nama yang diminta, file itu
  yang dikembalikan bukan bikin file kedua. Ini yang membuat retry setelah timeout aman.
- Blast radius dibatasi Script Property: hanya folder MYSHIFT (dan turunannya) yang boleh jadi tujuan.
- Endpoint ini publik (`Anyone`), jadi `MYSHIFT_BRIDGE_SECRET` adalah satu-satunya kredensial —
  simpan di Script Properties, **jangan** di kode.

## Deploy (sekali, manual)

> **Status (2026-09-29): bridge pindah ke project BARU.**
> - Project lama `1KbVNbwFKO9eMTLAnQBL_8Uu5dugF7bZYh-40ISWURx9QffS4S7saGhl8` **tidak bisa dipakai lagi**.
>   Sempat berhasil (versi 2: bridge otentik, `copyFile` jalan, `TEMPLATE_NOT_A_SHEET` terverifikasi),
>   lalu rusak total setelah `oauthScopes` dideklarasikan eksplisit: Apps Script membatalkan otorisasi
>   proyek dan **semua** deployment membalas HTTP 401 termasuk yang dibuat ulang, dan termasuk
>   setelah manifest dikembalikan ke versi yang semula jalan. Re-auth (`authCheck`) dan revert manifest
>   tidak memulihkannya. Pelajaran: jangan pernah mengetik `oauthScopes` di manifest project ini.
> - Project **baru** `1hUkZgY1A9wnVdXZoWnBwkWqOHjrXm9TmV3N73RGSBsDuK_q9SFDKaM2O` → **sedang dipakai**,
>   deployment `Execute as: Me` + `Who has access: Anyone`, kode identik dengan `gas/Code.js` (dicek
>   lewat `clasp pull` + diff). URL-nya sudah terisi di `.env.local`, dan `gas/.clasp.json` sudah
>   mengarah ke project ini jadi `clasp push` berikutnya aman.
> - Cara membuat project bridge dari nol: [`SETUP-NEW-PROJECT.md`](SETUP-NEW-PROJECT.md).
> - Skrip operasional: `pnpm probe:bridge` (diagnosa endpoint), `pnpm check:bridge` (copy + upload +
>   idempotensi, self-cleaning), `pnpm check:provisioning` (acceptance provisioning end-to-end,
>   self-cleaning). Ketiganya aman dijalankan berulang.
> - Catatan cleanup: service account **tidak bisa menghapus** file milik user, jadi artefak uji
>   dibersihkan dengan membuang folder induknya (isi ikut ke trash).

1. **Push kode** (dari folder `gas/`):
   ```bash
   cd gas
   clasp push -f          # clasp 3.4: push biasa sering menulis "Skipping push", perlu -f
   clasp status           # pastikan appsscript.json + Code.js yang terpush
   ```
   `gas/.clasp.json` menunjuk Script ID project ini, jadi tidak perlu `--project`.
2. **Script Properties** (Project Settings → Script Properties, ada di kode runtime bukan di repo):
   - `MYSHIFT_BRIDGE_SECRET` nilainya **harus persis sama** dengan `GAS_BRIDGE_SECRET` di
     `.env.local` (salin dari sana, jangan generate terpisah; kalau beda, bridge membalas
     `{"ok":false,"error":"UNAUTHORIZED"}`)
   - `MYSHIFT_PARENT_FOLDER_ID` folder `MYSHIFT` di Drive (`1M-QLrh_0YFVVDxVx8Zoljbw2ntVpLGXD`)
3. **Rilis versi baru** (kalau kode berubah setelah versi terakhir):
   ```bash
   clasp create-version 'deskripsi'                       # → "Created version N"
   clasp update-deployment <deploymentId> -V N            # URL /exec tidak berubah
   ```
   Ini wajib setiap kali `clasp push` dijalankan, karena deployment di poin pertama sudah dipin ke
   versi (bukan HEAD). Lewati hanya kalau Anda memang tidak memakai deployment versi itu.
4. Uji: `pnpm check:bridge` bikin folder + copy + upload percobaan, lalu hapus semuanya. Harus
   `BRIDGE PASSED`. Kalau tidak, `pnpm exec tsx scripts/probe-bridge.ts`-print halaman yang
   sebenarnya dikembalikan Google.

## Kalau bridge membalas HTTP 401 (bukan JSON)

Artinya Apps Script membatalkan otorisasi proyek. Pemicunya hampir selalu **perubahan
`oauthScopes`** di `appsscript.json`: otorisasi menempel ke *proyek*, bukan ke versi, jadi revert
manifest **tidak** mengembalikannya dan pada project lama MYSHIFT hal ini terbukti tidak bisa
dipulihkan (lihat status di atas; solusinya project baru).

**Pencegahan:** jangan menulis `oauthScopes` di manifest. Biarkan Apps Script mendeteksi sendiri
scope dari kode (DriveApp → drive, UrlFetchApp → external request). Kalau suatu saat scope memang
wajib dideklarasikan, siapkan dari awal di project baru jangan di project yang sudah jalan.

Kalau project-nya masih bisa diselamatkan, pemulihan biasa: jalankan fungsi `authCheck` dari editor
→ allow di layar persetujuan → `pnpm probe:bridge`.

## Kalau `importFile` gagal

Dua jalan buntu yang sudah dicoba (jangan diulang):

- `blob.setContentType("application/vnd.google-apps.spreadsheet")` + `folder.createFile(blob)` →
  `Invalid argument: file.contentType`. DriveApp memang tidak bisa mengonversi file biner Office.
- `advancedServices` di `appsscript.json` → API menolak: `unknown fields: [advancedServices]`.
  Field itu hanya bisa disetel lewat IDE, bukan lewat `clasp push`.

Jalan yang dipakai sekarang: `UrlFetchApp` → Drive API v3 `files/{id}/copy` dengan `mimeType`
target. Scope-nya (**drive** + **script.external_request**) diambil Apps Script secara otomatis dari
kode `DriveApp` dan `UrlFetchApp` jadi **jangan** dideklarasikan di `oauthScopes` (lihat 401 di
atas).

Kalau `importFile` tetap gagal dengan `IMPORT_FAILED` (scope kurang, atau Drive menolak konversi),
**plan B** tanpa kode: buka `MYSHIFT-Template-Cabang.xlsx` di Drive → "Open with Google Sheets",
rename hasilnya jadi `MYSHIFT-Template-Cabang`, lalu tunjuk `TEMPLATES.Template_Spreadsheet_ID` ke
file itu. `copyFile` dan `uploadFile` tidak bergantung pada plan ini.

## Update kode

Edit di editor, lalu **Deploy → Manage deployments → Edit (ikon pensil) → Version: New version →
Deploy**. Jangan pakai deployment `HEAD` (` /dev`): URL `/exec` harus selalu menunjuk versi yang
diketahui, supaya produksi tidak berubah diam-diam.

## Kontrak request/response

Request (POST, `Content-Type: application/json`):

```json
{ "secret": "...", "action": "copyFile", "templateSpreadsheetId": "...", "folderId": "...", "name": "MYSHIFT CBG002" }
{ "secret": "...", "action": "importFile", "sourceFileId": "...", "parentFolderId": "...", "name": "MYSHIFT-Template-Cabang" }
{ "secret": "...", "action": "uploadFile", "folderId": "...", "name": "...jpg", "mimeType": "image/jpeg", "dataBase64": "..." }
```

Response sukses: `{ "ok": true, "fileId": "<id>", "reused": <boolean> }`
Response gagal: `{ "ok": false, "error": "<CODE>", "message"?: "..." }` dengan CODE salah satu dari
`BAD_CONTENT_TYPE`, `PAYLOAD_TOO_LARGE`, `UNAUTHORIZED`, `UNKNOWN_ACTION`, `MISSING_FILE_DATA`,
`SOURCE_EMPTY`, `TEMPLATE_NOT_A_SHEET`, `BRIDGE_ERROR`.

Batasan yang perlu diketahui: `UrlFetchApp` sisi script lain, tapi call *ke* script ini dari kita
kena kuota Apps Script pemiliknya 6 menit/eksekusi (hard limit) dan eksekusi bersamaan terbatas
(±30 untuk akun Gmail consumer). Cold start biasanya 1–3 detik. Payload foto dikirim base64
(±1,34× ukuran file), jadi cap 5 MB aplikasi ≈ 6,8 MB body.
