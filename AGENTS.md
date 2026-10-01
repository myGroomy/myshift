# AGENTS.md MYSHIFT

Instruksi untuk coding agent yang mengerjakan build MYSHIFT. **Baca seluruh dokumen di `PLAN/` sebelum menulis kode apapun.**

> Catatan path: dokumen di dalam `PLAN/` kadang menulis `PLANS/` direktori sebenarnya bernama `PLAN/`.

## 1. Dokumen Referensi Wajib

Baca dalam urutan ini sebelum mulai:

1. `PLAN/FULL-PRD.md` scope produk, business rules, apa yang di luar scope
2. `PLAN/MVP-plan.md` urutan fase 0–4. Kerjakan sesuai urutan, jangan loncat fase
3. `PLAN/UI-PLAN.md` struktur & fungsi tiap halaman (21 layar)
4. `PLAN/atlassian-DESIGN.md` token warna, tipografi, spacing, radius, motion. **Semua styling wajib adaptasi dari file ini**, jangan hardcode warna/font sendiri
5. `PLAN/API-CONTRACT.md` path, method, shape request/response, error code. Ikuti persis
6. `PLAN/SHEETS-SCHEMA.md` struktur sheet, kolom, format ID. **Jangan menyimpang** tanpa update dokumen dulu

Kalau instruksi bertentangan dengan dokumen di atas, **dokumen `PLAN/` yang menang** file ini hanya kerangka eksekusi, bukan sumber kebenaran scope/desain.

**Referensi layout:** `PLAN/kerangka-ui/extracted/` berisi 21 prototype HTML hasil ekstrak Stitch (`N._nama-halaman/code.html`), penamaan folder 1:1 dengan path di `UI-PLAN.md`. Prototipe berguna untuk struktur konten/alur, tapi **jangan salin hex warna atau font dari sana** kodenya memakai palet campuran yang tidak ada di token file (biru `#0075de`, default shadcn/zinc, abu hangat `#f6f5f4`), `tailwind.config` inline-nya juga beda radius/font dari token. Sumber styling tetap `atlassian-DESIGN.md`.

## 2. Konteks Proyek

MYSHIFT = manajemen shift standalone untuk Mochikin (F&B UMKM multi-cabang), bagian ekosistem MOCHIKIN-APPS (MYLAUNCHER, STOKIS, MYCUSTOMER). **Fase ini standalone SSO ke MYLAUNCHER sengaja di-skip**, jangan implementasikan SSO kecuali diminta eksplisit.

Batasan tegas (jangan diimplementasikan kecuali diminta lain):
- Bukan absensi clock-in/out formal (sudah ada di POS) hanya tombol "mulai shift" berupa timestamp sederhana
- Bukan sistem payroll/gaji
- Bukan sistem SSO/identity terpusat

## 3. Status Repo Saat Ini

Repo **belum berisi kode** hanya folder `PLAN/` (dokumen + prototype). Belum ada `package.json`, lint, test, CI, atau git. Karena itu:

- Jangan mengarang perintah build/dev/test yang tidak ada; setelah Fase 0, pakai scripts yang benar-benar ada di `package.json`
- Semua keputusan arsitektur di bawah ini berlaku sejak commit pertama

## 4. Tech Stack (Wajib)

```
Frontend  : Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
Backend   : Next.js API Routes
Database  : Google Sheets API v4 BUKAN Postgres, BUKAN Google Apps Script
Auth      : PIN + scrypt hash (node:crypto), session cookie HMAC-signed, httpOnly
Hosting   : Vercel
```

Jangan ganti stack tanpa konfirmasi eksplisit dari user meskipun ada alternatif yang "lebih baik" secara teknis. Keputusan ini demi konsistensi dengan aplikasi sibling.

**Pengecualian terkonfirmasi (user, 2026-09-29): Drive bridge Apps Script bukan GAS sebagai database.**
`gas/Code.js` adalah Web App tipis yang hanya mengeksekusi 3 operasi **pembuatan file Drive** yang
butuh kuota pemilik akun: konversi `.xlsx` template jadi Google Sheet, `files.copy` template ke folder
cabang, dan upload foto checklist. Alasan: service account aplikasi punya `storageQuota.limit = 0`,
sehingga Drive menolak semua file yang dibuatnya (`PLAN/Db refactor-plan.md` Step 0b) sedangkan baca
dan tulis *isi* spreadsheet tetap lewat Google Sheets API v4 seperti biasa. Aturan yang harus
dipertahankan: script **tetap bodoh** (tidak tahu skema/bisnis semua aturan hidup di aplikasi dan
punya test), dijaga shared secret dari Script Properties, hanya boleh menulis ke dalam folder MYSHIFT,
idempotent-by-name, dan disetujui eksplisit oleh user. Melanggar salah satunya = kembali ke larangan
"GAS bukan bagian stack".

