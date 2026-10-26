// Типы отражают docs/api-spec.md. Менять только вместе с контрактом.

export type PageSlug =
  | "home"
  | "catalog"
  | "masterclasses"
  | "projects"
  | "reviews"
  | "sales";

export type CollectionName =
  | "products"
  | "masterclasses"
  | "projects"
  | "reviews"
  | "promos";

export interface Product {
  id: number;
  name: string;
  description: string;
  size: string;
  materials: string;
  lead_time: string;
  price: number | null;
  photo: string | null;
  is_published: boolean;
  sort_order: number;
}

export interface MasterClass {
  id: number;
  title: string;
  description: string;
  starts_at: string | null;
  duration: string | null;
  price: number | null;
  seats: number | null;
  signup_url: string | null;
  photo: string | null;
  is_published: boolean;
  sort_order: number;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  photo: string | null;
  gallery: string[];
  is_published: boolean;
  sort_order: number;
}

export interface Review {
  id: number;
  author: string;
  text: string;
  rating: number | null;
  photo: string | null;
  is_published: boolean;
  sort_order: number;
}

export interface Promo {
  id: number;
  title: string;
  description: string;
  badge: string | null;
  valid_until: string | null;
  photo: string | null;
  is_published: boolean;
  sort_order: number;
}

export interface CollectionMap {
  products: Product;
  masterclasses: MasterClass;
  projects: Project;
  reviews: Review;
  promos: Promo;
}

export interface PageContent {
  slug: PageSlug;
  title: string;
  subtitle: string;
  seo_title: string;
  seo_description: string;
}

export interface MenuItem {
  slug: PageSlug;
  label: string;
  visible: boolean;
}

export interface Settings {
  hero_title: string;
  hero_text: string;
  hero_cta: string;
  hero_photo: string | null;
  marquee: string[];
  menu: MenuItem[];
  contacts: { max_url: string; telegram_url: string; vk_url: string };
  footer_title: string;
  footer_text: string;
  copyright: string;
  site_name: string;
}

export interface SiteData {
  settings: Settings;
  pages: PageContent[];
}

export interface MediaFile {
  url: string;
  size: number;
  created_at: string;
}
