import type { MetadataRoute } from "next";
import { getSite } from "@/lib/api";
import { ROUTES, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Главная всегда; остальные страницы — только если не скрыты в меню (visible:false). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/+$/, "");
  const { settings } = await getSite();
  const hidden = new Set(settings.menu.filter((m) => !m.visible).map((m) => m.slug));
  const lastModified = new Date();
  return Object.entries(ROUTES)
    .filter(([slug]) => !hidden.has(slug as never))
    .map(([, path]) => ({
      url: `${base}${path === "/" ? "" : path}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.7,
    }));
}
