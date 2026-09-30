# MYSHIFT — MVP Implementation Plan

> Turunan dari `FULL-PRD.md`. Fokus: jalan cepat, standalone, minim fitur tapi lengkap alurnya end-to-end.

---

## Prinsip MVP

1. **Standalone penuh** — tanpa SSO MYLAUNCHER
2. **Google Sheets sebagai DB** — Registry + 1 spreadsheet per cabang (pola STOKIS)
3. **Semua fitur inti masuk, tapi versi paling simpel** — bukan skip fitur, tapi skip kompleksitas (contoh: checklist boleh tanpa foto dulu, laporan boleh tanpa export dulu)
4. Keamanan dasar (PIN hash + security headers) **tidak boleh di-skip** meski MVP — ini murah untuk dipasang sejak awal dan mahal untuk ditambal belakangan

---

## Fase 0 — Setup Fondasi (sebelum fitur apapun)

- [ ] Setup repo Next.js + TypeScript + Tailwind + shadcn/ui
- [ ] Setup `next.config.ts` dengan security headers penuh (copy dari STOKIS sebagai baseline)
- [ ] Setup Google Sheets API client (service account, scope terbatas)
- [ ] Buat Registry Spreadsheet: `Daftar_Cabang`, `Employees`, `Settings_Global`
- [ ] Buat 1 spreadsheet template per-cabang (siap di-duplikasi tiap ada cabang baru)
- [ ] Auth dasar: login PIN + scrypt hash + session cookie HMAC-signed
- [ ] Middleware auth guard untuk semua API route

**Selesai Fase 0 = bisa login, belum ada fitur bisnis.**

---

## Fase 1 — Master Data & Penjadwalan (Core MVP)

- [ ] CRUD Cabang (admin)
- [ ] CRUD Shift template per cabang (Opening/Middle/Closing, jam mulai-selesai)
- [ ] CRUD Karyawan (admin) — termasuk assign cabang aktif
- [ ] Buat jadwal mingguan (admin): assign karyawan → shift → tanggal
- [ ] Deteksi bentrok jadwal → tampilkan warning (tidak block)
- [ ] Tampilan "jadwal saya" untuk karyawan (hanya cabang sendiri)
- [ ] Tampilan jadwal mingguan per cabang untuk admin

**Selesai Fase 1 = admin bisa bikin jadwal, karyawan bisa lihat jadwalnya. Ini yang paling penting untuk dipakai duluan di cabang.**

---

## Fase 2 — Swap, Izin, Mulai Shift

- [ ] Karyawan ajukan swap shift (pilih partner yang jadwalnya cocok, isi alasan)
- [ ] Admin approve/reject swap
- [ ] Karyawan ajukan izin (pilih kategori, isi keterangan)
- [ ] Admin approve/reject izin
- [ ] Kategori izin bisa dikonfigurasi admin (minimal: tabel sederhana yang bisa diedit lewat UI atau langsung di spreadsheet)
- [ ] Tombol "mulai shift" sederhana (timestamp saja, tanpa verifikasi apapun)

---

## Fase 3 — Checklist & Handover

- [ ] Admin atur kategori SOP dan Checklist Point per cabang serta cakupan shift
- [ ] Karyawan isi checklist sesuai tipe point (centang, foto, angka, teks, pilihan)
- [ ] Validasi backend: laporan shift tidak bisa digenerate sebelum checklist applicable dan handover wajib lengkap
- [ ] Admin atur template handover (field wajib vs opsional)
- [ ] Karyawan isi handover di akhir shift (wajib)
- [ ] Karyawan shift berikutnya bisa lihat handover shift sebelumnya saat mulai shift
- [ ] Admin/pemilik jadwal dapat mengoreksi checklist dan handover pasca-laporan dengan audit trail
- [ ] Laporan per-shift dapat dibagikan melalui WhatsApp dan dibuka publik via token HMAC permanen

**Selesai Fase 3 = alur operasional end-to-end, termasuk koreksi ter-audit dan laporan shift publik.**

---

## Fase 4 — Dashboard & Laporan

- [ ] Dashboard admin: ringkasan hari ini per cabang (siapa shift, status checklist, status handover)
- [ ] Laporan rekap periode: jadwal, swap, izin
- [ ] Export CSV/XLSX

---

## Urutan Prioritas Ringkas

```
Fase 0 (fondasi + auth)
   ↓
Fase 1 (jadwal — INI YANG PALING BERHARGA UNTUK DIPAKAI DULUAN)
   ↓
Fase 2 (swap, izin, mulai shift)
   ↓
Fase 3 (checklist, handover — melengkapi alur operasional harian)
   ↓
Fase 4 (dashboard & laporan)
```

Kalau butuh dipakai secepatnya di cabang, **Fase 0 + Fase 1 saja sudah bisa dipakai** untuk menggantikan jadwal manual (Excel/WA) — fase-fase berikutnya menyusul secara inkremental tanpa mengganggu yang sudah jalan.

---

## Eksplisit di Luar MVP (ditunda ke fase produksi lanjutan / `FULL-PRD.md`)

- Integrasi SSO MYLAUNCHER
- Payroll
- Absensi formal (tetap di sistem POS terpisah)
- Notifikasi WhatsApp/push
- Export laporan lanjutan / analitik mendalam
