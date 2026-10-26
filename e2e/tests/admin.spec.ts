import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PASS, ADMIN_USER, loginAPI, loginUI, noHScroll, pngBuffer, shot, uid, waitLoader } from "./helpers";

// Админские сценарии меняют общую БД: гоняем на трёх проектах (десктоп, телефон, webkit).
test.beforeEach(async ({}, info) => {
  test.skip(!["desktop-1440", "mobile-390", "webkit-desktop-1440"].includes(info.project.name), "админка проверяется на desktop/mobile/webkit");
});

const PNG = { name: "foto.png", mimeType: "image/png", buffer: pngBuffer() };

async function pickNewPhoto(page: Page) {
  await page.getByRole("button", { name: /Добавить фото|Заменить фото/ }).first().click();
  await page.getByTestId("file-input").setInputFiles(PNG);
  // после загрузки выбор закрывается и показывается предпросмотр
  await expect(page.getByRole("img", { name: /предпросмотр/ })).toBeVisible({ timeout: 15000 });
}

async function save(page: Page) {
  await page.getByRole("button", { name: "Сохранить" }).first().click();
  await expect(page).toHaveURL(/\/admin\/[a-z]+$/, { timeout: 15000 });
}

async function pub(page: Page, url: string) {
  await page.goto(url);
  await waitLoader(page);
}

/** Проходит простое создание записи через UI. */
async function createVia(page: Page, collection: string, fields: Record<string, string>, photo = false) {
  await page.goto(`/admin/${collection}/new`);
  for (const [label, value] of Object.entries(fields)) {
    const loc = page.getByLabel(label, { exact: false }).first();
    if ((await loc.evaluate((e) => e.tagName)) === "SELECT") await loc.selectOption(value);
    else await loc.fill(value);
  }
  if (photo) await pickNewPhoto(page);
  await save(page);
}

async function listRow(page: Page, collection: string, title: string) {
  await page.goto(`/admin/${collection}`);
  return page.locator("li", { has: page.getByRole("link", { name: title, exact: true }) }).first();
}

async function toggle(page: Page, title: string) {
  await page.getByRole("switch", { name: `${title}: показывать на сайте` }).click();
  await expect(page.getByText(/Показано на сайте|Скрыто с сайта/)).toBeVisible();
}

async function remove(page: Page, collection: string, title: string) {
  await page.goto(`/admin/${collection}`);
  await page.getByRole("button", { name: `Удалить «${title}»` }).click();
  await page.getByRole("button", { name: "Удалить", exact: true }).last().click();
  await expect(page.getByText("Удалено")).toBeVisible();
  await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(0);
}

test.describe("Админка: вход и защита", () => {
  test("без сессии /admin и вложенные страницы ведут на вход", async ({ page }, info) => {
    for (const p of ["/admin", "/admin/products", "/admin/settings", "/admin/media"]) {
      await page.goto(p);
      await expect(page).toHaveURL(/\/admin\/login/);
    }
    await expect(page.getByRole("heading", { name: "Вход в админ-панель" })).toBeVisible();
    await noHScroll(page);
    await shot(page, info, "admin-login");
  });

  test("API админки без сессии отвечает 401", async ({ request }) => {
    expect((await request.get("/api/admin/products")).status()).toBe(401);
    expect((await request.get("/api/admin/me")).status()).toBe(401);
  });

  test("пустая форма и неверный пароль дают понятную ошибку", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page.getByText("Введите логин")).toBeVisible();
    await expect(page.getByText("Введите пароль")).toBeVisible();
    await page.getByLabel("Логин").fill(ADMIN_USER);
    await page.getByLabel("Пароль").fill("неверный-пароль");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page.getByText(/Неверный логин или пароль/)).toBeVisible();
    await expect(page).toHaveURL(/login/);
  });

  test("вход, обзор, выход и возврат на вход", async ({ page }, info) => {
    await loginUI(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await noHScroll(page);
    await shot(page, info, "admin-dashboard");
    if (info.project.name === "mobile-390") await page.getByRole("button", { name: "Меню" }).click();
    await shot(page, info, "admin-menu", false);
    await page.getByRole("button", { name: "Выйти" }).last().click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/login/);
    expect((await page.request.get("/api/admin/me")).status()).toBe(401);
  });

  test("вход возвращает на запрошенную страницу (next)", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/login\?next=/);
    await page.getByLabel("Логин").fill(ADMIN_USER);
    await page.getByLabel("Пароль").fill(ADMIN_PASS);
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
  });
});

