import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MasterClass, Product, Project, Promo, Review, SiteData } from "@/lib/api-types";
import { defaultSite } from "@/lib/api";
import { DEFAULT_SETTINGS } from "@/lib/site";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const api = vi.hoisted(() => ({
  getSite: vi.fn(),
  getProducts: vi.fn(),
  getMasterClasses: vi.fn(),
  getProjects: vi.fn(),
  getReviews: vi.fn(),
  getPromos: vi.fn(),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), ...api }));

import HomePage, { generateMetadata as homeMeta } from "@/app/(site)/page";
import CatalogPage, { generateMetadata as catalogMeta } from "@/app/(site)/catalog/page";
import MasterClassesPage, { generateMetadata as mcMeta } from "@/app/(site)/masterclasses/page";
import ProjectsPage, { generateMetadata as projectsMeta } from "@/app/(site)/projects/page";
import ReviewsPage, { generateMetadata as reviewsMeta } from "@/app/(site)/reviews/page";
import SalesPage, { generateMetadata as salesMeta } from "@/app/(site)/sales/page";
import SiteLayout from "@/app/(site)/layout";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

const product: Product = { id: 1, name: "Плед «Облако»", description: "Мягкий", size: "150×200", materials: "шерсть", lead_time: "2 недели", price: 7500, photo: "/uploads/a.webp", is_published: true, sort_order: 0 };
const mc: MasterClass = { id: 1, title: "Шапка за вечер", description: "", starts_at: "2099-01-01T10:00:00", duration: "2 часа", price: 1500, seats: 8, signup_url: null, photo: null, is_published: true, sort_order: 0 };
const pastMc: MasterClass = { ...mc, id: 2, title: "Старый МК", starts_at: "2001-01-01T10:00:00" };
const project: Project = { id: 1, title: "Пледы для роддома", description: "d", photo: null, gallery: ["/uploads/g.webp"], is_published: true, sort_order: 0 };
const review: Review = { id: 1, author: "Анна", text: "Супер", rating: 5, photo: null, is_published: true, sort_order: 0 };
const promo: Promo = { id: 1, title: "Скидка", description: "d", badge: "−10%", valid_until: "2099-12-31", photo: null, is_published: true, sort_order: 0 };

function site(over: Partial<SiteData["settings"]> = {}, pages: SiteData["pages"] = []): SiteData {
  return { settings: { ...DEFAULT_SETTINGS, ...over }, pages };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getSite.mockResolvedValue(defaultSite());
  for (const k of ["getProducts", "getMasterClasses", "getProjects", "getReviews", "getPromos"] as const) api[k].mockResolvedValue([]);
});

const EMPTY: [string, () => Promise<React.ReactElement>, RegExp][] = [
  ["Каталог", CatalogPage, /Скоро здесь появятся изделия/],
  ["Мастер-классы", MasterClassesPage, /появятся мастер-классы/],
  ["Проекты", ProjectsPage, /появятся наши проекты/],
  ["Отзывы", ReviewsPage, /появятся отзывы/],
  ["Акции", SalesPage, /действующих акций нет/],
];

describe("страницы без данных (backend пуст или недоступен)", () => {
  it.each(EMPTY)("%s: заголовок и дружелюбная заглушка, без падения", async (title, Page, msg) => {
    render(await Page());
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(msg);
  });

  it("главная без данных рендерит героя по умолчанию", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(DEFAULT_SETTINGS.hero_title);
    expect(screen.getByRole("link", { name: "Смотреть каталог" })).toHaveAttribute("href", "/catalog");
  });
});

