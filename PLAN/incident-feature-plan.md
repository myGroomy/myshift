# Plan Implementasi: Incident / Catatan Operasional

> **Tanggal:** 2026-09-29
> **Status:** Phase 1-4 Selesai tinggal Phase 5 (Testing & Integration)
> **PRD Ref:** FULL-PRD.md §6.10

---

## Ringkasan

Fitur untuk mencatat kejadian abnormal selama operasi yang tidak cocok masuk checklist atau handover. Kategori admin-configurable, severity wajib, status tracking (open/resolved).

---

## Langkah Implementasi

### Phase 1: Data Layer (Schema & Template)

| # | Task | File | Status |
|---|---|---|---|
| 1.1 | Tambah `Kategori_Incident` + `Incidents` ke `BRANCH_HEADERS` | `lib/google/sheet-schema.ts` | ✅ |
| 1.2 | Update `scripts/build-branch-template.ts` buat sheet baru + seed kategori default | `scripts/build-branch-template.ts` | ✅ |
| 1.3 | Update `scripts/import-branch-template.ts` import sheet baru | `scripts/import-branch-template.ts` | ✅ (otomatis via `BRANCH_SHEET_NAMES`) |
| 1.4 | Update `scripts/verify-template.ts` verifikasi sheet baru ada | `scripts/verify-template.ts` | ✅ (otomatis via `BRANCH_SHEET_NAMES`) |
| 1.5 | Update `PLAN/SHEETS-SCHEMA.md` dokumentasi sheet baru | `PLAN/SHEETS-SCHEMA.md` | ✅ |

### Phase 2: Domain Layer (Validation)

| # | Task | File | Status |
|---|---|---|---|
| 2.1 | Buat `lib/domain/incident-validation.ts` validasi kategori, severity, deskripsi | `lib/domain/incident-validation.ts` | ✅ |
| 2.2 | Buat `lib/domain/incident-categories.ts` validasi kategori incident | `lib/domain/incident-categories.ts` | ✅ (logic di incident-validation + ops-data) |
| 2.3 | Update `lib/types.ts` tambah type `Incident`, `IncidentCategory` | `lib/types.ts` | ✅ |
| 2.4 | Update `lib/ids.ts` tambah generator `INC-###` | `lib/ids.ts` | ✅ (`INC-` + `KIC-`) |

### Phase 3: API Layer

| # | Task | File | Status |
|---|---|---|---|
| 3.1 | `GET /api/incidents?branchId=` list incident (admin: semua cabang, karyawan: cabang sendiri) | `app/api/incidents/route.ts` | ✅ |
| 3.2 | `POST /api/incidents` buat incident baru | `app/api/incidents/route.ts` | ✅ |
| 3.3 | `GET /api/incidents/[id]` detail incident | `app/api/incidents/[id]/route.ts` | ✅ |
| 3.4 | `PATCH /api/incidents/[id]` resolve incident (admin only) | `app/api/incidents/[id]/route.ts` | ✅ |
| 3.5 | `GET /api/incident-categories?branchId=` list kategori | `app/api/incident-categories/route.ts` | ✅ |
| 3.6 | `POST /api/incident-categories` tambah kategori (admin) | `app/api/incident-categories/route.ts` | ✅ |
| 3.7 | `PATCH /api/incident-categories/[id]` edit kategori (admin) | `app/api/incident-categories/[id]/route.ts` | ⬜ (belum perlu belum ada UI edit) |
| 3.8 | `DELETE /api/incident-categories/[id]` nonaktifkan kategori (admin) | `app/api/incident-categories/[id]/route.ts` | ✅ |
| 3.9 | Update `PLAN/API-CONTRACT.md` dokumentasi endpoint baru | `PLAN/API-CONTRACT.md` | ✅ (§9b) |

### Phase 4: UI Layer

| # | Task | File | Status |
|---|---|---|---|
| 4.1 | Halaman list incident (admin: semua cabang, karyawan: cabang sendiri) | `app/(app)/incident/page.tsx` | ✅ |
| 4.2 | Form buat incident baru | `app/(app)/incident/ajukan/page.tsx` | ✅ |
| 4.3 | Detail incident + resolve action (admin) | `app/(app)/incident/[id]/page.tsx` | ✅ |
| 4.4 | Kelola kategori incident (admin) | `app/(app)/kategori-incident/page.tsx` | ✅ |
| 4.5 | Update `components/nav-config.ts` tambah menu Incident | `components/nav-config.ts` | ✅ |
| 4.6 | Update Dashboard widget "Incident hari ini" | `app/(app)/dashboard/page.tsx` | ✅ (API `openIncidents`/`highIncidents`) |
| 4.7 | Update Laporan rekap incident | `app/(app)/laporan/page.tsx` | ✅ (API laporan menyertakan tipe Incident) |

### Phase 5: Testing & Integration

| # | Task | File | Status |
|---|---|---|---|
| 5.1 | Unit test: incident validation | `test/incident-validation.test.ts` | ⬜ |
| 5.2 | Unit test: incident categories validation | `test/incident-categories.test.ts` | ⬜ |
| 5.3 | Integration test: API endpoints | `test/api-incidents.test.ts` | ⬜ |
| 5.4 | E2E test: UI flow (buat → lihat → resolve) | `test/e2e-incident.test.ts` | ⬜ |
| 5.5 | Update existing branch provisioning seed kategori default | `lib/google/provisioning.ts` | ⬜ |

---

## Kategori Default (saat provisioning)

```
KIC-001  Mesin Rusak
KIC-002  Komplain Customer
KIC-003  Barang Rusak
KIC-004  Stok Habis
KIC-005  Kesalahan Order
KIC-006  Kebersihan
KIC-007  Keamanan
KIC-008  Karyawan Berhalangan
KIC-009  Lainnya
```

---

## Severity Level

| Level | Warna | Contoh |
|---|---|---|
| `low` | green | Barang rusak minor, komplain kecil |
| `medium` | yellow | Mesin rusak, stok habis |
| `high` | red | Masalah keamanan, kecelakaan kerja |

---

## Navigasi Setelah Penambahan

| Menu | Admin | Petugas |
|---|---|---|
| Incident | ✅ (semua cabang) | ✅ (cabang sendiri) |
| Kategori Incident | ✅ | ❌ |

---

## Estimasi

| Phase | Estimasi |
|---|---|
| Phase 1: Data Layer | 2-3 jam |
| Phase 2: Domain Layer | 1-2 jam |
| Phase 3: API Layer | 2-3 jam |
| Phase 4: UI Layer | 3-4 jam |
| Phase 5: Testing | 2-3 jam |
| **Total** | **10-15 jam** |

---

## Catatan

- Foto upload pakai Drive bridge yang sudah ada (pola sama dengan checklist photo)
- Kategori incident terpisah dari kategori izin (different domain)
- Status `resolved` hanya bisa di-set oleh admin
- Karyawan hanya bisa lihat incident cabangnya sendiri
- Dashboard widget: count incident by severity per cabang
