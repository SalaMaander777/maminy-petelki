import { test } from "@playwright/test";
import { loginAPI, shot, waitLoader } from "./helpers";

// Визуальные снимки «как видит человек»: ждём анимации и прокручиваем страницу.
test.beforeEach(async ({}, info) => test.skip(!["desktop-1440", "mobile-390"].includes(info.project.name)));

async function settle(page: import("@playwright/test").Page) {
  await waitLoader(page);
  await page.waitForTimeout(1500);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 400) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
}

for (const [name, url] of [["home", "/"], ["catalog", "/catalog"], ["masterclasses", "/masterclasses"]] as const) {
  test(`снимок после анимаций: ${name}`, async ({ page }, info) => {
    await page.goto(url);
    await settle(page);
    await shot(page, info, `settled-${name}`);
  });
}

test("снимок админки: список и форма", async ({ page }, info) => {
  await loginAPI(page);
  for (const [n, u] of [["list", "/admin/products"], ["form", "/admin/products/new"], ["pages", "/admin/pages"]]) {
    await page.goto(u);
    await page.waitForTimeout(1200);
    await shot(page, info, `admin-${n}`);
  }
});
