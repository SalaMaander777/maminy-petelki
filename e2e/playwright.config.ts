import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

/**
 * Проекты по ширине экрана. Админские тесты меняют общую БД, поэтому workers = 1.
 * Запуск: E2E_BASE_URL=http://localhost:3100 E2E_ADMIN_USER=... E2E_ADMIN_PASSWORD=... npx playwright test
 */
export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "results.json" }]],
  use: { baseURL, trace: "off", screenshot: "off", locale: "ru-RU", timezoneId: "Europe/Moscow" },
  projects: [
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "tablet-768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: "mobile-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: "mobile-375", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true } },
    { name: "webkit-desktop-1440", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } } },
    { name: "webkit-iphone-390", use: { ...devices["iPhone 14"] } },
  ],
});
