import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginAPI, waitLoader } from "./helpers";

const OUT = path.resolve(__dirname, "../axe-results.json");
const results: Record<string, unknown> = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};

async function axe(page: import("@playwright/test").Page, key: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).analyze();
  results[key] = r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes[0]?.target, summary: v.nodes[0]?.failureSummary?.slice(0, 300) }));
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  return r.violations;
}

const SIZES = ["desktop-1440", "mobile-390"];
test.beforeEach(async ({}, info) => test.skip(!SIZES.includes(info.project.name), "axe: desktop и mobile"));

for (const [name, url] of [["главная", "/"], ["каталог", "/catalog"], ["проекты (пусто)", "/projects"], ["вход в админку", "/admin/login"]] as const) {
  test(`axe: ${name} без нарушений серьёзного/критического уровня`, async ({ page }, info) => {
    await page.goto(url);
    await waitLoader(page);
    await page.waitForTimeout(1200);
    const v = await axe(page, `${name} @${info.project.name}`);
    const bad = v.filter((x) => x.impact === "serious" || x.impact === "critical");
    expect(bad.map((x) => `${x.id}: ${x.help} (${x.nodes.length})`)).toEqual([]);
    expect.soft(v.map((x) => `${x.id}(${x.impact})`), "прочие нарушения (moderate/minor)").toEqual([]);
  });
}

test("axe: панель админки (обзор, список, форма)", async ({ page }, info) => {
  await loginAPI(page);
  for (const u of ["/admin", "/admin/products", "/admin/products/new", "/admin/settings"]) {
    await page.goto(u);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForTimeout(500);
    const v = await axe(page, `админка ${u} @${info.project.name}`);
    expect(v.filter((x) => x.impact === "serious" || x.impact === "critical").map((x) => `${u} ${x.id} (${x.nodes.length})`)).toEqual([]);
  }
});

test("клавиатура: Tab проходит по меню, фокус виден, Enter открывает страницу", async ({ page }) => {
  await page.goto("/");
  await waitLoader(page);
  const names: string[] = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement;
      const cs = getComputedStyle(e);
      const after = getComputedStyle(e, "::after");
      return {
        text: (e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 40),
        outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0,
        shadow: cs.boxShadow !== "none",
        afterVisible: after.content !== "none" && after.content !== "normal",
        tag: e.tagName,
      };
    });
    if (info.tag === "BODY") break;
    names.push(info.text);
    expect(info.outline || info.shadow || info.afterVisible, `у «${info.text}» нет видимого фокуса`).toBeTruthy();
  }
  for (const n of ["Каталог", "Мастер-классы", "Проекты", "Отзывы", "Акции"]) expect(names.join("|")).toContain(n);
  // Enter на пункте меню
  await page.goto("/");
  await waitLoader(page);
  await page.getByRole("navigation", { name: "Основное меню" }).getByRole("link", { name: "Отзывы" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/reviews$/);
});

test("клавиатура: размер области нажатия пунктов меню и сердечка не меньше 44px", async ({ page }) => {
  await page.goto("/catalog");
  await waitLoader(page);
  for (const l of await page.getByRole("navigation", { name: "Основное меню" }).getByRole("link").all()) {
    const b = (await l.boundingBox())!;
    expect(b.height, "высота пункта меню").toBeGreaterThanOrEqual(43.5);
  }
  const hb = (await page.getByRole("button", { name: /Сохранить:/ }).first().boundingBox())!;
  expect(hb.width).toBeGreaterThanOrEqual(43.5);
});