## 5. Standar Kode (Wajib pelajaran audit aplikasi sibling)

Aplikasi lain di ekosistem sudah diaudit, ditemukan pola masalah berulang. **Jangan ulangi di MYSHIFT:**

- ❌ **Jangan** pakai in-memory module-level cache (`let cache = {}` di top-level file) tidak aman untuk multi-instance Vercel. Kalau butuh cache, diskusikan dulu.
- ❌ **Jangan** biarkan debug/test endpoint aktif tanpa guard `process.env.NODE_ENV !== 'production'`
- ❌ **Jangan** tinggalkan file backup (`.bak`, `.old`, dsb) di repo hapus, andalkan git history
- ❌ **Jangan** simpan PIN plaintext di Sheets wajib scrypt hash, tidak terkecuali
- ✅ **Wajib** security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) di `next.config.ts` sejak commit pertama baseline: `securityHeaders` di `stokis/next.config.ts`
- ✅ **Wajib** dedicated validation layer per domain (folder `lib/domain/`), bukan validasi inline di handler referensi gaya: `stokis/lib/domain/so-validation.ts` (test: `stokis/test/so-validation.test.js`)
- ✅ **Wajib** validasi business rule kritis (checklist 100%, field handover wajib) di **backend**, bukan cuma disabled state di frontend
- ✅ Format ID prefix bermakna sesuai `SHEETS-SCHEMA.md` (`EMP-###`, `CBG###`, `SCH-YYYYMMDD-###`) jangan UUID polos

Referensi pola lain yang terverifikasi:
- Implementasi scrypt PIN: `mylauncher/src/lib/server/data.ts` (`scryptSync` + salt + `timingSafeEqual`) **bukan** pola STOKIS/MYCUSTOMER (lihat `FULL-PRD.md` bagian auth)
- Middleware auth route (`withAuth`) + response shape: `stokis/lib/auth.ts` dan `stokis/CLAUDE.md`

## 6. Prinsip Kerja Agent

1. **Ikuti urutan fase `MVP-plan.md`.** Jangan bangun fitur Fase 3 sebelum Fase 0–1 selesai dan jalan. Selesai Fase 0 = bisa login; selesai Fase 1 = admin bisa bikin jadwal.
2. **Setiap halaman baru:** cek spesifikasi di `UI-PLAN.md`, styling dari `atlassian-DESIGN.md` jangan menebak layout/warna sendiri.
3. **Setiap endpoint baru:** ikuti persis `API-CONTRACT.md` (path, response `{ success, data? }` / `{ success, error: { code, message } }`, error code). Endpoint yang belum ada di kontrak → tulis dulu ke kontraknya, baru implementasi.
4. **Setiap perubahan struktur data:** update `SHEETS-SCHEMA.md` di commit yang sama jangan biarkan dokumen dan kode berbeda.
5. Requirement ambigu atau tidak tercakup dokumen → **tanyakan**, jangan asumsi terutama business rule (approval, bentrok jadwal).
6. Tiap fase selesai: sanity check manual sesuai alur fase itu sebelum lanjut.

## 7. Struktur Folder yang Disarankan

```
myshift/
├── app/
│   ├── api/              # sesuai path di API-CONTRACT.md
│   ├── (auth)/login/
│   ├── (karyawan)/       # jadwal-saya, shift/[id], swap, izin, riwayat
│   └── (admin)/          # dashboard, jadwal, karyawan, cabang, dll
├── lib/
│   ├── domain/           # business logic + validasi per modul (schedule, swap, izin, checklist, handover)
│   ├── google/           # Sheets client, registry lookup
│   ├── auth.ts           # scrypt hash, session, guard
│   └── ids.ts            # ID generator sesuai format SHEETS-SCHEMA.md
├── components/            # UI components, styling dari atlassian-DESIGN.md
└── PLAN/                  # semua dokumen di §1
```

## 8. Checklist Sebelum Deploy (Tiap Fase)

- [ ] Tidak ada endpoint debug aktif di production
- [ ] Tidak ada file `.bak`/`.old` tersisa
- [ ] Security headers terpasang & terverifikasi
- [ ] PIN di-hash scrypt, tidak ada plaintext di kode atau log
- [ ] Validasi backend untuk semua business rule kritis (checklist, handover, bentrok jadwal)
- [ ] `SHEETS-SCHEMA.md` dan `API-CONTRACT.md` sinkron dengan implementasi aktual

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
