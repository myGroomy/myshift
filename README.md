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
MYSHIFT_SHARED_DRIVE_ID=<shared-drive-id>
MYSHIFT_FOLDER=<shared-drive-folder-id>
```

### 2. Google Sheets Setup

```bash
pnpm run setup:sheets
MYSHIFT_SEED_PIN=123456 npx tsx scripts/seed-dummy-data.ts
```

`setup:sheets` menyiapkan Registry Spreadsheet. Seed command membuat spreadsheet cabang baru di folder Shared Drive yang dikonfigurasi dan mengisi data dummy (PIN dummy diambil dari `MYSHIFT_SEED_PIN`, tidak pernah ditulis di kode). Service account harus menjadi anggota Shared Drive dengan izin Content Manager.

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
