import { afterEach, describe, expect, it, vi } from "vitest";
import { getPromos, getReviews, getSite, getProjects, normalizeSite } from "@/lib/api";
import { formatDate, formatDateTime, formatPrice, isPast, seatsLabel, sortPastLast } from "@/lib/format";
import { buildContacts, DEFAULT_MENU, DEFAULT_PAGES, pageOf, ROUTES, visibleMenu } from "@/lib/site";

afterEach(() => vi.unstubAllGlobals());

describe("format: граничные случаи", () => {
  it("formatDateTime: некорректный месяц/пусто/нет времени", () => {
    expect(formatDateTime("2026-13-05T10:00:00")).toBe("");
    expect(formatDateTime("2026-00-05")).toBe("");
    expect(formatDateTime("")).toBe("");
    expect(formatDateTime(undefined)).toBe("");
    expect(formatDateTime("2026-11-05")).toBe("5 ноября");
    expect(formatDateTime("2026-11-05 09:05:00")).toBe("5 ноября, 09:05");
  });
  it("formatDateTime не зависит от часового пояса и игнорирует суффикс зоны", () => {
    expect(formatDateTime("2026-11-05T23:30:00")).toBe("5 ноября, 23:30");
    expect(formatDateTime("2026-01-01T00:00:00")).toBe("1 января, 00:00");
  });
  it("formatDate: год показывается для нетекущего", () => {
    const now = new Date(2026, 0, 1);
    expect(formatDate("2025-12-31", now)).toBe("31 декабря 2025");
    expect(formatDate("bad", now)).toBe("");
    expect(formatDate(null, now)).toBe("");
  });
  it("isPast: дата без времени считается прошедшей только после конца дня", () => {
    expect(isPast("2026-10-26", new Date(2026, 9, 26, 23, 0))).toBe(false);
    expect(isPast("2026-10-26", new Date(2026, 9, 27, 0, 1))).toBe(true);
    expect(isPast("мусор")).toBe(false);
  });
  it("sortPastLast: пустой список и все прошедшие", () => {
    expect(sortPastLast([])).toEqual([]);
    const all = [{ starts_at: "2001-01-01T00:00:00" }, { starts_at: "2002-01-01T00:00:00" }];
    expect(sortPastLast(all)).toEqual(all);
  });
  it("sortPastLast не мутирует вход", () => {
    const a = [{ starts_at: "2001-01-01T00:00:00" }, { starts_at: null }];
    const copy = [...a];
    sortPastLast(a);
    expect(a).toEqual(copy);
  });
  it("formatPrice: 0, большие числа", () => {
    expect(formatPrice(0)).toMatch(/^0\s₽$/);
    expect(formatPrice(100000000).replace(/\s/g, "")).toBe("100000000₽");
    expect(formatPrice(undefined)).toBe("");
  });
  it("seatsLabel: склонения 0, 12-14, 22-24, 100, 101", () => {
    expect([0, 12, 13, 14, 22, 24, 25, 100, 101, 111].map(seatsLabel)).toEqual([
      "0 мест", "12 мест", "13 мест", "14 мест", "22 места", "24 места", "25 мест", "100 мест", "101 место", "111 мест",
    ]);
  });
});

describe("site: меню, контакты, страницы", () => {
  it("visibleMenu: скрытые и неизвестные slug отфильтрованы, порядок сохранён", () => {
    const r = visibleMenu([
      { slug: "sales", label: "A", visible: true },
      { slug: "catalog", label: "B", visible: false },
      { slug: "evil" as never, label: "C", visible: true },
      { slug: "reviews", label: "D", visible: true },
    ]);
    expect(r.map((x) => x.href)).toEqual(["/sales", "/reviews"]);
  });
  it("visibleMenu: пустое меню", () => {
    expect(visibleMenu([])).toEqual([]);
    expect(visibleMenu(DEFAULT_MENU).map((m) => m.href)).toEqual(["/catalog", "/masterclasses", "/projects", "/reviews", "/sales"]);
  });
  it("все 6 slug имеют маршрут и значения по умолчанию", () => {
    expect(Object.keys(ROUTES).sort()).toEqual(Object.keys(DEFAULT_PAGES).sort());
  });
  it("buildContacts: undefined-контакты не падают, порядок Макс/Telegram/VK", () => {
    expect(buildContacts(undefined as never, { max_url: "", telegram_url: "", vk_url: "" })).toEqual([]);
    const c = buildContacts({ max_url: "https://m", telegram_url: "https://t", vk_url: "https://v" }, { max_url: "", telegram_url: "", vk_url: "" });
    expect(c.map((x) => x.id)).toEqual(["max", "telegram", "vk"]);
  });
  it("pageOf: пробельный заголовок -> умолчание; пустой subtitle из админки сохраняется", () => {
    const p = pageOf([{ slug: "catalog", title: "   ", subtitle: "", seo_title: " ", seo_description: "" }], "catalog");
    expect(p.title).toBe("Каталог");
    expect(p.subtitle).toBe("");
    expect(p.seo_title).toBe("Каталог — Мамины петельки");
  });
});

describe("normalizeSite: некорректные ответы", () => {
  it.each([null, undefined, {}, { settings: null }, "строка", 5])("%j -> умолчания", (raw) => {
    const s = normalizeSite(raw as never);
    expect(s.settings.menu).toHaveLength(5);
    expect(s.pages.length).toBe(6);
  });
  it("marquee с мусором и пробелами очищается; contacts=null не падает", () => {
    const s = normalizeSite({ settings: { marquee: ["a", " ", 5, null, "b"], contacts: null, menu: "x" } as never, pages: "x" as never });
    expect(s.settings.marquee).toEqual(["a", "b"]);
    expect(s.settings.contacts).toEqual({ max_url: "", telegram_url: "", vk_url: "" });
    expect(s.settings.menu).toHaveLength(5);
    expect(s.pages).toEqual([]);
  });
});

describe("api: сбои сети", () => {
  it("невалидный JSON / таймаут -> пустые значения, без исключения", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError("bad"); } }));
    expect(await getReviews()).toEqual([]);
    expect((await getSite()).settings.menu).toHaveLength(5);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));
    expect(await getPromos()).toEqual([]);
  });
  it("ответ 500/404 -> пустой список", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ detail: "x" }) }));
    expect(await getProjects()).toEqual([]);
  });
  it("BACKEND_URL с хвостовым слэшем нормализуется", async () => {
    vi.stubEnv("BACKEND_URL", "http://backend:8000///");
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", f);
    await getProjects();
    expect(f.mock.calls[0][0]).toBe("http://backend:8000/api/projects");
    vi.unstubAllEnvs();
  });
});
