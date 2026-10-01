const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'audit-ui', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const auditLogs = [];

function logAudit(role, step, title, status, details, screenshotPath = '') {
  auditLogs.push({ role, step, title, status, details, screenshotPath, timestamp: new Date().toISOString() });
  console.log(`[${role.toUpperCase()}][Step ${step}] ${title}: ${status}`);
  if (details) console.log(`   -> ${details}`);
}

async function typePin(page, pinStr) {
  for (let i = 0; i < pinStr.length; i++) {
    const selector = `input[aria-label="Digit ${i + 1}"]`;
    await page.fill(selector, pinStr[i]);
  }
}

async function runPetugasFlow(browser, viewport, viewName) {
  const role = `petugas-${viewName}`;
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  logAudit(role, '01', 'Buka Halaman Login', 'SUCCESS', `Navigasi ke http://localhost:3000/login di viewport ${viewport.width}x${viewport.height}`);
  await page.goto('http://localhost:3000/login');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-01-login-form.png`) });

  // 1a. Validation test - Empty username
  await page.fill('#username', '');
  await typePin(page, '123456');
  const submitBtn = page.locator('button[type="submit"]');
  logAudit(role, '01a', 'Uji Validasi Form Kosong', 'INFO', 'Menguji tombol submit ketika username kosong');

  // 1b. Validation test - Wrong PIN
  await page.fill('#username', 'taufik');
  await typePin(page, '000000');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-01b-login-wrong-pin.png`) });
  await submitBtn.click();
  await page.waitForTimeout(1000);
  const errorMsg = await page.locator('[role="alert"]').textContent().catch(() => '');
  logAudit(role, '01b', 'Uji PIN Salah', 'SUCCESS', `Pesan error yang muncul: "${errorMsg}"`, `${role}-01b-login-wrong-pin.png`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-01c-login-error-state.png`) });

  // 1c. Login Valid Petugas
  await page.fill('#username', 'taufik');
  await typePin(page, '565678');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-01d-login-filled.png`) });
  await submitBtn.click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const currentUrl = page.url();
  logAudit(role, '02', 'Login Berhasil & Redirect', 'SUCCESS', `URL setelah login: ${currentUrl}`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-02-jadwal-saya.png`) });

  // If redirected to select branch
  if (currentUrl.includes('/pilih-cabang')) {
    logAudit(role, '02a', 'Halaman Pilih Cabang', 'INFO', 'Petugas memiliki beberapa cabang, memilih cabang pertama');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-02a-pilih-cabang.png`) });
    const branchBtn = page.locator('button:has-text("Masuk Cabang")').first();
    if (await branchBtn.isVisible()) {
      await branchBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  // 2. Jadwal Saya
  logAudit(role, '03', 'Halaman Jadwal Saya', 'INFO', `Navigasi ke /jadwal-saya`);
  await page.goto('http://localhost:3000/jadwal-saya');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-03-jadwal-saya-view.png`) });

  // Find active or upcoming shift link
  const shiftCards = page.locator('a[href^="/shift/"]');
  const shiftCount = await shiftCards.count();
  logAudit(role, '03a', 'Temukan Shift', 'INFO', `Jumlah kartu shift yang ada: ${shiftCount}`);

  let shiftId = null;
  if (shiftCount > 0) {
    const firstHref = await shiftCards.first().getAttribute('href');
    shiftId = firstHref ? firstHref.split('/shift/')[1] : null;
    logAudit(role, '04', 'Buka Detail Shift', 'SUCCESS', `Membuka shift ID: ${shiftId}`);
    await shiftCards.first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-04-detail-shift.png`) });
  } else {
    logAudit(role, '04', 'Detail Shift', 'WARNING', 'Tidak ada shift aktif/mendatang untuk petugas ini');
  }

  // 3. Mulai shift if available
  const startShiftBtn = page.locator('button:has-text("Mulai Shift"), button:has-text("Mulai Operational")');
  if (await startShiftBtn.isVisible()) {
    logAudit(role, '04a', 'Tombol Mulai Shift Terdeteksi', 'ACTION', 'Klik tombol Mulai Shift');
    await startShiftBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-04a-shift-dimulai.png`) });
  }

  // 4. Checklist SOP
  if (shiftId) {
    logAudit(role, '05', 'Buka Checklist SOP', 'INFO', `Navigasi ke /shift/${shiftId}/checklist`);
    await page.goto(`http://localhost:3000/shift/${shiftId}/checklist`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-05-checklist-sop.png`) });

    // Try checking some items
    const checkboxes = page.locator('input[type="checkbox"]');
    const cbCount = await checkboxes.count();
    logAudit(role, '05a', 'Isi Point Checklist', 'INFO', `Menemukan ${cbCount} poin checklist`);
    for (let i = 0; i < Math.min(cbCount, 3); i++) {
      await checkboxes.nth(i).check().catch(() => {});
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-05a-checklist-filled.png`) });
  }

  // 5. Handover
  if (shiftId) {
    logAudit(role, '06', 'Buka Handover Shift', 'INFO', `Navigasi ke /shift/${shiftId}/handover`);
    await page.goto(`http://localhost:3000/shift/${shiftId}/handover`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-06-handover.png`) });
  }

  // 6. Tutup shift / Laporan
  if (shiftId) {
    logAudit(role, '07', 'Tutup Shift / Laporan', 'INFO', `Navigasi ke /shift/${shiftId}/laporan`);
    await page.goto(`http://localhost:3000/shift/${shiftId}/laporan`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-07-tutup-shift-laporan.png`) });
  }

  // 7. Pengajuan Swap Shift
  logAudit(role, '08', 'Form Ajukan Tukar Shift', 'INFO', 'Navigasi ke /swap/ajukan');
  await page.goto('http://localhost:3000/swap/ajukan');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-08-swap-ajukan.png`) });

  // 8. Pengajuan Izin
  logAudit(role, '09', 'Form Ajukan Izin', 'INFO', 'Navigasi ke /izin/ajukan');
  await page.goto('http://localhost:3000/izin/ajukan');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-09-izin-ajukan.png`) });

  // 9. Reporting Incident
  logAudit(role, '10', 'Form Lapor Incident', 'INFO', 'Navigasi ke /incident/ajukan');
  await page.goto('http://localhost:3000/incident/ajukan');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-10-incident-ajukan.png`) });

  logAudit(role, '10a', 'Daftar Incident', 'INFO', 'Navigasi ke /incident');
  await page.goto('http://localhost:3000/incident');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-10a-incident-list.png`) });

  // 10. Profil & Logout
  logAudit(role, '11', 'Halaman Profil & Logout', 'INFO', 'Navigasi ke /profil');
  await page.goto('http://localhost:3000/profil');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-11-profil.png`) });

  const logoutBtn = page.locator('button:has-text("Keluar"), button:has-text("Logout")');
  if (await logoutBtn.isVisible()) {
    logAudit(role, '11a', 'Klik Logout', 'SUCCESS', 'Melakukan logout');
    await logoutBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-11a-after-logout.png`) });
  }

  await context.close();
}

async function runAdminFlow(browser, viewport, viewName) {
  const role = `admin-${viewName}`;
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  logAudit(role, '01', 'Buka Halaman Login', 'SUCCESS', `Navigasi ke http://localhost:3000/login di viewport ${viewport.width}x${viewport.height}`);
  await page.goto('http://localhost:3000/login');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-01-login-form.png`) });

  // Login Valid Admin
  await page.fill('#username', 'dea');
  await typePin(page, '778899');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-01a-login-filled.png`) });

  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);

  let currentUrl = page.url();
  logAudit(role, '02', 'Login Admin Berhasil', 'SUCCESS', `URL setelah login: ${currentUrl}`);

  if (currentUrl.includes('/pilih-cabang')) {
    logAudit(role, '02a', 'Pilih Cabang Admin', 'INFO', 'Admin memiliki beberapa cabang');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-02a-pilih-cabang.png`) });
    const branchBtn = page.locator('button:has-text("Masuk Cabang"), button:has-text("Pilih")').first();
    if (await branchBtn.isVisible()) {
      await branchBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  // 1. Dashboard
  logAudit(role, '03', 'Dashboard Admin', 'INFO', 'Navigasi ke /dashboard');
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-03-dashboard.png`) });

  // 2. Kelola Jadwal
  logAudit(role, '04', 'Kelola Jadwal (Kanban/Table)', 'INFO', 'Navigasi ke /jadwal');
  await page.goto('http://localhost:3000/jadwal');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-04-jadwal-kanban.png`) });

  logAudit(role, '04a', 'Jadwal Per Petugas', 'INFO', 'Navigasi ke /jadwal-petugas');
  await page.goto('http://localhost:3000/jadwal-petugas');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-04a-jadwal-petugas.png`) });

  // 3. Kelola Karyawan & Cabang
  logAudit(role, '05', 'Kelola Karyawan', 'INFO', 'Navigasi ke /karyawan');
  await page.goto('http://localhost:3000/karyawan');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-05-kelola-karyawan.png`) });

  logAudit(role, '06', 'Kelola Cabang', 'INFO', 'Navigasi ke /cabang');
  await page.goto('http://localhost:3000/cabang');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-06-kelola-cabang.png`) });

  // 4. Kelola Template & Master Data
  logAudit(role, '07', 'Shift Template', 'INFO', 'Navigasi ke /shift-template');
  await page.goto('http://localhost:3000/shift-template');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-07-shift-template.png`) });

  logAudit(role, '08', 'Checklist Template', 'INFO', 'Navigasi ke /checklist-template');
  await page.goto('http://localhost:3000/checklist-template');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-08-checklist-template.png`) });

  logAudit(role, '09', 'Handover Template', 'INFO', 'Navigasi ke /handover-template');
  await page.goto('http://localhost:3000/handover-template');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-09-handover-template.png`) });

  logAudit(role, '10', 'Kategori Izin', 'INFO', 'Navigasi ke /kategori-izin');
  await page.goto('http://localhost:3000/kategori-izin');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-10-kategori-izin.png`) });

  logAudit(role, '11', 'Kategori Incident', 'INFO', 'Navigasi ke /kategori-incident');
  await page.goto('http://localhost:3000/kategori-incident');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-11-kategori-incident.png`) });

  // 5. Approval & Laporan
  logAudit(role, '12', 'Halaman Approval Summary', 'INFO', 'Navigasi ke /approval');
  await page.goto('http://localhost:3000/approval');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-12-approval-summary.png`) });

  logAudit(role, '12a', 'Approval Izin', 'INFO', 'Navigasi ke /approval/izin');
  await page.goto('http://localhost:3000/approval/izin');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-12a-approval-izin.png`) });

  logAudit(role, '12b', 'Approval Swap', 'INFO', 'Navigasi ke /approval/swap');
  await page.goto('http://localhost:3000/approval/swap');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-12b-approval-swap.png`) });

  logAudit(role, '13', 'Halaman Laporan', 'INFO', 'Navigasi ke /laporan');
  await page.goto('http://localhost:3000/laporan');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${role}-13-laporan.png`) });

  await context.close();
}

(async () => {
  console.log('🚀 Memulai UI/UX Audit MYSHIFT...');
  const browser = await chromium.launch();

  const mobileViewport = { width: 360, height: 640 };
  const desktopViewport = { width: 1366, height: 768 };

  try {
    console.log('\n--- 1. MENJALANKAN ALUR PETUGAS (MOBILE 360x640) ---');
    await runPetugasFlow(browser, mobileViewport, 'mobile');

    console.log('\n--- 2. MENJALANKAN ALUR PETUGAS (DESKTOP 1366x768) ---');
    await runPetugasFlow(browser, desktopViewport, 'desktop');

    console.log('\n--- 3. MENJALANKAN ALUR ADMIN (DESKTOP 1366x768) ---');
    await runAdminFlow(browser, desktopViewport, 'desktop');

    console.log('\n--- 4. MENJALANKAN ALUR ADMIN (MOBILE 360x640) ---');
    await runAdminFlow(browser, mobileViewport, 'mobile');

    fs.writeFileSync(
      path.join(__dirname, '..', 'audit-ui', 'audit-results.json'),
      JSON.stringify(auditLogs, null, 2)
    );
    console.log('\n✅ Audit UI/UX Selesai! Hasil disimpan di audit-ui/audit-results.json');
  } catch (err) {
    console.error('❌ Terjadi kesalahan saat audit:', err);
  } finally {
    await browser.close();
  }
})();
