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
GOOGLE_PRIVATE_KEY=<service-account-private-key>
REGISTRY_SPREADSHEET_ID=<registry-spreadsheet-id>
```

### 2. Google Sheets Setup

```bash
pnpm run setup:sheets
```

Script ini membuat Registry Spreadsheet dan spreadsheet per cabang dengan sheet yang dibutuhkan.

### 3. Jalankan

```bash
pnpm run dev
```

Buka http://localhost:3000

## Production

```bash
pnpm run build
pnpm start
```
