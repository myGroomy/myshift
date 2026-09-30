# MYSHIFT

Aplikasi manajemen shift & operasional harian untuk Mochikin (F&B UMKM multi-cabang). Bagian dari ekosistem MOCHIKIN-APPS.

## Fitur

- Penjadwalan shift mingguan multi-cabang dengan deteksi bentrok
- Tukar shift (swap) dengan alur approval
- Pengajuan izin dengan kategori kustom
- Checklist opening/closing dengan validasi foto wajib
- Handover antar shift dengan template field
- Dashboard & laporan rekap

## Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** Google Sheets API v4
- **Auth:** PIN + scrypt hash, session cookie HMAC-signed

## Setup

### 1. Environment Variables

Buat `.env.local` dari `.env.example`:

```env
MYSHIFT_API_KEY=<random-string-min-32-chars>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account-email>
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=<service-account-private-key>
REGISTRY_SPREADSHEET_ID=<registry-spreadsheet-id>
GAS_DRIVE_BRIDGE_URL=https://script.google.com/macros/s/<deployment-id>/exec
GAS_BRIDGE_SECRET=<sama dengan Script Property MYSHIFT_BRIDGE_SECRET>
```

Template cabang **tidak** lagi lewat env: `TEMPLATES.Template_Spreadsheet_ID` +
`TEMPLATES.Parent_Folder_ID` di Registry spreadsheet adalah satu-satunya sumbernya
(`PLAN/SHEETS-SCHEMA.md` §1).

### 2. Google Sheets Setup

```bash
pnpm run setup:sheets          # Registry: Daftar_Cabang, Employees, Settings_Global, TEMPLATES
# deploy Drive bridge dulu (gas/README.md) lalu isi GAS_DRIVE_BRIDGE_URL + GAS_BRIDGE_SECRET
pnpm run template:branch       # generate PLAN/templates/MYSHIFT-Template-Cabang.xlsx
pnpm run template:import -- --parent=<folderId>   # .xlsx -> Google Sheet native (via bridge)
pnpm run verify:template       # cek header 11 sheet sesuai SHEETS-SCHEMA.md §2
pnpm run check:bridge          # uji end-to-end copy + upload lewat bridge (bersihkan sendiri)
pnpm run check:provisioning    # acceptance provisioning end-to-end (bersihkan sendiri)
pnpm run spike:drive           # cek jalur service account: folder OK, file ditolak (kuota)
pnpm run provision:branch -- --list          # status provisioning tiap cabang
pnpm run provision:branch -- --id=CBG001     # provision/retry cabang tanpa lewat HTTP
MYSHIFT_SEED_PIN=123456 npx tsx scripts/seed-dummy-data.ts
```

`setup:sheets` menyiapkan Registry Spreadsheet. `template:import` meng-import template dan menulis
header 11 sheet dari `lib/google/sheet-schema.ts`; ID hasil import ditulis ke
`TEMPLATES.Template_Spreadsheet_ID`, folder induk ke `TEMPLATES.Parent_Folder_ID`. Cabang baru dibuat
aplikasi (`POST /api/branches`, atau tombol Retry di `/cabang` untuk cabang yang provisioning-nya
gagal).

> **Drive bridge (wajib):** service account punya `storageQuota.limit = 0`, jadi Drive menolak semua
> file yang dibuatnya — copy template, konversi template, dan upload foto berjalan lewat Web App
> Apps Script `gas/Code.js` sebagai pemilik folder. `GAS_DRIVE_BRIDGE_URL` + `GAS_BRIDGE_SECRET`
> wajib diisi (lihat `gas/README.md`); tanpa keduanya endpoint provisioning berhenti dengan
> `SHEETS_SETUP_REQUIRED` sebelum menyentuh Drive. Rincian temuan: `PLAN/Db refactor-plan.md` Step 0b.

### 3. Jalankan

```bash
pnpm run dev
```

Buka http://localhost:3000

## Development

```bash
pnpm lint        # oxlint
pnpm typecheck   # tsc --noEmit
pnpm test        # node --test (lib/domain, skema sheet, error contract)
```

## Catatan Keamanan

- PIN di-hash scrypt (N=16384) dan **tidak pernah** dikembalikan API (baik plaintext maupun hash).
- Login terkunci 15 menit setelah 5 percobaan gagal (`Employees.Failed_Login_Attempts` / `Locked_Until`), dengan delay tetap pada setiap kegagalan.
- Sesi = cookie HMAC `httpOnly` + `SameSite=Lax` + `Secure` (production), berlaku 12 jam, dan role/status karyawan dicek ulang ke registry pada setiap request.

## Production

```bash
pnpm run build
pnpm start
```