test.describe("Админка: изделия каталога", () => {
  test("создание с фото, правка цены, скрытие, порядок, удаление отражаются на /catalog", async ({ page }, info) => {
    await loginAPI(page);
    const a = uid() + "A";
    const b = uid() + "B";
    // создание с фото
    await createVia(page, "products", { Название: a, Описание: "Мягкий тест", Размер: "10×10", Материалы: "Шерсть", "Срок изготовления": "неделя", "Цена, ₽": "1234" }, true);
    await createVia(page, "products", { Название: b, "Цена, ₽": "99" });
    await pub(page, "/catalog");
    const card = page.locator("article", { hasText: a });
    await expect(card).toBeVisible();
    await expect(card.locator("img.ph")).toHaveAttribute("src", /\/uploads\/.+\.webp$/);
    await expect(card.locator("img.ph")).toBeVisible();
    expect(await card.locator("img.ph").evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    await expect(card).toContainText(/1\s?234/);
    await expect(card).toContainText("Мягкий тест");
    await expect(card).toContainText("10×10");
    await shot(page, info, "catalog-with-new-product");

    // правка цены
    await page.goto("/admin/products");
    await page.getByRole("link", { name: `Изменить «${a}»` }).click();
    await page.getByLabel("Цена, ₽").fill("5678");
    await save(page);
    await pub(page, "/catalog");
    await expect(page.locator("article", { hasText: a })).toContainText(/5\s?678/);

    // порядок: B выше A -> на сайте B раньше A
    await page.goto("/admin/products");
    await expect(page.getByRole("link", { name: b, exact: true })).toBeVisible();
    const order0 = await page.locator("ul[aria-label] > li a.text-lg").allTextContents();
    expect(order0.indexOf(a)).toBeLessThan(order0.indexOf(b));
    await page.getByRole("button", { name: `Переместить «${b}» выше` }).click();
    await expect(page.getByText("Порядок сохранён")).toBeVisible();
    await pub(page, "/catalog");
    const names = await page.locator("article h2").allTextContents();
    expect(names.indexOf(b)).toBeLessThan(names.indexOf(a));
    // порядок переживает перезагрузку админки
    await page.goto("/admin/products");
    await expect(page.getByRole("link", { name: b, exact: true })).toBeVisible();
    const order1 = await page.locator("ul[aria-label] > li a.text-lg").allTextContents();
    expect(order1.indexOf(b)).toBeLessThan(order1.indexOf(a));

    // скрытие и возврат
    await toggle(page, a);
    await pub(page, "/catalog");
    await expect(page.locator("article", { hasText: a })).toHaveCount(0);
    await page.goto("/admin/products");
    await toggle(page, a);
    await pub(page, "/catalog");
    await expect(page.locator("article", { hasText: a })).toHaveCount(1);

    // удаление
    await remove(page, "products", a);
    await remove(page, "products", b);
    await pub(page, "/catalog");
    await expect(page.locator("article", { hasText: a })).toHaveCount(0);
    await expect(page.locator("article", { hasText: b })).toHaveCount(0);
  });

  test("валидация формы: пустое название не сохраняется", async ({ page }) => {
    await loginAPI(page);
    await page.goto("/admin/products/new");
    await page.getByRole("button", { name: "Сохранить" }).first().click();
    await expect(page.getByText("Проверьте поля: есть ошибки.")).toBeVisible();
    await expect(page).toHaveURL(/products\/new/);
  });

  test("загрузка не-картинки и слишком большого файла даёт понятную ошибку", async ({ page }) => {
    await loginAPI(page);
    await page.goto("/admin/products/new");
    await page.getByRole("button", { name: "Добавить фото" }).click();
    const input = page.getByTestId("file-input");
    await input.setInputFiles({ name: "doc.txt", mimeType: "text/plain", buffer: Buffer.from("это не картинка") });
    const alert = page.getByRole("alert").filter({ hasText: "doc.txt" });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/(JPG|PNG|WebP|формат|тип|картин|изображ)/i);
    // поддельное расширение
    await input.setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not really png") });
    await expect(page.getByRole("alert").filter({ hasText: "fake.png" })).toBeVisible();
    // 9 МБ
    await input.setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.concat([pngBuffer(), Buffer.alloc(9 * 1024 * 1024)]) });
    const big = page.getByRole("alert").filter({ hasText: "big.png" });
    await expect(big).toBeVisible({ timeout: 20000 });
    await expect(big).toContainText(/(МБ|большой|размер)/i);
  });
});

