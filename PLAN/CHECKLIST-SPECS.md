# MYSHIFT — [CHECKLIST-SPECS.md](http://CHECKLIST-SPECS.md)

> **Versi:** 1.0.0 (draft) **Tanggal:** 2026-09-29 **Status:** Beberapa keputusan masih tertunda — lihat §5 sebelum dianggap final **Dokumen ini MEN-SUPERSEDE bagian terkait di:** [`FULL-PRD.md`](http://FULL-PRD.md) §6.6 (Checklist), [`SHEETS-SCHEMA.md`](http://SHEETS-SCHEMA.md) (sheet `Checklist_Template`/`Checklist_Log`, role di `Employees`), [`API-CONTRACT.md`](http://API-CONTRACT.md) §8 (Checklist), [`UI-PLAN.md`](http://UI-PLAN.md) (halaman Checklist Template &amp; Checklist Shift, dan role Kepala Cabang di seluruh dokumen). Sinkronisasi ke 4 file itu dilakukan setelah §5 dijawab.

---

## 0. Perubahan Role (mempengaruhi seluruh dokumen lain)

**Role "Kepala Cabang" dihapus sepenuhnya.** Hanya tersisa 2 role:

- **Admin** (pusat) — kelola semua cabang, semua SOP/Checklist Point, semua approval
- **Karyawan** — jalankan checklist, isi handover, generate &amp; share laporan shift sendiri

Semua referensi "Kepala Cabang" di dokumen lain (kewenangan checklist template scoped per cabang, approval, dashboard scoped) tidak berlaku lagi — jadi wewenang Admin penuh.

---

## 1. Terminologi (final)


| Istilah                | Arti                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| **Checklist**          | Nama tab/fitur di sisi karyawan                                                                |
| **Shift**              | Level pengelompokan 1 — Opening/Middle/Closing/custom per cabang                               |
| **SOP** (Kategori SOP) | Level pengelompokan 2 — bebas dibuat Admin (misal "Kebersihan", "Keamanan Kas", "Food Safety") |
| **Checklist Point**    | Baris individual yang harus diselesaikan karyawan                                              |


Hierarki: **Checklist → Shift → SOP → Checklist Point**

---

## 2. Skema Data

### Sheet: `SOP_Kategori` (per cabang)


| Kolom         | Tipe                       | Sumber       |
| ------------- | -------------------------- | ------------ |
| `Kategori_ID` | string, format `SOP-###`   | 🔒 Auto      |
| `Nama`        | string, bebas dibuat Admin | ✏️ Manual OK |
| `Urutan`      | number                     | ✏️ Manual OK |
| `Aktif`       | boolean                    | ✏️ Manual OK |


### Sheet: `Checklist_Point` (ganti nama dari `Checklist_Template`)


| Kolom                     | Tipe                                                 | Sumber              | Keterangan                                                                    |
| ------------------------- | ---------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| `Point_ID`                | string, format `CHK-###`                             | 🔒 Auto             | Primary key                                                                   |
| `Kategori_ID`             | string, referensi `SOP_Kategori`                     | ⚠️ Manual hati-hati |                                                                               |
| `Deskripsi`               | string                                               | ✏️ Manual OK        |                                                                               |
| `Tipe_Penyelesaian`       | enum: `centang`                                      | `centang_foto`      | `angka`                                                                       |
| `Satuan`                  | string, nullable                                     | ✏️ Manual OK        | Hanya relevan untuk tipe `angka`, misal "°C"                                  |
| `Batas_Min` / `Batas_Max` | number, nullable                                     | ✏️ Manual OK        | Hanya tipe `angka`; nilai di luar batas = **warning**, tidak memblokir submit |
| `Opsi_Pilihan`            | string, comma-separated, nullable                    | ✏️ Manual OK        | Hanya tipe `pilihan`, misal "Baik,Perlu perhatian,Rusak"                      |
| `Berlaku_Semua_Shift`     | boolean                                              | ✏️ Manual OK        |                                                                               |
| `Shift_IDs`               | string, comma-separated referensi `Shifts`, nullable | ⚠️ Manual hati-hati | Diisi hanya kalau `Berlaku_Semua_Shift = FALSE`                               |
| `Urutan`                  | number                                               | ✏️ Manual OK        | Urutan dalam kategorinya                                                      |
| `Aktif`                   | boolean                                              | ✏️ Manual OK        | Nonaktifkan, jangan hapus, kalau sudah ada log                                |


**Resolusi saat karyawan mulai shift:** ambil semua Checklist Point dengan `Berlaku_Semua_Shift = TRUE` DITAMBAH yang `Shift_IDs`-nya memuat `Shift_ID` shift berjalan, lalu kelompokkan hasilnya per `Kategori_ID`. Kategori tanpa poin yang match untuk shift ini tidak ditampilkan.

### Sheet: `Checklist_Log`


| Kolom         | Tipe                                                                                                      | Sumber  |
| ------------- | --------------------------------------------------------------------------------------------------------- | ------- |
| `Log_ID`      | string, format `CLG-###`                                                                                  | 🔒 Auto |
| `Schedule_ID` | string                                                                                                    | 🔒 Auto |
| `Point_ID`    | string                                                                                                    | 🔒 Auto |
| `Nilai`       | string, generik — menampung `TRUE`/nilai angka/teks/opsi terpilih sesuai `Tipe_Penyelesaian` poin terkait | 🔒 Auto |
| `Foto_URL`    | string, nullable                                                                                          | 🔒 Auto |
| `Checked_By`  | string, `Employee_ID`                                                                                     | 🔒 Auto |
| `Checked_At`  | datetime ISO 8601                                                                                         | 🔒 Auto |


### Kolom baru di sheet `Schedules`


| Kolom                 | Tipe                        | Keterangan                                                                                                          |
| --------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Report_Generated_At` | datetime ISO 8601, nullable | Diisi saat laporan shift digenerate. Checklist &amp; handover shift ini jadi **read-only** setelah kolom ini terisi |
| `Report_Token`        | string, nullable            | Token akses laporan publik (HMAC-signed, lihat §4)                                                                  |


---

## 3. UI

### 3.1 Sisi Admin — Kelola Checklist (`/checklist-template`)

```
[Pilih Cabang]
  Tab: [Opening] [Middle] [Closing]
    Section per SOP (accordion)
      Tabel Checklist Point: Deskripsi | Tipe | Wajib Foto | Cakupan Shift | Urutan | Aktif | Aksi
      [+ Tambah Checklist Point]

```

- Poin dengan `Berlaku_Semua_Shift = TRUE` muncul di **setiap tab Shift** dalam section SOP yang sama (transparan ke Admin bahwa poin itu lintas shift)
- Form Tambah/Edit: pilih SOP (+ shortcut buat SOP baru inline) → deskripsi → pilih Tipe Penyelesaian → field dinamis muncul sesuai tipe (Satuan+Batas untuk `angka`, daftar Opsi untuk `pilihan`) → cakupan shift (radio: semua shift / shift tertentu, checkbox multi-select)
- Edit tipe pada poin yang sudah punya log → tampilkan warning non-blocking ("data lama tidak berubah, hanya pengisian berikutnya")
- Delete permanen hanya untuk poin yang belum pernah ada di `Checklist_Log`; kalau sudah ada log, cuma bisa nonaktifkan

### 3.2 Sisi Karyawan — Checklist Shift (`/shift/[id]/checklist`)

- Header: konteks shift saja ("Checklist – Opening – Cabang Antapani"), tidak ada tab Shift lagi (sudah otomatis ter-scope)
- Section per SOP (accordion), tiap Checklist Point jadi **card**, kontrol sesuai tipe:
  - `centang` → checkbox
  - `centang_foto` → checkbox + upload foto
  - `angka` → input angka + label satuan, warning visual kalau di luar batas (tetap bisa disubmit)
  - `teks` → textarea singkat
  - `pilihan` → radio/dropdown dari `Opsi_Pilihan`
- Progress bar gabungan lintas semua SOP ("X/Y selesai")
- Submit checklist disabled sampai semua poin applicable terisi (validasi juga di backend)

### 3.3 Detail Shift (`/shift/[id]`) — update

```
✅ Checklist (15/15 selesai)
✅ Handover (sudah diisi)
⬜ Laporan (belum digenerate) → [Generate Laporan]

```

Tombol "Generate Laporan" disabled sampai checklist 100% dan handover terisi (validasi backend, bukan cuma frontend).

### 3.4 Laporan Shift (`/shift/[id]/laporan`) — baru

- Sebelum generate: preview data yang akan dirangkum + tombol "Generate Laporan"
- Setelah generate: tampilkan laporan lengkap (info shift, ringkasan checklist per SOP, isi handover, nama pengisi) + tombol **Share ke WhatsApp**
- Generate mengunci `Checklist_Log` dan `Handover_Log` shift ini jadi read-only (via `Report_Generated_At` terisi)

### 3.5 Laporan Publik (`/laporan-publik/[token]`) — baru, tanpa login

- Read-only, isi sama seperti §3.4
- Diakses lewat `Report_Token` di URL — untuk penerima WA yang belum tentu punya akun MYSHIFT

---

## 4. Template Pesan WhatsApp

Tombol "Share ke WhatsApp" membuka `[wa.me/?text=](http://wa.me/?text=)...` (deep link, bukan WhatsApp Business API) — pola sama seperti `waLinkBuilder` di MYCUSTOMER. User klik → WA terbuka dengan teks pre-filled → user pilih kontak/grup sendiri → kirim manual.

```
📋 *Laporan Shift* — {{nama_cabang}}
🕐 {{nama_shift}} · {{tanggal}} · {{nama_karyawan}}

✅ Checklist: {{jumlah_selesai}}/{{jumlah_total}} selesai
{{daftar_poin_bermasalah_jika_ada}}

📝 Handover:
{{ringkasan_handover}}

Lihat detail lengkap:
{{link_laporan_publik}}

```

`Report_Token` dibuat dengan pola HMAC-signed yang sama seperti token SSO yang sudah ada di ekosistem, tapi murni internal MYSHIFT (bukan terhubung ke MYLAUNCHER).

---

## 5. Keputusan Tertunda (jawab sebelum sinkronisasi ke dokumen lain)

1. **Masa berlaku** `Report_Token` — token SSO ekosistem cuma 60 detik, itu jelas terlalu pendek di sini karena penerima WA bisa baru buka link berjam-jam/berhari-hari kemudian. Berapa lama sebaiknya (7 hari? 30 hari? tanpa kedaluwarsa)? jawab : Selamanya
2. **Setelah generate, apakah final?** — kalau ada kesalahan di handover/checklist setelah laporan digenerate, apakah Admin bisa "buka kunci"/regenerate, atau sekali generate memang tidak bisa diubah lagi? jawab : admin dan petugas bisa edit, tapi ada jejak logsnya di laporan
3. **Template pesan WA** — cukup hardcode di kode (seperti draft §4), atau Admin butuh halaman untuk mengubah teks template-nya sendiri? hardcode aja

---

## 6. Yang TIDAK berubah dari dokumen sebelumnya

- Halaman `/laporan` (rekap periodik lintas cabang untuk Admin — Ringkasan, Kehadiran, Checklist, Swap &amp; Izin, Handover) tetap seperti dirancang sebelumnya, terpisah dari fitur Laporan Shift per-kejadian di dokumen ini
- Provisioning cabang (copy template, Registry, folder Drive per cabang) — tidak tersentuh oleh spec ini
- Modul Jadwal, Swap, Izin — tidak berubah, hanya kehilangan sentuhan Kepala Cabang (§0)

