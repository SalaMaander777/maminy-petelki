import type { MasterClass, Product, Project, Promo, Review, SiteData } from "./api-types";
import { DEFAULT_MENU, DEFAULT_PAGES, DEFAULT_SETTINGS } from "./site";

const TIMEOUT_MS = 3000;

export function backendUrl(): string {
  return (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/+$/, "");
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${backendUrl()}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getList<T>(path: string): Promise<T[]> {
  const data = await getJson<unknown>(path);
  return Array.isArray(data) ? (data as T[]) : [];
}

export function defaultSite(): SiteData {
  return { settings: DEFAULT_SETTINGS, pages: Object.values(DEFAULT_PAGES) };
}

/** Мерджит ответ с настройками по умолчанию, чтобы неполные данные не ломали страницу. */
export function normalizeSite(raw: Partial<SiteData> | null | undefined): SiteData {
  if (!raw || typeof raw !== "object" || !raw.settings) return defaultSite();
  const s = raw.settings;
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      ...s,
      // Осознанно: пустое меню (menu: []) из API подменяется меню по умолчанию (зафиксировано тестом).
      menu: Array.isArray(s.menu) && s.menu.length > 0 ? s.menu : DEFAULT_MENU,
      marquee: Array.isArray(s.marquee) ? s.marquee.filter((x) => typeof x === "string" && x.trim()) : [],
      contacts: { ...DEFAULT_SETTINGS.contacts, ...(s.contacts ?? {}) },
    },
    pages: Array.isArray(raw.pages) ? raw.pages : [],
  };
}

export async function getSite(): Promise<SiteData> {
  return normalizeSite(await getJson<SiteData>("/api/site"));
}
export const getProducts = () => getList<Product>("/api/products");
export const getMasterClasses = () => getList<MasterClass>("/api/masterclasses");
export const getProjects = () => getList<Project>("/api/projects");
export const getReviews = () => getList<Review>("/api/reviews");
export const getPromos = () => getList<Promo>("/api/promos");