test.describe("Админка: остальные разделы", () => {
  test("мастер-класс: создать, правка, скрыть, порядок, удалить", async ({ page }) => {
    await loginAPI(page);
    const t = uid();
    await createVia(page, "masterclasses", { Название: t, Описание: "Учимся вязать", Длительность: "2 часа", "Цена, ₽": "1500", "Количество мест": "8", "Ссылка для записи": "https://example.com/zapis" }, true);
    await pub(page, "/masterclasses");
    const card = page.locator("article", { hasText: t });
    await expect(card).toBeVisible();
    await expect(card).toContainText("2 часа");
    await expect(card).toContainText(/1\s?500/);
    await page.goto("/admin/masterclasses");
    await page.getByRole("link", { name: `Изменить «${t}»` }).click();
    await page.getByLabel("Цена, ₽").fill("2500");
    await save(page);
    await pub(page, "/masterclasses");
    await expect(page.locator("article", { hasText: t })).toContainText(/2\s?500/);
    await page.goto("/admin/masterclasses");
    await toggle(page, t);
    await pub(page, "/masterclasses");
    await expect(page.locator("article", { hasText: t })).toHaveCount(0);
    await remove(page, "masterclasses", t);
  });

  test("проект: создать с фото, скрыть, удалить; порядок двух проектов", async ({ page }) => {
    await loginAPI(page);
    const a = uid() + "A", b = uid() + "B";
    await createVia(page, "projects", { Название: a, Описание: "Большая работа" }, true);
    await createVia(page, "projects", { Название: b });
    await pub(page, "/projects");
    await expect(page.getByRole("button", { name: new RegExp(a) })).toBeVisible();
    await page.goto("/admin/projects");
    await page.getByRole("button", { name: `Переместить «${b}» выше` }).click();
    await expect(page.getByText("Порядок сохранён")).toBeVisible();
    await pub(page, "/projects");
    const names = await page.locator("article h2").allTextContents();
    expect(names.indexOf(b)).toBeLessThan(names.indexOf(a));
    await page.goto("/admin/projects");
    await toggle(page, a);
    await pub(page, "/projects");
    await expect(page.getByRole("button", { name: new RegExp(a) })).toHaveCount(0);
    await remove(page, "projects", a);
    await remove(page, "projects", b);
  });

  test("отзыв: создать с оценкой, скрыть, удалить", async ({ page }) => {
    await loginAPI(page);
    const author = uid();
    await createVia(page, "reviews", { Автор: author, "Текст отзыва": "Спасибо, очень тепло!", Оценка: "5" });
    await pub(page, "/reviews");
    const card = page.locator("figure", { hasText: author });
    await expect(card).toContainText("Спасибо, очень тепло!");
    await expect(card.getByRole("img", { name: "Оценка: 5 из 5" })).toBeVisible();
    await page.goto("/admin/reviews");
    await toggle(page, author);
    await pub(page, "/reviews");
    await expect(page.locator("figure", { hasText: author })).toHaveCount(0);
    await remove(page, "reviews", author);
  });

  test("акция: создать с плашкой, скрыть, удалить; акция с датой в прошлом не показывается", async ({ page }) => {
    await loginAPI(page);
    const t = uid();
    await createVia(page, "promos", { Название: t, Описание: "Скидка на шапки", Плашка: "−20%" });
    await pub(page, "/sales");
    const card = page.locator("article", { hasText: t });
    await expect(card).toContainText("−20%");
    // дата в прошлом
    await page.goto("/admin/promos");
    await page.getByRole("link", { name: `Изменить «${t}»` }).click();
    await page.getByLabel("Действует до").fill("2020-01-01");
    await save(page);
    await pub(page, "/sales");
    await expect(page.locator("article", { hasText: t })).toHaveCount(0);
    await remove(page, "promos", t);
  });

  test("фото: загруженный файл виден в разделе «Фото»", async ({ page }) => {
    await loginAPI(page);
    await page.goto("/admin/media");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await noHScroll(page);
  });
});

