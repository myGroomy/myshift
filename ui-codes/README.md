# ui-codes — Ekstraksi frontend MYSHIFT (HTML/CSS/JS statis)

Satu file `.html` per route aplikasi Next.js, bisa dibuka **tanpa server Next** —
cukup server statis apa pun (atau buka langsung file-nya). Isinya terjemahan
literal dari source React (`app/`, `components/`) dengan styling dari token
`PLAN/atlassian-DESIGN.md`.

> Pratinjau ini **hanya tampilan**. Logika bisnis, validasi backend, scrypt PIN,
> dan akses Google Sheets tidak ikut diekstrak — semua request dialihkan ke
> mock (lihat bagian *API & Mock*).

## Cara menjalankan

```bash
# dari root repo — pilih salah satu:
python3 -m http.server 8080 -d ui-codes
npx serve ui-codes
```

lalu buka `http://localhost:8080/` (`index.html`).
Membuka via `file://` juga biasanya jalan (tidak ada `fetch` lintas-origin).

## Peta route → file

| Route Aplikasi | File | Catatan |
| --- | --- | --- |
| `/` | `index.html` | landing page (app/page.tsx) |
| *(404)* | `404.html` | app/not-found.tsx |
| `/login` | `login.html` | tanpa shell |
| `/dashboard` | `dashboard.html` | admin |
| `/profil` | `profil.html` | dual-shell (default `admin`) |
| `/jadwal` | `jadwal.html` | admin |
| `/jadwal-petugas` | `jadwal-petugas.html` | admin |
| `/jadwal-saya` | `jadwal-saya.html` | tab: `?tab=izin\|swap\|riwayat` |
| `/karyawan` | `karyawan.html` | admin |
| `/cabang` | `cabang.html` | admin |
| `/shift-template` | `shift-template.html` | admin |
| `/checklist-template` | `checklist-template.html` | admin |
| `/handover-template` | `handover-template.html` | admin |
| `/kategori-izin` | `kategori-izin.html` | admin |
| `/kategori-incident` | `kategori-incident.html` | admin |
| `/checklist` | `checklist.html` | shift-picker |
| `/handover` | `handover.html` | shift-picker |
| `/checklist/history` | `checklist-history.html` | |
| `/laporan` | `laporan.html` | dual-shell |
| `/approval` | `approval.html` | tab: `?tab=izin\|swap` |
| `/incident` | `incident.html` | dual-shell |
| `/incident/ajukan` | `incident-ajukan.html` | petugas |
| `/incident/[id]` | `incident-detail.html` | petugas |
| `/pilih-cabang` | `pilih-cabang.html` | dual-shell |
| `/laporan-publik/[token]` | `laporan-publik.html` | token → mock apa pun |
| `/shift/[id]` | `shift-detail.html` | tab: `?tab=checklist\|laporan\|handover` |
| `/shift/[id]/checklist` | `shift-detail-checklist.html` | |
| `/shift/[id]/laporan` | `shift-detail-laporan.html` | |
| `/izin/ajukan` | `izin-ajukan.html` | stub → `jadwal-saya.html?tab=izin` |
| `/riwayat` | `riwayat.html` | stub → `jadwal-saya.html?tab=riwayat` |
| `/swap/ajukan` | `swap-ajukan.html` | stub → `jadwal-saya.html?tab=swap` |
| `/approval/izin` | `approval-izin.html` | stub → `approval.html?tab=izin` |
| `/approval/swap` | `approval-swap.html` | stub → `approval.html?tab=swap` |
| `/shift/[id]/handover` | `shift-detail-handover.html` | stub → `shift-detail.html?tab=handover` |

Semua tautan di dalam halaman memakai nama file datar (`jadwal.html`),
bukan path route. `Myshift.route("/jadwal?branchId=CBG001")` mengubah path
route apa pun (termasuk query & id dinamis seperti `/shift/SCH-…/checklist`)
menjadi nama file yang benar.

## Kontrak shell (assets/common.js)

Setiap halaman punya atribut di `<body>`:

```html
<body data-shell="admin" data-active="/dashboard">
  <div id="ms-root">
    <main id="main"> … konten halaman saja … </main>
  </div>
</body>
```

* `data-shell="admin"` → common.js menyisipkan header Admin (nav.tsx) + dock
  (dock.tsx) ke `#ms-root`, dan menambahkan kelas main Admin.
* `data-shell="petugas"` → header Petugas (petugas-shell.tsx) + tab bawah.
* `data-shell="none"` → tanpa shell; halaman mengatur kelas `#main`-nya sendiri
  (lihat `login.html`).
* `data-active="/route"` → menandai link aktif di nav & dock.
* Halaman **tidak** mengisi `class` pada `#ms-root`/`#main` untuk shell
  `admin`/`petugas` — kelasnya ditambahkan common.js (identik dengan source).

**Dual-shell** (`profil`, `laporan`, `incident`, `pilih-cabang`): source aslinya
memilih shell via `session.role`. Preview memakai `data-shell="admin"` sebagai
default; ubah ke `"petugas"` di atribut `<body>` untuk melihat shell petugas
(petunjuk lengkap ada di komentar tiap file).

## Styling

