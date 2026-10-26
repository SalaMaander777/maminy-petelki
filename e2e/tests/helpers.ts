import { expect, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";
import zlib from "node:zlib";

export const ADMIN_USER = process.env.E2E_ADMIN_USER ?? "e2eadmin";
export const ADMIN_PASS = process.env.E2E_ADMIN_PASSWORD ?? "e2e-pass-12345";
export const SHOTS = path.resolve(__dirname, "../screenshots");

/** Валидный PNG 64x64 (розовая заливка), собирается на лету. */
export function pngBuffer(): Buffer {
  const w = 64, h = 64;
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => [217, 143, 168]).flat())]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

export const uid = () => `E2E${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Слежение за ошибками консоли и неуспешными запросами. */
export function watch(page: Page, allow: RegExp[] = []) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400 && !allow.some((a) => a.test(r.url()))) problems.push(`${r.status()} ${r.url()}`);
  });
  return problems;
}

/** Дождаться конца загрузочного экрана. */
export async function waitLoader(page: Page) {
  await page.locator(".loader").waitFor({ state: "hidden", timeout: 8000 }).catch(() => undefined);
}

export async function noHScroll(page: Page) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, bw: document.body.scrollWidth }));
  expect(r.sw, `scrollWidth ${r.sw} > innerWidth ${r.iw}`).toBeLessThanOrEqual(r.iw);
  expect(r.bw).toBeLessThanOrEqual(r.iw);
}

export async function shot(page: Page, info: TestInfo, name: string, full = true) {
  await page.screenshot({ path: path.join(SHOTS, `${name}-${info.project.name}.png`), fullPage: full });
}

/** Вход через UI. */
export async function loginUI(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Логин").fill(ADMIN_USER);
  await page.getByLabel("Пароль").fill(ADMIN_PASS);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
}

/** Тексты на публичной странице получаются серверно: перезагружаем и читаем. */
export async function publicText(page: Page, url: string) {
  await page.goto(url);
  await waitLoader(page);
  return page;
}

/** Вход через API (cookie попадёт в контекст страницы). */
export async function loginAPI(page: Page) {
  const origin = new URL(page.context()["_options"]?.baseURL ?? process.env.E2E_BASE_URL ?? "http://localhost:3100").origin;
  const r = await page.request.post("/api/admin/login", {
    data: { username: ADMIN_USER, password: ADMIN_PASS },
    headers: { Origin: origin },
  });
  expect(r.status()).toBe(200);
  return origin;
}

export async function apiCreate(page: Page, origin: string, collection: string, data: Record<string, unknown>) {
  const r = await page.request.post(`/api/admin/${collection}`, { data, headers: { Origin: origin } });
  expect(r.status()).toBe(201);
  return (await r.json()) as { id: number };
}
export async function apiDelete(page: Page, origin: string, collection: string, id: number) {
  await page.request.delete(`/api/admin/${collection}/${id}`, { headers: { Origin: origin } });
}
