import { afterEach, describe, expect, it, vi } from "vitest";
import { getMasterClasses, getProducts, getSite, normalizeSite } from "@/lib/api";
import { formatDate, formatDateTime, formatPrice, isPast, seatsLabel, sortPastLast } from "@/lib/format";
import { buildContacts, DEFAULT_SETTINGS, pageOf } from "@/lib/site";

afterEach(() => vi.unstubAllGlobals());

describe("format", () => {
  it("formatDateTime", () => {
    expect(formatDateTime("2026-11-05T15:00:00")).toBe("5 ноября, 15:00");
    expect(formatDateTime(null)).toBe("");
    expect(formatDateTime("мусор")).toBe("");
  });
  it("formatDate опускает текущий год", () => {
    const now = new Date(2026, 9, 26);
    expect(formatDate("2026-12-31", now)).toBe("31 декабря");
    expect(formatDate("2027-01-02", now)).toBe("2 января 2027");
  });
  it("isPast", () => {
    const now = new Date(2026, 9, 26, 12);
    expect(isPast("2026-10-26T11:00:00", now)).toBe(true);
    expect(isPast("2026-10-26T13:00:00", now)).toBe(false);
    expect(isPast(null, now)).toBe(false);
  });
  it("sortPastLast опускает прошедшие, сохраняя порядок", () => {
    const now = new Date(2026, 9, 26);
    const r = sortPastLast(
      [
        { id: 1, starts_at: "2026-01-01T10:00:00" },
        { id: 2, starts_at: "2026-12-01T10:00:00" },
        { id: 3, starts_at: null },
        { id: 4, starts_at: "2026-02-01T10:00:00" },
      ],
      now,
    );
    expect(r.map((x) => x.id)).toEqual([2, 3, 1, 4]);
  });
  it("formatPrice и seatsLabel", () => {
    expect(formatPrice(1500)).toBe("1 500 ₽");
    expect(formatPrice(null)).toBe("");
    expect([1, 2, 5, 11, 21].map(seatsLabel)).toEqual(["1 место", "2 места", "5 мест", "11 мест", "21 место"]);
  });
});

describe("site helpers", () => {
  it("buildContacts скрывает пустые ссылки", () => {
    const c = buildContacts({ max_url: " ", telegram_url: "https://t.me/a", vk_url: "" }, { max_url: "", telegram_url: "", vk_url: "" });
    expect(c.map((x) => x.id)).toEqual(["telegram"]);
  });
  it("buildContacts использует запасные ссылки при пустых из API", () => {
    const c = buildContacts({ max_url: "", telegram_url: "", vk_url: "" }, { max_url: "https://max", telegram_url: "", vk_url: "" });
    expect(c).toEqual([{ id: "max", label: "Макс", href: "https://max" }]);
  });
  it("pageOf подставляет значения по умолчанию", () => {
    expect(pageOf([], "catalog").title).toBe("Каталог");
    expect(pageOf([{ slug: "catalog", title: "Изделия", subtitle: "", seo_title: "", seo_description: "" }], "catalog").title).toBe("Изделия");
  });
});

describe("api client", () => {
  it("при недоступном backend возвращает значения по умолчанию", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await getProducts()).toEqual([]);
    expect(await getMasterClasses()).toEqual([]);
    const site = await getSite();
    expect(site.settings.menu).toHaveLength(5);
    expect(site.settings.hero_title).toBe(DEFAULT_SETTINGS.hero_title);
  });
  it("при ошибке HTTP и неверной форме — безопасные значения", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    expect(await getProducts()).toEqual([]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ detail: "x" }) }));
    expect(await getProducts()).toEqual([]);
  });
  it("запрашивает BACKEND_URL с no-store", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 1 }] });
    vi.stubGlobal("fetch", f);
    expect(await getProducts()).toEqual([{ id: 1 }]);
    expect(f.mock.calls[0][0]).toBe("http://localhost:8000/api/products");
    expect(f.mock.calls[0][1].cache).toBe("no-store");
  });
  it("normalizeSite: пустое меню menu: [] подменяется меню по умолчанию (осознанно); неполные настройки дополняются", () => {
    const s = normalizeSite({ settings: { hero_title: "Привет", marquee: [], menu: [] } as never, pages: [] });
    expect(s.settings.hero_title).toBe("Привет");
    expect(s.settings.marquee).toEqual([]);
    expect(s.settings.menu).toHaveLength(5);
    expect(s.settings.footer_title).toBe(DEFAULT_SETTINGS.footer_title);
  });
});
