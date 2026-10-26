import type { MenuItem, PageContent, PageSlug, Settings } from "./api-types";

export const SITE_NAME = "Мамины петельки";
export const SITE_DESCRIPTION =
  "Вязаные изделия ручной работы на заказ: пледы, одежда и игрушки. Мамины петельки — уют в каждой петельке.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Картинка для превью в соцсетях (public/og.png, 1200x630). */
export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: SITE_NAME };

/** Реальные маршруты страниц. */
export const ROUTES: Record<PageSlug, string> = {
  home: "/",
  catalog: "/catalog",
  masterclasses: "/masterclasses",
  projects: "/projects",
  reviews: "/reviews",
  sales: "/sales",
};

export const DEFAULT_MENU: MenuItem[] = [
  { slug: "catalog", label: "Каталог", visible: true },
  { slug: "masterclasses", label: "Мастер-классы", visible: true },
  { slug: "projects", label: "Проекты", visible: true },
  { slug: "reviews", label: "Отзывы", visible: true },
  { slug: "sales", label: "Акции", visible: true },
];

export const DEFAULT_SETTINGS: Settings = {
  hero_title: "Вязаное с душой, связанное вручную",
  hero_text: "Пледы, одежда и игрушки — каждая вещь вяжется на заказ.",
  hero_cta: "Смотреть каталог",
  hero_photo: null,
  marquee: ["Ручная работа", "Вяжем на заказ", "С любовью", "Уют в каждой петельке"],
  menu: DEFAULT_MENU,
  contacts: { max_url: "", telegram_url: "", vk_url: "" },
  footer_title: "Контакты",
  footer_text: "Напишите нам в любой удобный мессенджер — обсудим изделие, размер и сроки.",
  copyright: "© Мамины петельки · вязаные изделия ручной работы",
  site_name: SITE_NAME,
};

export const DEFAULT_PAGES: Record<PageSlug, PageContent> = {
  home: { slug: "home", title: SITE_NAME, subtitle: "", seo_title: `${SITE_NAME} — вязаные изделия ручной работы`, seo_description: SITE_DESCRIPTION },
  catalog: {
    slug: "catalog", title: "Каталог", subtitle: "Нажмите на сердечко, чтобы сохранить понравившееся",
    seo_title: `Каталог — ${SITE_NAME}`, seo_description: "Каталог вязаных изделий ручной работы: пледы, шапки, свитера, носки, игрушки и шарфы на заказ.",
  },
  masterclasses: {
    slug: "masterclasses", title: "Мастер-классы", subtitle: "Учимся вязать вместе: приходите с нитками и хорошим настроением",
    seo_title: `Мастер-классы — ${SITE_NAME}`, seo_description: "Мастер-классы по вязанию: расписание, стоимость и запись.",
  },
  projects: {
    slug: "projects", title: "Проекты", subtitle: "Истории наших работ — от идеи до готовой вещи",
    seo_title: `Проекты — ${SITE_NAME}`, seo_description: "Проекты и готовые работы мастерской «Мамины петельки».",
  },
  reviews: {
    slug: "reviews", title: "Отзывы", subtitle: "Что говорят о наших изделиях",
    seo_title: `Отзывы — ${SITE_NAME}`, seo_description: "Отзывы клиентов о вязаных изделиях «Мамины петельки».",
  },
  sales: {
    slug: "sales", title: "Акции", subtitle: "Выгодные предложения и скидки",
    seo_title: `Акции — ${SITE_NAME}`, seo_description: "Актуальные акции и скидки на вязаные изделия.",
  },
};

export type ContactLink = { id: "max" | "telegram" | "vk"; label: string; href: string };

// NEXT_PUBLIC_* нужно читать статически, иначе Next не подставит значения в бандл.
// Это только запасной вариант на случай пустой ссылки из API.
export const FALLBACK_CONTACTS = {
  max_url: process.env.NEXT_PUBLIC_MAX_URL ?? "",
  telegram_url: process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "",
  vk_url: process.env.NEXT_PUBLIC_VK_URL ?? "",
};

/** Контакты с непустыми ссылками (пустые скрываются). */
export function buildContacts(
  contacts: Settings["contacts"],
  fallback: Settings["contacts"] = FALLBACK_CONTACTS,
): ContactLink[] {
  const pick = (a: string | undefined, b: string | undefined) => (a?.trim() || b?.trim() || "");
  const all: ContactLink[] = [
    { id: "max", label: "Макс", href: pick(contacts?.max_url, fallback.max_url) },
    { id: "telegram", label: "Telegram", href: pick(contacts?.telegram_url, fallback.telegram_url) },
    { id: "vk", label: "ВКонтакте", href: pick(contacts?.vk_url, fallback.vk_url) },
  ];
  return all.filter((c) => c.href !== "");
}

export function pageOf(pages: PageContent[], slug: PageSlug): PageContent {
  const found = pages.find((p) => p.slug === slug);
  const d = DEFAULT_PAGES[slug];
  return {
    slug,
    title: found?.title?.trim() || d.title,
    subtitle: found ? found.subtitle : d.subtitle,
    seo_title: found?.seo_title?.trim() || d.seo_title,
    seo_description: found?.seo_description?.trim() || d.seo_description,
  };
}

export function visibleMenu(menu: MenuItem[]): { label: string; href: string; slug: PageSlug }[] {
  return menu
    .filter((m) => m.visible && m.slug in ROUTES)
    .map((m) => ({ label: m.label, href: ROUTES[m.slug], slug: m.slug }));
}