describe("страницы с данными", () => {
  it("каталог: карточки из API", async () => {
    api.getProducts.mockResolvedValue([product, { ...product, id: 2, name: "Шапка", price: null }]);
    render(await CatalogPage());
    expect(screen.getByRole("heading", { level: 2, name: "Плед «Облако»" })).toBeInTheDocument();
    expect(screen.getByText("По запросу")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByAltText("Плед «Облако»")).toHaveAttribute("src", "/uploads/a.webp");
  });

  it("каталог: заголовок и подзаголовок берутся из PageContent", async () => {
    api.getSite.mockResolvedValue(site({}, [{ slug: "catalog", title: "Наши работы", subtitle: "Подзаголовок", seo_title: "", seo_description: "" }]));
    render(await CatalogPage());
    expect(screen.getByRole("heading", { level: 1, name: "Наши работы" })).toBeInTheDocument();
    expect(screen.getByText("Подзаголовок")).toBeInTheDocument();
  });

  it("мастер-классы: прошедшие уходят вниз и помечены", async () => {
    api.getMasterClasses.mockResolvedValue([pastMc, mc]);
    render(await MasterClassesPage());
    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(["Шапка за вечер", "Старый МК"]);
    expect(screen.getByText("Прошёл")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Записаться" })).toHaveLength(1);
  });

  it("проекты, отзывы, акции", async () => {
    api.getProjects.mockResolvedValue([project]);
    api.getReviews.mockResolvedValue([review]);
    api.getPromos.mockResolvedValue([promo]);
    const { unmount } = render(await ProjectsPage());
    expect(screen.getByText("Пледы для роддома")).toBeInTheDocument();
    unmount();
    const r2 = render(await ReviewsPage());
    expect(screen.getByText(/Супер/)).toBeInTheDocument();
    r2.unmount();
    render(await SalesPage());
    expect(screen.getByText("−10%")).toBeInTheDocument();
  });

  it("HTML из админки выводится как текст, а не разметка (XSS)", async () => {
    const evil = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>';
    api.getProducts.mockResolvedValue([{ ...product, name: evil, description: evil }]);
    api.getReviews.mockResolvedValue([{ ...review, text: evil, author: evil }]);
    const { container, unmount } = render(await CatalogPage());
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img[src='x']")).toBeNull();
    expect(screen.getAllByText(evil).length).toBeGreaterThan(0);
    unmount();
    const r = render(await ReviewsPage());
    expect(r.container.querySelector("script")).toBeNull();
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });
});

describe("generateMetadata", () => {
  const cases: [string, () => Promise<import("next").Metadata>, string, string][] = [
    ["catalog", catalogMeta, "/catalog", "Каталог — Мамины петельки"],
    ["masterclasses", mcMeta, "/masterclasses", "Мастер-классы — Мамины петельки"],
    ["projects", projectsMeta, "/projects", "Проекты — Мамины петельки"],
    ["reviews", reviewsMeta, "/reviews", "Отзывы — Мамины петельки"],
    ["sales", salesMeta, "/sales", "Акции — Мамины петельки"],
  ];

  it.each(cases)("%s: значения по умолчанию при пустых pages", async (_s, fn, path, title) => {
    const m = await fn();
    expect(m.title).toEqual({ absolute: title });
    expect(String(m.description).length).toBeGreaterThan(10);
    expect(m.alternates?.canonical).toBe(path);
    expect(m.openGraph?.url).toBe(path);
    expect(m.openGraph).toMatchObject({ type: "website", locale: "ru_RU", siteName: "Мамины петельки" });
    expect((m.openGraph as { images: { url: string; width: number; height: number }[] }).images[0]).toMatchObject({ url: "/og.png", width: 1200, height: 630 });
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it.each(cases)("%s: SEO из админки перекрывает умолчания, пустые поля — нет", async (slug, fn) => {
    api.getSite.mockResolvedValue(site({}, [{ slug: slug as never, title: "", subtitle: "", seo_title: "  Свой SEO  ", seo_description: "" }]));
    const m = await fn();
    expect(m.title).toEqual({ absolute: "Свой SEO" });
    expect(String(m.description).length).toBeGreaterThan(10); // пустое — запасное значение
  });

  it("главная: absolute title из home", async () => {
    api.getSite.mockResolvedValue(site({}, [{ slug: "home", title: "", subtitle: "", seo_title: "Главная SEO", seo_description: "Описание" }]));
    const m = await homeMeta();
    expect(m.title).toEqual({ absolute: "Главная SEO" });
    expect(m.description).toBe("Описание");
    expect(m.alternates?.canonical).toBe("/");
  });

  it("backend недоступен — метаданные не падают", async () => {
    api.getSite.mockResolvedValue(defaultSite());
    await expect(homeMeta()).resolves.toBeTruthy();
  });
});

describe("layout сайта", () => {
  async function renderLayout(over: Partial<SiteData["settings"]> = {}) {
    api.getSite.mockResolvedValue(site(over));
    return render(await SiteLayout({ children: <p>контент</p> }));
  }

  it("JSON-LD экранирует «<» (нельзя выйти из <script>)", async () => {
    const { container } = await renderLayout({ site_name: "</script><script>window.__xss=1</script>" });
    const ld = container.querySelector('script[type="application/ld+json"]')!;
    expect(ld.innerHTML).not.toContain("<");
    expect(JSON.parse(ld.innerHTML).name).toBe("</script><script>window.__xss=1</script>");
    expect(container.querySelectorAll("script").length).toBe(1);
  });

  it("JSON-LD: sameAs только из заданных http(s)-ссылок", async () => {
    const { container } = await renderLayout({ contacts: { max_url: "", telegram_url: "https://t.me/x", vk_url: "javascript:alert(1)" } });
    const data = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.innerHTML);
    expect(data.sameAs).toEqual(["https://t.me/x"]);
    expect(data["@type"]).toBe("LocalBusiness");
  });

  it("меню: скрытые пункты не выводятся, контент и футер на месте", async () => {
    const menu = [
      { slug: "catalog" as const, label: "Каталог", visible: true },
      { slug: "sales" as const, label: "Скидки", visible: false },
    ];
    await renderLayout({ menu });
    expect(screen.getByRole("link", { name: "Каталог" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Скидки" })).not.toBeInTheDocument();
    expect(screen.getByText("контент")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("первая ссылка — «Пропустить к содержимому», ведёт на #main", async () => {
    const { container } = await renderLayout();
    const first = container.querySelector("a")!;
    expect(first).toHaveTextContent("Пропустить к содержимому");
    expect(first).toHaveAttribute("href", "#main");
  });

  it("все контакты пусты — кнопок мессенджеров нет", async () => {
    await renderLayout();
    expect(screen.queryByRole("link", { name: "Telegram" })).not.toBeInTheDocument();
  });
});

describe("sitemap и robots", () => {
  it("sitemap содержит 6 публичных страниц и не содержит админку/API", async () => {
    api.getSite.mockResolvedValue(site());
    const items = await sitemap();
    expect(items.every((i) => i.lastModified instanceof Date)).toBe(true);
    const urls = items.map((s) => s.url);
    expect(urls).toHaveLength(6);
    expect(urls.some((u) => /admin|api|uploads/.test(u))).toBe(false);
    expect(new Set(urls).size).toBe(6);
  });

  it("sitemap не включает страницы, скрытые в меню", async () => {
    api.getSite.mockResolvedValue(site({ menu: [{ slug: "sales", label: "Акции", visible: false }, { slug: "catalog", label: "Каталог", visible: true }] }));
    const urls = (await sitemap()).map((s) => s.url);
    expect(urls).toHaveLength(5);
    expect(urls.some((u) => u.endsWith("/sales"))).toBe(false);
    expect(urls.some((u) => u.endsWith("/catalog"))).toBe(true);
  });

  it("robots закрывает /admin и /api и указывает sitemap", () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule.disallow).toEqual(expect.arrayContaining(["/admin", "/api"]));
    expect(String(r.sitemap)).toMatch(/\/sitemap\.xml$/);
  });
});
