# MYSHIFT — API Contract

> **Versi:** 1.0.0
> **Tanggal:** 2026-09-26
> **Turunan dari:** `FULL-PRD.md`
> **Base URL:** `/api`
> **Format response standar (ikut pola STOKIS):**
> ```json
> // Sukses
> { "success": true, "data": { ... } }
> // Gagal
> { "success": false, "error": { "code": "STRING_CODE", "message": "Pesan untuk user" } }
> ```
> Semua endpoint (kecuali `/api/auth/login`) memerlukan session cookie valid. Semua endpoint di-scope ke `branchId` aktif di sesi user, kecuali disebutkan lain.

---

## 1. Auth

### `POST /api/auth/login`
Body: `{ "username": string, "pin": string }`
Response 200: `{ "success": true, "data": { "employeeId": string, "role": "admin"|"kepala_cabang"|"karyawan", "branches": [{ branchId, name }] } }`
Response 401: `error.code = "INVALID_CREDENTIALS"`
Response 423: `error.code = "ACCOUNT_LOCKED"` (+ `data.lockedUntil`)

### `POST /api/auth/logout`
Response 200: `{ "success": true }`

### `POST /api/auth/select-branch`
Body: `{ "branchId": string }`
Response 200: set branch aktif di sesi

### `GET /api/auth/session`
Response 200: info sesi berjalan (employeeId, role, branchId aktif) — dipakai frontend untuk cek status login

---

## 2. Employees (Admin only)

### `GET /api/employees?branchId=&status=`
Response 200: `{ "data": Employee[] }`

### `POST /api/employees`
Body: `{ "name", "username", "pin", "role", "branchId" }`
Response 201: `{ "data": Employee }`

### `PATCH /api/employees/:id`
Body: partial `{ "name"?, "role"?, "branchId"?, "isActive"? }`

### `POST /api/employees/:id/reset-pin`
Body: `{ "pin": string }`

---

## 3. Branches (Admin only)

### `GET /api/branches`
### `POST /api/branches`
Body: `{ "name": string }`
### `PATCH /api/branches/:id`
Body: `{ "name"?, "isActive"? }`

---

## 4. Shift Templates (Admin only)

### `GET /api/shifts?branchId=`
### `POST /api/shifts`
Body: `{ "branchId", "name", "startTime", "endTime" }`
### `PATCH /api/shifts/:id`
### `DELETE /api/shifts/:id`

---

## 5. Schedules

### `GET /api/schedules?branchId=&startDate=&endDate=`
Response 200: `{ "data": ScheduleEntry[] }` — dipakai untuk kalender admin & "jadwal saya" (difilter employeeId di frontend/backend sesuai role)

### `POST /api/schedules` (Admin)
Body: `{ "employeeId", "shiftId", "date" }`
Response 201: `{ "data": ScheduleEntry }`
Response 200 dengan `data.conflictWarning: true` kalau bentrok terdeteksi (**tidak** di-block, hanya warning — sesuai keputusan PRD)

### `PATCH /api/schedules/:id` (Admin)
Body: `{ "employeeId"?, "shiftId"?, "date"? }`

### `DELETE /api/schedules/:id` (Admin)

### `POST /api/schedules/:id/start-shift` (Karyawan pemilik jadwal)
Menandai waktu mulai shift (bukan absensi formal — hanya timestamp).
Response 200: `{ "data": { "scheduleId", "startedAt" } }`

---

## 6. Shift Swap

### `GET /api/swaps?status=&branchId=`
Response 200: `{ "data": SwapRequest[] }`

### `GET /api/swaps/eligible-partners?scheduleId=`
Response 200: `{ "data": Employee[] }` — daftar karyawan yang jadwalnya "cocok" untuk ditukar (filter otomatis di backend, bukan bebas pilih siapapun)

### `POST /api/swaps` (Karyawan)
Body: `{ "scheduleId", "requestedWithEmployeeId", "reason" }`
Response 201: `{ "data": SwapRequest }` (status: `pending`)

### `POST /api/swaps/:id/approve` (Admin)
### `POST /api/swaps/:id/reject` (Admin)
Body: `{ "reason"? }`

---

## 7. Izin (Leave Requests)

### `GET /api/izin-categories`
Response 200: `{ "data": [{ "id", "label" }] }`