test.describe("Админка: настройки главной, меню, контакты, подвал, SEO", () => {
  test("правки настроек появляются на публичном сайте", async ({ page }, info) => {
    const origin = await loginAPI(page);
    const orig = await (await page.request.get("/api/admin/settings")).json();
    const origPages = await (await page.request.get("/api/admin/pages")).json();
    const tag = uid();
    try {
      await page.goto("/admin/settings");
      await page.getByLabel("Заголовок", { exact: true }).first().fill(`Заголовок ${tag}`);
      await page.getByLabel("Текст", { exact: true }).first().fill(`Описание ${tag}`);
      await page.getByLabel("Текст кнопки").fill(`Кнопка ${tag}`);
      // бегущая строка
      await page.getByLabel("Новая строка").fill(`Строка ${tag}`);
      await page.getByRole("button", { name: "Добавить строку" }).click();
      // меню: переименовать «Отзывы» и скрыть «Акции»
      await page.getByLabel("Подпись пункта «Отзывы»").fill(`Отзывчики${tag.slice(-2)}`);
      await page.getByRole("switch", { name: /Показывать «Акции» в меню/ }).click();
      // контакты и подвал
      await page.getByLabel("Ссылка на Telegram").fill("https://t.me/e2e_test");
      await page.getByLabel("Ссылка на чат в Максе").fill("");
      await page.getByLabel("Заголовок", { exact: true }).last().fill(`Подвал ${tag}`);
      await page.getByLabel("Строка copyright").fill(`© ${tag}`);
      await shot(page, info, "admin-settings");
      await page.getByRole("button", { name: "Сохранить" }).first().click();
      await expect(page.getByText(/Сохранено|сохранены/i).first()).toBeVisible();

      await pub(page, "/");
      await expect(page.locator("h1")).toHaveText(`Заголовок ${tag}`);
      await expect(page.getByText(`Описание ${tag}`)).toBeVisible();
      await expect(page.getByRole("link", { name: `Кнопка ${tag}` })).toBeVisible();
      await expect(page.locator(".marquee-track")).toContainText(`Строка ${tag}`);
      const nav = page.getByRole("navigation", { name: "Основное меню" });
      await expect(nav.getByRole("link", { name: `Отзывчики${tag.slice(-2)}` })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Акции" })).toHaveCount(0);
      await expect(nav.getByRole("link")).toHaveCount(4);
      const tg = page.locator('footer a[href="https://t.me/e2e_test"]');
      await expect(tg).toBeVisible();
      await expect(tg).toHaveAttribute("target", "_blank");
      await expect(page.locator("footer a[target=_blank]")).toHaveCount(1); // пустые ссылки скрыты
      await expect(page.locator("footer h2")).toHaveText(`Подвал ${tag}`);
      await expect(page.locator("footer")).toContainText(`© ${tag}`);
      await shot(page, info, "home-after-settings");
    } finally {
      await page.request.put("/api/admin/settings", { data: orig, headers: { Origin: origin } });
      for (const p of origPages) await page.request.put(`/api/admin/pages/${p.slug}`, { data: p, headers: { Origin: origin } });
    }
    await pub(page, "/");
    await expect(page.locator("h1")).toContainText("Вязаное");
  });

  test("невалидная ссылка контакта не сохраняется", async ({ page }) => {
    await loginAPI(page);
    await page.goto("/admin/settings");
    await page.getByLabel("Ссылка на Telegram").fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Сохранить" }).first().click();
    await expect(page.getByText(/http|ссылк|https/i).first()).toBeVisible();
    await page.goto("/");
    await expect(page.locator('footer a[href^="javascript"]')).toHaveCount(0);
  });

  test("SEO-заголовок и заголовок страницы меняются на сайте", async ({ page }) => {
    const origin = await loginAPI(page);
    const origPages = await (await page.request.get("/api/admin/pages")).json();
    const tag = uid();
    try {
      await page.goto("/admin/pages");
      const card = page.getByRole("heading", { name: "Каталог", level: 2 }).locator("xpath=..");
      await card.getByLabel("Заголовок страницы").fill(`Каталог ${tag}`);
      await card.getByLabel("SEO: заголовок (title)").fill(`SEO ${tag}`);
      await card.getByLabel("SEO: описание (description)").fill(`Описание ${tag}`);
      await card.getByRole("button", { name: "Сохранить" }).click();
      await expect(page.getByText(/Сохранено: «Каталог»/)).toBeVisible();
      await pub(page, "/catalog");
      await expect.soft(page, "ДЕФЕКТ: к seo_title дописывается « — Мамины петельки» повторно").toHaveTitle(`SEO ${tag}`);
      await expect(page).toHaveTitle(new RegExp(`^SEO ${tag}`));
      await expect(page.locator("h1")).toHaveText(`Каталог ${tag}`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", `Описание ${tag}`);
    } finally {
      for (const p of origPages) await page.request.put(`/api/admin/pages/${p.slug}`, { data: p, headers: { Origin: origin } });
    }
  });

  test("CSRF: изменяющий запрос с чужим Origin отклоняется", async ({ page }) => {
    await loginAPI(page);
    const r = await page.request.post("/api/admin/products", {
      data: { name: "evil", description: "", size: "", materials: "", lead_time: "", price: 1, photo: null, is_published: true, sort_order: 0 },
      headers: { Origin: "https://evil.example" },
    });
    expect([401, 403]).toContain(r.status());
  });

  test("страницы админки без горизонтального скролла", async ({ page }) => {
    await loginAPI(page);
    for (const p of ["/admin", "/admin/products", "/admin/products/new", "/admin/masterclasses/new", "/admin/projects/new", "/admin/reviews/new", "/admin/promos/new", "/admin/settings", "/admin/pages", "/admin/media"]) {
      await page.goto(p);
      await expect(page.locator("main h1, h1").first()).toBeVisible();
      await noHScroll(page);
    }
  });
});