* `assets/app.css` — **compiled** dari `app/globals.css` (Tailwind v4 + token
  Atlassian). Jangan menaruh aturan custom di sini.
* `assets/common.css` — keyframe/state yang tak bisa diekspresikan Tailwind
  statis: `.ms-enter` / `.ms-enter-lg` (pengganti `motion.div`), `.ms-toast*`,
  `.ms-sheet`, `.ms-overlay`, `.ms-skeleton`.
* Warna/font **hanya** dari token (`bg-card`, `text-muted-foreground`,
  `border-border`, …). Jangan menyalin hex/font dari
  `PLAN/kerangka-ui/extracted/` — prototipe itu memakai palet campuran.

### Snippet kelas tombol (dari `components/ui/button.tsx`)

Tempel utuh, gabungkan BASE + variant + size (persis keluaran `cva`):

```text
BASE:
group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4

variant default:      bg-primary text-primary-foreground hover:bg-primary/80
variant outline:      border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50
variant secondary:    bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground
variant ghost:        hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50
variant destructive:  bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40
variant link:         text-primary underline-offset-4 hover:underline

size default: h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2
size sm:      h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5
size lg:      h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2
size icon:    size-8
```

Field (Input `components/ui/input.tsx`): `controlClass` dari `lib/ui.ts` lalu
tambahan kelas dari pemakaian (mis. `bg-background px-3`), gabung literal.

## Ikon

`assets/icons.js` mengisi `window.MS_ICONS` (60 ikon Lucide, ISC) sebagai
string inner-SVG. Dua cara memakai:

```html
<!-- 1) runtime, saat inline script (Myshift sudah tersedia — skrip tanpa defer) -->
<span id="i"></span>
<script>document.getElementById("i").innerHTML = Myshift.icon("store", 16);</script>

<!-- 2) tempel langsung (boleh juga; SVG atribut width/height-nya) -->
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true"><path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/>…</svg>
```

Kunci ikon: `alert-circle alert-triangle arrow-left arrow-left-right arrow-right
arrow-right-left arrow-up-right bar-chart-3 calendar calendar-days calendar-x
camera check check-circle check-circle-2 check-square chevron-down chevron-left
chevron-right circle-alert circle-user-round clipboard-check clipboard-list
clock clock-3 copy download eye eye-off file-text folder-open handshake history
inbox info kanban-square layout-dashboard layout-grid list-checks loader-2
log-out menu moon pencil plus refresh-cw search settings-2 share-2 sheet store
sun tag trash-2 user users wifi wifi-off x`

Nama ikon nav (`dashboard`, `event_note`, `storefront`, …) dipetakan oleh
`ICON_MAP` di common.js persis seperti `dock.tsx`.

## API & Mock

Sumber tidak memanggil `fetch` langsung — semuanya lewat `Myshift.request()`:

```js
window.MS_MOCKS = {
  "/api/schedules": [ /* data contoh */ ],
  "/api/x": function () { throw new Error("contoh error"); }, // fungsi boleh throw
};
const data = await Myshift.request("/api/schedules");
```

* URL yang ada di `MS_MOCKS` → resolve 150 ms (mock).
* URL yang tidak ada → **reject** dengan pesan
  `"Endpoint /api/x tidak tersedia pada pratinjau statis (lihat ui-codes/README.md)."`
* Data contoh di HTML sudah dibakar; mock hanya untuk interaksi (refresh,
  submit, logout). Endpoint asli tiap halaman tercantum di komentar `<body>`
  dan sesuai `PLAN/API-CONTRACT.md` (kunci utama: `/api/auth/*`, `/api/dashboard`,
  `/api/schedules`, `/api/shifts`, `/api/employees`, `/api/branches`,
  `/api/checklist-points`, `/api/incidents`, `/api/incident-categories`,
  `/api/izin`, `/api/izin-categories`, `/api/swaps`).

Toast: `Myshift.toast(pesan, "success" | "error" | "info")`.

## API global common.js

```js
Myshift.route(path)          // path route (+query) → nama file statis
Myshift.icon(name, size)     // string inner-SVG dari MS_ICONS
Myshift.toast(msg, type)
Myshift.request(url, init)   // Promise; mock via MS_MOCKS
Myshift.logout()             // toast + redirect login.html
Myshift.openSheet() / closeSheet()  // sheet "Menu lain"
```

## Menyusun ulang CSS

Setelah menambahkan kelas baru di `.html`, sumber Tailwind harus mencakupnya
(`ui-codes/tailwind-input.css` mengarah ke `ui-codes/**/*.{html,js}` plus
`app/`, `components/`, `lib/` sebagai jaring pengaman kelas dinamis):

```bash
node ui-codes/build-css.cjs ui-codes/tailwind-input.css ui-codes/assets/app.css
```

Catatan: script build ini artefak pratinjau, bukan bagian aplikasi Next.js —
jangan sertakan dalam deploy Vercel (terletak sepenuhnya di dalam `ui-codes/`).

## Changelog / kepatuhan

* Tidak ada endpoint debug, tidak ada file `.bak`, tidak ada PIN plaintext
  (preview ini bahkan tidak membaca Sheets).
* Sumber kebenaran scope/desain tetap `PLAN/*.md`; file ini hanya artefak
  pratinjau front-end.
