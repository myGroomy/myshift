# Setup bridge di project Apps Script BARU (5 menit, sekali)

Project lama (`1KbVNbw…`) tidak bisa lagi menjalankan web app publik: begitu `oauthScopes` dideklarasikan
eksplisit, Apps Script membatalkan otorisasi proyek, dan sejak itu **semua** deployment membalas
HTTP 401 termasuk yang dibuat ulang, dan termasuk setelah manifest dikembalikan ke versi yang
sebelumnya sempat jalan. Re-auth lewat `authCheck` dan revert manifest tidak memulihkannya.
Project baru Starting with authorization state that is guaranteed clean.

Semua yang perlu: 1 file kode, 1 manifest, 2 Script Properties, 1 deploy.

## 1. Buat project

Buka <https://script.new> pastikan login sebagai **`taufikalwan47@gmail.com`** (pemilik folder
`MYSHIFT`; kalau project dibuat akun lain, file hasilnya miliknya orang itu dan app tidak bisa
mengaksesnya).

## 2. Tempel kodenya

1. Buka file `gas/Code.js` di repo ini, salin **seluruh** isinya (Ctrl/Cmd+A → Ctrl/Cmd+C).
2. Di editor Apps Script, hapus isi bawaan `Code.gs` (yang berisi `function myFunction()`), lalu
   tempel. Simpan (Ctrl/Cmd+S). File di editor akan tetap bernama `Code.gs` itu normal dan tidak
   masalah; yang penting isinya sama.

Isinya ~230 baris: 3 aksi (`importFile`, `copyFile`, `uploadFile`) + penjaga secret/folder.

## 3. Manifest

1. Gear ⚙ → **Show "appsscript.json" manifest file in editor** (centang).
2. Ganti isinya menjadi persis:

```json
{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  }
}
```

**Jangan** menambahkan `oauthScopes` biarkan Apps Script mendeteksi sendiri scope dari kode
(DriveApp + UrlFetchApp). Menulisnya eksplisit justru pemicu rusaknya project lama.

## 4. Script Properties

Gear ⚙ → **Script Properties** → baris `MYSHIFT_BRIDGE_SECRET` dan `MYSHIFT_PARENT_FOLDER_ID`:

| Key | Nilai |
|---|---|
| `MYSHIFT_BRIDGE_SECRET` | nilai yang sama persis dengan `GAS_BRIDGE_SECRET` di `.env.local` (ambil dengan `grep '^GAS_BRIDGE_SECRET=' .env.local`, tempel setelah `=`) |
| `MYSHIFT_PARENT_FOLDER_ID` | `1M-QLrh_0YFVVDxVx8Zoljbw2ntVpLGXD` (folder `MYSHIFT`) |

Secret **harus identik** dengan yang di `.env.local`; kalau beda, bridge membalas
`{"ok":false,"error":"UNAUTHORIZED"}`.

## 5. Deploy

**Deploy → New deployment → ⚙ ikon roda gigi → Web app**:

- Description: `myshift drive bridge v1`
- **Execute as: Me**
- **Who has access: Anyone**
- Klik **Deploy** (kalau muncul layar persetujuan scope, pilih **Allow**)
- Salin **Web app URL**-nya (berbentuk `https://script.google.com/macros/s/AKfy…/exec`)

Kirim URL itu ke saya. Saya akan menuliskannya ke `.env.local`, mengarahkan `gas/.clasp.json` ke
Script ID baru, lalu menjalankan `pnpm probe:bridge` dan `pnpm check:bridge`.

## 6. Kalau ada yang gagal

- `{"ok":false,"error":"USE_POST"}` saat dibuka di browser → web app hidup, tapi harus POST (normal).
- `{"ok":false,"error":"UNAUTHORIZED"}` → secret di Script Properties ≠ yang di `.env.local`.
- `{"ok":false,"error":"TEMPLATE_NOT_A_SHEET"}` → normal pada tes pertama: template memang masih
  `.xlsx`. Setelah bridge hidup, jalankan `pnpm template:import`.
- `{"ok":false,"error":"IMPORT_FAILED"}` → konversi `.xlsx` gagal; **plan B**: buka `MYSHIFT-Template-Cabang.xlsx`
  di Drive → "Open with Google Sheets", lalu rename hasilnya jadi `MYSHIFT-Template-Cabang` dan
  tunjuk `TEMPLATES.Template_Spreadsheet_ID` ke file itu. Sisanya (copy + foto) tetap jalan.

## Setelah project baru jalan

`gas/.clasp.json` harus diarahkan ke Script ID project baru saya yang melakukannya begitu URL
Anda terkirim, supaya `clasp push` berikutnya tidak mendarat di project rusak.
