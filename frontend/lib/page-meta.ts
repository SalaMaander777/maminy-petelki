import type { Metadata } from "next";
import { getSite } from "@/lib/api";
import { OG_IMAGE, pageOf, SITE_NAME } from "@/lib/site";

type Slug = "home" | "catalog" | "masterclasses" | "projects" | "reviews" | "sales";

/**
 * Полный набор метаданных страницы. openGraph/twitter в Next не сливаются с корневыми
 * по полям, поэтому type, locale, siteName и images задаём здесь явно.
 * title.absolute — seo_title показывается как есть (без шаблона «… — Мамины петельки»).
 */
export function buildMetadata(opts: { title: string; description: string; path: string }): Metadata {
  const { title, description, path } = opts;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}

export async function pageMetadata(slug: Slug): Promise<Metadata> {
  const { pages } = await getSite();
  const p = pageOf(pages, slug);
  return buildMetadata({ title: p.seo_title, description: p.seo_description, path: slug === "home" ? "/" : "/" + slug });
}