### `POST /api/izin-categories` (Admin)
### `DELETE /api/izin-categories/:id` (Admin)

### `GET /api/izin?status=&branchId=`

### `POST /api/izin` (Karyawan)
Body: `{ "scheduleId", "categoryId", "note" }`
Response 201: `{ "data": IzinRequest }` (status: `pending`)

### `POST /api/izin/:id/approve` (Admin)
### `POST /api/izin/:id/reject` (Admin)
Body: `{ "reason"? }`

---

## 8. Checklist

### `GET /api/checklist-templates?branchId=&type=opening|closing` (Admin, Kepala Cabang)
### `POST /api/checklist-templates` (Admin, Kepala Cabang — scoped ke cabangnya)
Body: `{ "branchId", "type", "description", "requiresPhoto": boolean }`
### `PATCH /api/checklist-templates/:id`
### `DELETE /api/checklist-templates/:id`

### `GET /api/schedules/:scheduleId/checklist`
Response 200: `{ "data": { "items": ChecklistItem[], "completed": number, "total": number } }`

### `POST /api/schedules/:scheduleId/checklist/:itemId/check` (Karyawan pemilik jadwal)
Body: `{ "photoUrl"? }` (opsional, sesuai `requiresPhoto` item)
Response 200: `{ "data": { "checked": true } }`

### `POST /api/schedules/:scheduleId/checklist/submit` (Karyawan)
Response 200 kalau semua item checked
Response 400: `error.code = "CHECKLIST_INCOMPLETE"` kalau ada item belum dicentang — **divalidasi di backend, bukan cuma frontend**

---

## 9. Handover

### `GET /api/handover-templates` (Admin)
### `POST /api/handover-templates` (Admin)
Body: `{ "label", "isRequired": boolean }`
### `PATCH /api/handover-templates/:id`
### `DELETE /api/handover-templates/:id`

### `GET /api/schedules/:scheduleId/handover`
Response 200: handover milik shift ini (kalau sudah diisi)

### `GET /api/schedules/:scheduleId/handover/previous`
Response 200: handover dari shift sebelumnya (read-only, untuk konteks karyawan yang baru mulai shift)

### `POST /api/schedules/:scheduleId/handover` (Karyawan pemilik jadwal)
Body: `{ "fields": [{ "fieldId", "value" }] }`
Response 400: `error.code = "REQUIRED_FIELD_MISSING"` kalau field wajib kosong

---

## 10. Dashboard & Laporan

### `GET /api/dashboard?branchId=` (Admin, Kepala Cabang)
Response 200: `{ "data": { "activeBranches", "shiftsToday", "pendingApprovals", "branchStatus": [...] } }`

### `GET /api/reports?branchId=&startDate=&endDate=` (Admin, Kepala Cabang)
Response 200: rekap jadwal/swap/izin per periode

### `GET /api/reports/export?branchId=&startDate=&endDate=&format=csv|xlsx`
Response: file stream

---

## 11. Error Codes Standar

| Code | Arti |
|---|---|
| `INVALID_CREDENTIALS` | Username/PIN salah |
| `ACCOUNT_LOCKED` | Terkunci karena gagal login berkali-kali |
| `UNAUTHORIZED` | Sesi tidak valid/expired |
| `FORBIDDEN` | Role tidak punya akses ke resource ini |
| `NOT_FOUND` | Resource tidak ditemukan |
| `VALIDATION_ERROR` | Body request tidak valid (+ `data.fields` untuk detail per-field) |
| `CHECKLIST_INCOMPLETE` | Submit checklist ditolak, ada item belum selesai |
| `REQUIRED_FIELD_MISSING` | Handover submit ditolak, field wajib kosong |
| `SCHEDULE_CONFLICT_WARNING` | Bukan error — flag informational di response sukses |

---

## 12. Catatan Implementasi

- Semua endpoint yang menulis ke Sheets (POST/PATCH/DELETE) harus idempotent-safe secara wajar — hindari double-submit dari double-tap di UI (disable tombol submit setelah diklik, bukan hanya server-side check).
- Validasi checklist & handover **wajib** di backend (lihat §8, §9) — jangan andalkan disabled state di frontend saja, karena request API tetap bisa dipanggil langsung.
- Tidak ada endpoint attendance/clock-in-out formal — hanya `start-shift` yang sekadar timestamp (lihat §5), sesuai batasan scope di PRD.
