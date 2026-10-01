const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000/login...');
  await page.goto('http://localhost:3000/login');
  await page.screenshot({ path: 'audit-ui/screenshots/petugas-01-login-mobile.png' });
  console.log('Login screenshot captured.');

  // Check inputs and buttons
  const content = await page.content();
  console.log('Page title/headers:', await page.title());
  
  await browser.close();
})();
