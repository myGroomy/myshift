/* MYSHIFT ui-codes — shell statis untuk ekstraksi frontend.
   Mencerminkan komponen React berikut dalam HTML/JS murni:
     components/nav.tsx, components/dock.tsx, components/nav-config.ts,
     components/petugas-shell.tsx, components/theme-toggle.tsx,
     components/ui/toast.tsx, components/ui/sheet.tsx.
   Halaman memanggilnya lewat atribut <body data-shell="admin|petugas|none" data-active="/route">.
   Semua tautan diarahkan ke file .html datar (lihat README.md untuk peta route). */

(function () {
  "use strict";

  /* ============================ peta route -> file ============================ */
  var ROUTES = {
    "/": "index.html",
    "/login": "login.html",
    "/dashboard": "dashboard.html",
    "/jadwal": "jadwal.html",
    "/jadwal-petugas": "jadwal-petugas.html",
    "/jadwal-saya": "jadwal-saya.html",
    "/karyawan": "karyawan.html",
    "/cabang": "cabang.html",
    "/shift-template": "shift-template.html",
    "/checklist-template": "checklist-template.html",
    "/handover-template": "handover-template.html",
    "/kategori-izin": "kategori-izin.html",
    "/kategori-incident": "kategori-incident.html",
    "/checklist": "checklist.html",
    "/handover": "handover.html",
    "/checklist/history": "checklist-history.html",
    "/laporan": "laporan.html",
    "/approval": "approval.html",
    "/approval/izin": "approval-izin.html",
    "/approval/swap": "approval-swap.html",
    "/izin/ajukan": "izin-ajukan.html",
    "/riwayat": "riwayat.html",
    "/swap/ajukan": "swap-ajukan.html",
    "/incident": "incident.html",
    "/incident/ajukan": "incident-ajukan.html",
    "/profil": "profil.html",
    "/pilih-cabang": "pilih-cabang.html",
    "/laporan-publik": "laporan-publik.html",
  };

  /** Terjemahkan path route aplikasi (boleh +query) menjadi nama file statis. */
  function route(href) {
    var query = "";
    var qi = href.indexOf("?");
    if (qi >= 0) {
      query = href.slice(qi);
      href = href.slice(0, qi);
    }
    var file;
    if (ROUTES[href]) {
      file = ROUTES[href];
    } else if (href.indexOf("/shift/") === 0) {
      /* /shift/[id], /shift/[id]/checklist, /shift/[id]/laporan, /shift/[id]/handover */
      if (/\/checklist$/.test(href)) file = "shift-detail-checklist.html";
      else if (/\/laporan$/.test(href)) file = "shift-detail-laporan.html";
      else if (/\/handover$/.test(href)) file = "shift-detail.html?tab=handover";
      else file = "shift-detail.html";
    } else if (href.indexOf("/laporan-publik/") === 0) {
      file = "laporan-publik.html";
    } else if (href.indexOf("/incident/") === 0) {
      file = "incident-detail.html"; /* /incident/[id] */
    } else {
      var path = href.replace(/^\//, "").replace(/\/$/, "");
      file = path ? ROUTES["/" + path] || path.replace(/\//g, "-") + ".html" : "index.html";
    }
    return file + query;
  }

  /* ================================ ikon ================================ */
  /** Ikon lucide-inline dari assets/icons.js. Contoh: icon("calendar", 20). */
  function icon(name, size, cls) {
    var paths = (window.MS_ICONS || {})[name];
    if (!paths) return "";
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : "") + ">" + paths + "</svg>"
    );
  }

  /* ========================= konfigurasi navigasi =========================
     Disalin dari components/nav-config.ts (sumber tunggal di aplikasi). */
  var OPERASIONAL = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard", adminOnly: true },
    { href: "/jadwal", label: "Jadwal", icon: "event_note", adminOnly: true },
    { href: "/jadwal-petugas", label: "Jadwal Petugas", icon: "event_note", adminOnly: true },
    { href: "/checklist", label: "Checklist", icon: "checklist" },
    { href: "/handover", label: "Handover", icon: "swap_calls" },
    { href: "/incident", label: "Incident", icon: "report" },
    { href: "/laporan", label: "Laporan", icon: "bar_chart" },
  ];
  var MASTER_DATA = [
    { href: "/cabang", label: "Cabang", icon: "storefront", adminOnly: true },
    { href: "/karyawan", label: "Petugas", icon: "group", adminOnly: true },
    { href: "/shift-template", label: "Shift Template", icon: "schedule", adminOnly: true },
    { href: "/kategori-izin", label: "Kategori Izin", icon: "label", adminOnly: true },
    { href: "/kategori-incident", label: "Kategori Incident", icon: "label", adminOnly: true },
  ];
  var TEMPLATE = [
    { href: "/checklist-template", label: "Checklist", icon: "checklist", adminOnly: true },
    { href: "/handover-template", label: "Handover", icon: "swap_calls", adminOnly: true },
  ];
  var APPROVAL = [{ href: "/approval", label: "Approval Hub", icon: "approval", adminOnly: true }];

  var ADMIN_NAV_GROUPS = [
    { label: "Monitoring & Laporan", items: [OPERASIONAL[0], OPERASIONAL[6], APPROVAL[0]] },
    { label: "KELOLA SHIFT", items: [OPERASIONAL[1], OPERASIONAL[2], OPERASIONAL[4], MASTER_DATA[2]] },
    { label: "KELOLA PETUGAS", adminOnly: true, items: [MASTER_DATA[0], MASTER_DATA[1], MASTER_DATA[3]] },
    { label: "KELOLA INCIDENT", items: [OPERASIONAL[5], MASTER_DATA[4]] },
    { label: "KELOLA CHECKLIST", items: [OPERASIONAL[3], TEMPLATE[0], TEMPLATE[1]] },
  ];
  var ADMIN_DESKTOP_PRIMARY = [
    { href: "/jadwal", label: "Jadwal", icon: "event_note", adminOnly: true },
    { href: "/checklist", label: "Checklist", icon: "checklist" },
    { href: "/handover", label: "Handover", icon: "swap_calls" },
    { href: "/incident", label: "Incident", icon: "report" },
  ];
  var ADMIN_SETTINGS_GROUPS = [
    { label: "Monitoring & Laporan", items: [OPERASIONAL[0], APPROVAL[0], OPERASIONAL[6]] },
    { label: "KELOLA SHIFT", items: [OPERASIONAL[1], OPERASIONAL[2], OPERASIONAL[4], MASTER_DATA[2]] },
    { label: "KELOLA PETUGAS", items: [MASTER_DATA[0], MASTER_DATA[1], MASTER_DATA[3]] },
    { label: "KELOLA INCIDENT", items: [OPERASIONAL[5], MASTER_DATA[4]] },
    { label: "KELOLA CHECKLIST", items: [OPERASIONAL[3], TEMPLATE[0], TEMPLATE[1]] },
  ];
  var ADMIN_DOCK_TABS = [
    { href: "/jadwal", label: "Jadwal", icon: "event_note", adminOnly: true },
    { href: "/checklist", label: "Checklist", icon: "checklist" },
    { href: "/handover", label: "Handover", icon: "swap_calls" },
    { href: "/incident", label: "Incident", icon: "report" },
  ];
  var ADMIN_DOCK_EXTRAS = [{ href: "/pilih-cabang", label: "Pilih Cabang", icon: "storefront" }];

  var PETUGAS_NAV_ITEMS = [
    { href: "/jadwal-saya", label: "Jadwal", icon: "event_note" },
    { href: "/checklist", label: "Checklist", icon: "checklist" },
    { href: "/handover", label: "Handover", icon: "swap_calls" },
    { href: "/incident", label: "Incident", icon: "report" },
    { href: "/laporan", label: "Laporan", icon: "bar_chart" },
    { href: "/profil", label: "Profil", icon: "person" },
  ];
  var PETUGAS_DOCK_TABS = PETUGAS_NAV_ITEMS.slice(0, 4);
  var PETUGAS_DOCK_EXTRAS = [
    { href: "/laporan", label: "Laporan", icon: "bar_chart" },
    { href: "/profil", label: "Profil", icon: "person" },
  ];

  /* Peta ikon dock: nama internal -> kunci ikon lucide (components/dock.tsx). */
  var ICON_MAP = {
    dashboard: "layout-dashboard",
    calendar_today: "calendar",
    bar_chart: "bar-chart-3",
    storefront: "store",
    group: "users",
    schedule: "clock",
    label: "tag",
    checklist: "list-checks",
    swap_calls: "arrow-left-right",
    approval: "check-circle-2",
    event_note: "calendar-days",
    swap_horiz: "arrow-left-right",
    event_busy: "calendar-x",
    history: "history",
    person: "user",
    report: "alert-triangle",
  };

  function groupsForRole(groups, isAdmin) {
    return groups
      .filter(function (g) { return isAdmin || !g.adminOnly; })
      .map(function (g) {
        return { label: g.label, items: g.items.filter(function (i) { return isAdmin || !i.adminOnly; }) };
      })
      .filter(function (g) { return g.items.length > 0; });
  }
  function groupsWithoutTabs(groups, tabs) {
    var promoted = {};
    tabs.forEach(function (t) { promoted[t.href] = true; });
    return groups
      .map(function (g) {
        return { label: g.label, items: g.items.filter(function (i) { return !promoted[i.href]; }) };
      })
      .filter(function (g) { return g.items.length > 0; });
  }

  /* ============================== util markup ============================== */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function isCurrent(href, active) {
    return active === href || active.indexOf(href + "/") === 0;
  }
  function navLinkClass(current) {
    return (
      "block whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors " +
      (current ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")
    );
  }
  function dockTabClass(current) {
    return (
      "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors " +
      (current ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:text-foreground")
    );
  }
  function dockLinkClass(current) {
    return (
      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors " +
      (current ? "bg-accent font-semibold text-accent-foreground" : "text-foreground hover:bg-muted")
    );
  }
  /* Tombol ikon ghost (Button variant=ghost size=icon) dipakai header. */
  var GHOST_ICON =
    "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm " +
    "font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 " +
    "focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none " +
    "[&_svg]:shrink-0 hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 size-8";

  function navItems(list, active) {
    var html = "";
    list.forEach(function (item) {
      var current = isCurrent(item.href, active);
      html +=
        '<li><a href="' + route(item.href) + '"' +
        (current ? ' aria-current="page"' : "") +
        ' class="' + navLinkClass(current) + '">' + esc(item.label) + "</a></li>";
    });
    return html;
  }

  function groupSections(groups, active) {
    var html = "";
    groups.forEach(function (g) {
      html += '<section class="mb-2 last:mb-0">' +
        '<h2 class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">' + esc(g.label) + "</h2><ul>";
      g.items.forEach(function (item) {
        var current = isCurrent(item.href, active);
        html +=
          '<li><a href="' + route(item.href) + '"' + (current ? ' aria-current="page"' : "") +
          ' class="block rounded-md px-2 py-2 text-sm transition-colors ' +
          (current ? "bg-accent font-semibold text-accent-foreground" : "text-foreground hover:bg-muted") +
          '">' + esc(item.label) + "</a></li>";
      });
      html += "</ul></section>";
    });
    return html;
  }

  function themeButton() {
    return (
      '<button type="button" data-ms-theme aria-label="Ganti mode gelap/terang" ' +
      'class="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm ' +
      'font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 ' +
      'focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:bg-muted hover:text-foreground ' +
      'dark:hover:bg-muted/50 h-9 w-9 rounded-lg">' +
      '<span data-ms-theme-sun hidden>' + icon("sun", 18) + "</span>" +
      '<span data-ms-theme-moon>' + icon("moon", 18) + "</span></button>"
    );
  }

  /* ========================= header Admin (nav.tsx) ========================= */
  function adminHeader(active) {
    var isSettingsCurrent = ADMIN_SETTINGS_GROUPS.some(function (g) {
      return g.items.some(function (i) { return isCurrent(i.href, active); });
    });
    return (
      '<header class="sticky top-0 z-50 border-b border-border bg-background">' +
      '<div class="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-4 sm:px-6 lg:px-8">' +
      '<a href="dashboard.html" class="flex shrink-0 items-center gap-2 text-sm font-bold tracking-tight text-foreground">' +
      '<span class="grid size-6 place-items-center rounded-sm bg-primary text-[11px] font-bold text-primary-foreground">MS</span>MYSHIFT</a>' +
      '<nav aria-label="Navigasi utama" class="hidden min-w-0 flex-1 lg:block"><ul class="flex items-center gap-0.5 overflow-x-auto">' +
      navItems(ADMIN_DESKTOP_PRIMARY, active) +
      '<li><details data-ms-details class="group relative">' +
      '<summary class="flex cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors [&::-webkit-details-marker]:hidden ' +
      (isSettingsCurrent ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground") +
      '">' + icon("settings-2", 14) + "Pengelolaan" +
      '<span class="transition-transform group-open:rotate-180">' + icon("chevron-down", 14) + "</span></summary>" +
      '<div class="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-card p-2 shadow-sm">' +
      groupSections(ADMIN_SETTINGS_GROUPS, active) +
      "</div></details></li></ul></nav>" +
      '<div class="ml-auto flex items-center gap-1.5">' +
      '<a href="' + route("/pilih-cabang") + '" title="Pilih cabang pengelolaan" aria-label="Pilih cabang pengelolaan" class="' + GHOST_ICON + '">' + icon("store", 16) + "</a>" +
      themeButton() +
      '<a href="' + route("/profil") + '" title="Profil saya" aria-label="Profil Saya" class="' + GHOST_ICON + '">' + icon("circle-user-round", 18) + "</a>" +
      '<button type="button" data-ms-logout title="Keluar" aria-label="Keluar dari akun" class="' + GHOST_ICON + ' text-destructive">' + icon("log-out", 18) + "</button>" +
      "</div></div></header>"
    );
  }

  /* ==================== header Petugas (petugas-shell.tsx) ==================== */
  function petugasHeader(active) {
    return (
      '<header class="border-b border-border">' +
      '<div class="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 sm:px-6">' +
      '<a href="' + route("/jadwal-saya") + '" class="flex shrink-0 items-center gap-2 text-sm font-bold text-foreground">' +
      '<span class="grid size-6 place-items-center rounded-sm bg-primary text-[11px] font-bold text-primary-foreground">MS</span>MYSHIFT</a>' +
      '<nav aria-label="Navigasi petugas" class="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex">' +
      navItems(PETUGAS_NAV_ITEMS, active) + "</nav>" +
      '<div class="ml-auto flex items-center gap-1.5">' + themeButton() +
      '<button type="button" data-ms-logout title="Keluar" aria-label="Keluar dari akun" class="' + GHOST_ICON + ' text-destructive">' + icon("log-out", 18) + "</button>" +
      "</div></div></header>"
    );
  }

  /* ============================ dock (dock.tsx) ============================ */
  function dock(tabs, groups, extras, active, ariaLabel, withLogout) {
    var insideGroup =
      groups.some(function (g) { return g.items.some(function (i) { return isCurrent(i.href, active); }); }) ||
      extras.some(function (i) { return isCurrent(i.href, active); });

    var tabsHtml = "";
    tabs.forEach(function (item) {
      var current = isCurrent(item.href, active);
      tabsHtml +=
        '<a href="' + route(item.href) + '"' + (current ? ' aria-current="page"' : "") +
        ' class="' + dockTabClass(current) + '">' + icon(ICON_MAP[item.icon] || "layout-dashboard", 20) +
        "<span>" + esc(item.label) + "</span></a>";
    });

    var groupHtml = "";
    groups.forEach(function (g) {
      groupHtml += '<div class="mb-4 last:mb-0"><p class="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-subtle-foreground">' +
        esc(g.label) + "</p><ul>";
      g.items.forEach(function (item) {
        var current = isCurrent(item.href, active);
        groupHtml += '<li><a href="' + route(item.href) + '"' + (current ? ' aria-current="page"' : "") +
          ' class="' + dockLinkClass(current) + '">' + icon(ICON_MAP[item.icon] || "layout-dashboard", 18) + esc(item.label) + "</a></li>";
      });
      groupHtml += "</ul></div>";
    });

    var extrasHtml = "";
    if (extras.length > 0) {
      extrasHtml = "<ul>";
      extras.forEach(function (item) {
        var current = isCurrent(item.href, active);
        extrasHtml += '<li><a href="' + route(item.href) + '"' + (current ? ' aria-current="page"' : "") +
          ' class="' + dockLinkClass(current) + '">' + icon(ICON_MAP[item.icon] || "layout-dashboard", 18) + esc(item.label) + "</a></li>";
      });
      extrasHtml += "</ul>";
    }

    var logoutHtml = withLogout
      ? '<button type="button" data-ms-logout class="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10">' +
        icon("log-out", 18) + "Keluar dari Akun</button>"
      : "";

    return (
      /* dock utama */
      '<nav aria-label="' + esc(ariaLabel) + '" class="fixed inset-x-0 bottom-4 z-50 mx-auto w-full max-w-md px-4 lg:hidden" ' +
      'style="padding-bottom:env(safe-area-inset-bottom)">' +
      '<div class="grid gap-1 rounded-xl border border-border bg-card p-1.5" style="grid-template-columns:repeat(' + (tabs.length + 1) + ',minmax(0,1fr))">' +
      tabsHtml +
      '<button type="button" data-ms-more aria-haspopup="dialog" aria-expanded="false" class="' + dockTabClass(insideGroup) + '">' +
      icon("layout-grid", 20) + "<span>Lainnya</span></button>" +
      "</div></nav>" +
      /* sheet "Menu lain" */
      '<div data-ms-overlay class="ms-overlay fixed inset-0 z-50 bg-black/40" hidden></div>' +
      '<div data-ms-sheet role="dialog" aria-label="Menu lain" class="ms-sheet fixed inset-x-0 bottom-0 z-50 w-full rounded-t-2xl bg-card text-card-foreground shadow-xl" hidden>' +
      '<div class="flex max-h-[80dvh] flex-col p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">' +
      '<div class="mb-4 flex items-start justify-between gap-3">' +
      '<div><h2 class="text-base font-bold text-foreground">Menu lain</h2>' +
      '<p class="text-xs text-muted-foreground">Semua halaman di luar 4 tab utama.</p></div>' +
      '<button type="button" data-ms-sheet-close aria-label="Tutup menu" class="' + GHOST_ICON + '">' + icon("x", 20) + "</button>" +
      "</div>" +
      '<div class="-mx-1 flex-1 overflow-y-auto">' + groupHtml + extrasHtml + logoutHtml + "</div>" +
      "</div></div>"
    );
  }

  /* ================================ toast ================================ */
  var toastTimer = [];
  function toast(message, type) {
    type = type || "info";
    var host = document.querySelector("[data-ms-toasts]");
    if (!host) {
      host = document.createElement("div");
      host.setAttribute("data-ms-toasts", "");
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      host.setAttribute("aria-atomic", "true");
      host.className = "pointer-events-none fixed bottom-20 right-4 z-[100] flex flex-col gap-2 sm:bottom-4";
      document.body.appendChild(host);
    }
    var tones = {
      success: "border-success-wash bg-success-wash text-success",
      error: "border-destructive-wash bg-destructive-wash text-destructive-foreground",
      info: "border-border bg-accent text-accent-foreground",
    };
    var icons = { success: "check-circle-2", error: "alert-circle", info: "info" };
    var el = document.createElement("div");
    el.className =
      "ms-toast pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm " +
      (tones[type] || tones.info);
    el.innerHTML = icon(icons[type] || "info", 18) + "<span></span>";
    el.lastChild.textContent = message;
    host.appendChild(el);
    var t = setTimeout(function () {
      el.classList.add("is-out");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }, 3500);
    toastTimer.push(t);
  }

  function logout() {
    toast("Berhasil keluar", "success");
    setTimeout(function () { window.location.href = "login.html"; }, 600);
  }

  /* ======================= request (mock statis) =======================
     Halaman bisa mendefinisikan window.MS_MOCKS = { "/api/x": dataOrFn }.
     Tanpa mock, request ditolak dengan pesan yang jelas (lihat README). */
  function request(url, init) {
    void init;
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        var mocks = window.MS_MOCKS || {};
        if (Object.prototype.hasOwnProperty.call(mocks, url)) {
          try {
            var value = mocks[url];
            resolve(typeof value === "function" ? value() : value);
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        } else {
          reject(new Error("Endpoint " + url + " tidak tersedia pada pratinjau statis (lihat ui-codes/README.md)."));
        }
      }, 150);
    });
  }

  /* ============================ sheet "Lainnya" ============================ */
  function openSheet() {
    var overlay = document.querySelector("[data-ms-overlay]");
    var sheet = document.querySelector("[data-ms-sheet]");
    var more = document.querySelector("[data-ms-more]");
    if (!sheet || !overlay) return;
    overlay.hidden = false;
    sheet.hidden = false;
    /* paksa reflow dulu supaya transisi berjalan (elemen baru saja keluar dari display:none) */
    void sheet.offsetHeight;
    overlay.classList.add("is-open");
    sheet.classList.add("is-open");
    document.body.style.overflow = "hidden";
    if (more) more.setAttribute("aria-expanded", "true");
  }
  function closeSheet() {
    var overlay = document.querySelector("[data-ms-overlay]");
    var sheet = document.querySelector("[data-ms-sheet]");
    var more = document.querySelector("[data-ms-more]");
    if (!sheet || sheet.hidden) return;
    if (overlay) overlay.classList.remove("is-open");
    sheet.classList.remove("is-open");
    document.body.style.overflow = "";
    if (more) more.setAttribute("aria-expanded", "false");
    setTimeout(function () {
      if (overlay) overlay.hidden = true;
      sheet.hidden = true;
    }, 300);
  }

  /* ============================ tema (gelap/terang) ============================ */
  var THEME_KEY = "myshift-theme";
  function syncThemeIcon() {
    var dark = document.documentElement.classList.contains("dark");
    var sun = document.querySelector("[data-ms-theme-sun]");
    var moon = document.querySelector("[data-ms-theme-moon]");
    if (sun) sun.hidden = !dark;
    if (moon) moon.hidden = dark;
  }
  function toggleTheme() {
    var next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch (e) { /* storage diblokir */ }
    syncThemeIcon();
  }

  /* ================================ boot ================================ */
  function boot() {
    var body = document.body;
    var shell = body.getAttribute("data-shell") || "none";
    var active = body.getAttribute("data-active") || "";

    if (shell === "admin" || shell === "petugas") {
      var root = document.getElementById("ms-root");
      var main = document.getElementById("main");
      if (root) {
        var rootClasses =
          shell === "admin"
            ? ["flex", "min-h-[100dvh]", "flex-col", "bg-background"]
            : ["min-h-[100dvh]", "bg-background", "pb-28", "text-foreground", "lg:pb-0"];
        rootClasses.forEach(function (c) { root.classList.add(c); });
        root.insertAdjacentHTML(
          "afterbegin",
          shell === "admin" ? adminHeader(active) : petugasHeader(active)
        );
      }
      if (main) {
        var mainClasses =
          shell === "admin"
            ? ["ms-enter", "mx-auto", "w-full", "max-w-[1200px]", "flex-1", "px-4", "pt-5", "pb-28", "sm:px-6", "lg:px-8", "lg:py-8"]
            : ["ms-enter", "mx-auto", "w-full", "max-w-[1200px]", "px-4", "py-5", "sm:px-6", "lg:px-8", "lg:py-8"];
        mainClasses.forEach(function (c) { main.classList.add(c); });
      }
      if (root) {
        root.insertAdjacentHTML(
          "beforeend",
          shell === "admin"
            ? dock(ADMIN_DOCK_TABS, groupsWithoutTabs(groupsForRole(ADMIN_NAV_GROUPS, true), ADMIN_DOCK_TABS), ADMIN_DOCK_EXTRAS, active, "Navigasi utama (mobile)", false)
            : dock(PETUGAS_DOCK_TABS, [], PETUGAS_DOCK_EXTRAS, active, "Navigasi petugas (mobile)", true)
        );
      }
    }

    syncThemeIcon();

    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest("[data-ms-theme]")) { toggleTheme(); return; }
      if (t.closest("[data-ms-logout]")) { closeSheet(); logout(); return; }
      if (t.closest("[data-ms-more]")) { openSheet(); return; }
      if (t.closest("[data-ms-sheet-close]") || t.closest("[data-ms-overlay]")) { closeSheet(); return; }
      var details = t.closest("[data-ms-details] a");
      if (details) {
        var d = document.querySelector("[data-ms-details]");
        if (d) d.removeAttribute("open");
      }
      /* klik di luar menu Pengelolaan menutupnya (mirip perilaku nav React). */
      var menu = document.querySelector("[data-ms-details][open]");
      if (menu && !t.closest("[data-ms-details]")) menu.removeAttribute("open");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSheet();
    });
  }

  window.Myshift = {
    route: route,
    icon: icon,
    toast: toast,
    request: request,
    logout: logout,
    openSheet: openSheet,
    closeSheet: closeSheet,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
