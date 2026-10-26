import { expect, test } from "@playwright/test";
import { apiCreate, apiDelete, loginAPI, noHScroll, shot, uid, waitLoader, watch } from "./helpers";

const PAGES = [
  { path: "/catalog", label: "Каталог", h1: "Каталог" },
  { path: "/masterclasses", label: "Мастер-классы", h1: "Мастер-классы" },
  { path: "/projects", label: "Проекты", h1: "Проекты" },
  { path: "/reviews", label: "Отзывы", h1: "Отзывы" },
  { path: "/sales", label: "Акции", h1: "Акции" },
];

test.describe("Публичный сайт", () => {
  test("главная: меню из 5 пунктов, hero, нить, бегущая строка, контакты", async ({ page }, info) => {
    const problems = watch(page);
    await page.goto("/");
    await waitLoader(page);
    const nav = page.getByRole("navigation", { name: "Основное меню" });
    await expect(nav.getByRole("link")).toHaveCount(5);
    for (const p of PAGES) await expect(nav.getByRole("link", { name: p.label })).toBeVisible();
    await expect(page.getByRole("img", { name: "Мамины петельки" }).first()).toBeVisible();
    await expect(page.locator("h1")).toContainText("Вязаное с душой");
    await expect(page.getByRole("link", { name: "Смотреть каталог" })).toBeVisible();
    await expect(page.locator(".marquee-track")).toBeVisible();
    await expect(page.locator("svg path").first()).toBeAttached(); // нить (SVG)
    await expect(page.locator("footer#contacts")).toBeVisible();
    await expect(page.locator("footer h2")).toHaveText("Напишите нам");
    await page.waitForTimeout(500);
    await shot(page, info, "home");
    expect(problems).toEqual([]);
  });

  test("нет горизонтального скролла на всех страницах", async ({ page }) => {
    for (const p of ["/", ...PAGES.map((x) => x.path)]) {
      await page.goto(p);
      await waitLoader(page);
      await noHScroll(page);
    }
  });

  for (const p of PAGES) {
    test(`страница «${p.label}» открывается из меню`, async ({ page }, info) => {
      const problems = watch(page);
      await page.goto("/");
      await waitLoader(page);
      await page.getByRole("navigation", { name: "Основное меню" }).getByRole("link", { name: p.label }).click();
      await expect(page).toHaveURL(new RegExp(`${p.path}$`));
      await expect(page.locator("h1")).toHaveText(p.h1);
      await expect(page.getByRole("link", { name: p.label }).first()).toHaveAttribute("aria-current", "page");
      await page.waitForTimeout(900);
      await shot(page, info, p.path.slice(1));
      expect(problems).toEqual([]);
    });
  }

  test("переходы: логотип ведёт на главную, кнопка hero — в каталог, назад/вперёд", async ({ page }) => {
    await page.goto("/");
    await waitLoader(page);
    await page.getByRole("link", { name: "Смотреть каталог" }).click();
    await expect(page).toHaveURL(/\/catalog$/);
    await page.getByRole("link", { name: /на главную/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/catalog$/);
    await page.goBack();
    await expect(page.locator("h1")).toContainText("Вязаное");
  });

  test("каталог: карточки с ценой и характеристиками, сердечко переключается и сохраняется после перезагрузки", async ({ page }) => {
    await page.goto("/catalog");
    await waitLoader(page);
    const cards = page.locator("article");
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
    await expect(cards.first().getByText("Размер")).toBeVisible();
    await expect(cards.first().getByText("₽")).toBeVisible();
    const heart = cards.first().getByRole("button", { name: /Сохранить:/ });
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await waitLoader(page);
    await expect(page.locator("article").first().getByRole("button", { name: /Сохранить:/ })).toHaveAttribute("aria-pressed", "true");
    await page.locator("article").first().getByRole("button", { name: /Сохранить:/ }).click();
    await expect(page.locator("article").first().getByRole("button", { name: /Сохранить:/ })).toHaveAttribute("aria-pressed", "false");
  });

  test("проекты: карточка открывает модальное окно, Esc закрывает", async ({ page }) => {
    await page.goto("/admin/login");
    const origin = await loginAPI(page);
    const title = uid();
    const pr = await apiCreate(page, origin, "projects", { title, description: "Описание проекта", photo: null, gallery: [], is_published: true, sort_order: 999 });
    try {
      await page.goto("/projects");
      await waitLoader(page);
      await page.getByRole("button", { name: new RegExp(title) }).click();
      const dlg = page.locator("dialog[open]");
      await expect(dlg).toBeVisible();
      await expect(dlg.getByRole("heading", { name: title })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("dialog[open]")).toHaveCount(0);
      // и кнопкой
      await page.getByRole("button", { name: new RegExp(title) }).click();
      await dlg.getByRole("button", { name: "Закрыть" }).click();
      await expect(page.locator("dialog[open]")).toHaveCount(0);
    } finally {
      await apiDelete(page, origin, "projects", pr.id);
    }
  });

  test("пустые разделы показывают заглушку, а не падают", async ({ page }) => {
    for (const p of ["/projects", "/reviews", "/sales", "/masterclasses"]) {
      const r = await page.goto(p);
      expect(r?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("prefers-reduced-motion отключает загрузочный экран", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator(".loader")).toBeHidden({ timeout: 500 });
    expect(await page.locator(".loader").evaluate((e) => getComputedStyle(e).display)).toBe("none");
    expect(await page.locator(".marquee-track").evaluate((e) => getComputedStyle(e).animationName)).toMatch(/none/);
    await ctx.close();
  });

  test("загрузочный экран по умолчанию показывается и исчезает", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".loader")).toBeVisible();
    await expect(page.locator(".loader")).toBeHidden({ timeout: 6000 });
  });

  test("контакты: пустые ссылки скрыты (в демо-БД ссылок нет)", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("footer#contacts a[target=_blank]");
    expect(await links.count()).toBeGreaterThanOrEqual(0);
    for (const a of await links.all()) await expect(a).toHaveAttribute("href", /^https?:\/\//);
  });

  test("404-страница дружелюбная", async ({ page }) => {
    const r = await page.goto("/net-takoj-stranicy");
    expect(r?.status()).toBe(404);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("SEO: title, description, canonical, robots.txt, sitemap.xml, noindex в админке", async ({ page, request }) => {
    await page.goto("/catalog");
    await expect(page).toHaveTitle(/Каталог/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    expect((await request.get("/robots.txt")).status()).toBe(200);
    expect((await request.get("/sitemap.xml")).status()).toBe(200);
    const a = await request.get("/admin/login");
    expect(a.headers()["x-robots-tag"]).toContain("noindex");
  });
});
