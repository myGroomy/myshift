import { test, expect } from "@playwright/test";

// E2E smoke tests for critical user journeys.
// These run against the dev server (playwright.config.ts webServer).

test.describe("Landing page", () => {
  test("shows landing page to unauthenticated users", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/MYSHIFT|Mochikin/);
  });

  test("redirects to /login when accessing protected page", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Login page", () => {
  test("shows login form", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator("input#username")).toBeVisible();
    // PIN is 6 separate digit inputs
    await expect(page.locator("input[aria-label='Digit 1']")).toBeVisible();
    await expect(page.locator("input[aria-label='Digit 6']")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        username: "invaliduser",
        pin: "000000",
      });
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "INVALID_CREDENTIALS", message: "Username atau PIN salah" },
        }),
      });
    });
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill("input#username", "invaliduser");
    for (let i = 1; i <= 6; i++) {
      await page.fill(`input[aria-label='Digit ${i}']`, "0");
    }
    await page.click("button[type='submit']");
    await expect(page.locator("form [role='alert']")).toHaveText("Username atau PIN salah");
  });

  test("redirects to /login with next param after failed auth", async ({ page }) => {
    await page.goto("/jadwal", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});

test.describe("Public report page", () => {
  test("shows public report page without auth", async ({ page }) => {
    const response = await page.goto("/laporan-publik/some-token", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/laporan-publik\/some-token/);
  });
});
