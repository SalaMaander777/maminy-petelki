// Описание коллекций и полей форм админки + чистые функции преобразования/валидации.
import type { CollectionMap, CollectionName, PageSlug } from "@/lib/api-types";

export type FieldType = "text" | "textarea" | "int" | "photo" | "gallery" | "datetime" | "date" | "url" | "rating";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** допускает пустое значение -> null */
  nullable?: boolean;
  max?: number;
  hint?: string;
  placeholder?: string;
}

export interface CollectionDef {
  name: CollectionName;
  label: string;
  /** «Новое изделие» */
  newLabel: string;
  titleField: string;
  descriptionField?: string;
  emptyText: string;
  fields: FieldDef[];
}

export const COLLECTIONS: Record<CollectionName, CollectionDef> = {
  products: {
    name: "products",
    label: "Каталог",
    newLabel: "Новое изделие",
    titleField: "name",
    emptyText: "В каталоге пока нет изделий. Нажмите «Добавить», чтобы создать первое.",
    fields: [
      { name: "name", label: "Название", type: "text", required: true, max: 200 },
      { name: "photo", label: "Фото", type: "photo", nullable: true },
      { name: "description", label: "Описание", type: "textarea", max: 5000 },
      { name: "size", label: "Размер", type: "text", max: 200, placeholder: "Например, 150×200 см" },
      { name: "materials", label: "Материалы", type: "text", max: 200, placeholder: "Например, мериносовая шерсть" },
      { name: "lead_time", label: "Срок изготовления", type: "text", max: 200, placeholder: "Например, 3 недели" },
      { name: "price", label: "Цена, ₽", type: "int", nullable: true, hint: "Только число. Оставьте пустым, если цена по запросу." },
    ],
  },
  masterclasses: {
    name: "masterclasses",
    label: "Мастер-классы",
    newLabel: "Новый мастер-класс",
    titleField: "title",
    emptyText: "Мастер-классов пока нет. Нажмите «Добавить».",
    fields: [
      { name: "title", label: "Название", type: "text", required: true, max: 200 },
      { name: "photo", label: "Фото", type: "photo", nullable: true },
      { name: "description", label: "Описание", type: "textarea", max: 5000 },
      { name: "starts_at", label: "Дата и время начала", type: "datetime", nullable: true },
      { name: "duration", label: "Длительность", type: "text", nullable: true, max: 200, placeholder: "Например, 2 часа" },
      { name: "price", label: "Цена, ₽", type: "int", nullable: true },
      { name: "seats", label: "Количество мест", type: "int", nullable: true },
      { name: "signup_url", label: "Ссылка для записи", type: "url", nullable: true, hint: "Начинается с http:// или https://" },
    ],
  },
  projects: {
    name: "projects",
    label: "Проекты",
    newLabel: "Новый проект",
    titleField: "title",
    emptyText: "Проектов пока нет. Нажмите «Добавить».",
    fields: [
      { name: "title", label: "Название", type: "text", required: true, max: 200 },
      { name: "photo", label: "Главное фото", type: "photo", nullable: true },
      { name: "description", label: "Описание", type: "textarea", max: 5000 },
      { name: "gallery", label: "Дополнительные фото", type: "gallery" },
    ],
  },
  reviews: {
    name: "reviews",
    label: "Отзывы",
    newLabel: "Новый отзыв",
    titleField: "author",
    descriptionField: "text",
    emptyText: "Отзывов пока нет. Нажмите «Добавить».",
    fields: [
      { name: "author", label: "Автор", type: "text", required: true, max: 200 },
      { name: "text", label: "Текст отзыва", type: "textarea", required: true, max: 5000 },
      { name: "rating", label: "Оценка", type: "rating", nullable: true },
      { name: "photo", label: "Фото", type: "photo", nullable: true },
    ],
  },
  promos: {
    name: "promos",
    label: "Акции",
    newLabel: "Новая акция",
    titleField: "title",
    emptyText: "Акций пока нет. Нажмите «Добавить».",
    fields: [
      { name: "title", label: "Название", type: "text", required: true, max: 200 },
      { name: "photo", label: "Фото", type: "photo", nullable: true },
      { name: "description", label: "Описание", type: "textarea", max: 5000 },
      { name: "badge", label: "Плашка", type: "text", nullable: true, max: 50, placeholder: "Например, −20%" },
      { name: "valid_until", label: "Действует до", type: "date", nullable: true, hint: "После этой даты акция пропадёт с сайта." },
    ],
  },
};

export const COLLECTION_ORDER: CollectionName[] = ["products", "masterclasses", "projects", "reviews", "promos"];

export function isCollectionName(s: string): s is CollectionName {
  return (COLLECTION_ORDER as string[]).includes(s);
}

export const PAGE_LABELS: Record<PageSlug, string> = {
  home: "Главная",
  catalog: "Каталог",
  masterclasses: "Мастер-классы",
  projects: "Проекты",
  reviews: "Отзывы",
  sales: "Акции",
};
export const PAGE_SLUGS = Object.keys(PAGE_LABELS) as PageSlug[];

// ---- состояние формы ----
export type FormValue = string | string[];
export interface FormState {
  values: Record<string, FormValue>;
  is_published: boolean;
}

export function itemTitle(def: CollectionDef, item: Record<string, unknown>): string {
  return String(item[def.titleField] ?? "").trim();
}

export function emptyFormState(def: CollectionDef): FormState {
  const values: Record<string, FormValue> = {};
  for (const f of def.fields) values[f.name] = f.type === "gallery" ? [] : "";
  return { values, is_published: true };
}

export function toFormState(def: CollectionDef, item: Record<string, unknown>): FormState {
  const values: Record<string, FormValue> = {};
  for (const f of def.fields) {
    const v = item[f.name];
    if (f.type === "gallery") values[f.name] = Array.isArray(v) ? (v as string[]) : [];
    else if (v === null || v === undefined) values[f.name] = "";
    else if (f.type === "datetime") values[f.name] = String(v).slice(0, 16);
    else if (f.type === "date") values[f.name] = String(v).slice(0, 10);
    else values[f.name] = String(v);
  }
  return { values, is_published: item.is_published !== false };
}

export function validateForm(def: CollectionDef, state: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of def.fields) {
    const raw = state.values[f.name];
    if (f.type === "gallery" || f.type === "photo") continue;
    const v = typeof raw === "string" ? raw.trim() : "";
    if (f.required && !v) {
      errors[f.name] = "Заполните это поле";
      continue;
    }
    if (!v) continue;
    if (f.max && v.length > f.max) errors[f.name] = `Слишком длинно: не больше ${f.max} символов`;
    if (f.type === "int" && !/^\d+$/.test(v)) errors[f.name] = "Введите целое число без пробелов, от 0";
    if (f.type === "int" && /^\d+$/.test(v) && Number(v) > 2_000_000_000) errors[f.name] = "Слишком большое число";
    if (f.type === "rating" && !/^[1-5]$/.test(v)) errors[f.name] = "Оценка — от 1 до 5";
    if (f.type === "url" && !/^https?:\/\/\S+$/i.test(v)) errors[f.name] = "Ссылка должна начинаться с http:// или https://";
    if ((f.type === "datetime" || f.type === "date") && Number.isNaN(new Date(v).getTime())) errors[f.name] = "Укажите корректную дату";
  }
  return errors;
}

/** Собирает тело запроса по контракту (без id). */
export function toPayload<C extends CollectionName>(
  def: CollectionDef,
  state: FormState,
  sortOrder: number,
): Omit<CollectionMap[C], "id"> {
  const out: Record<string, unknown> = {};
  for (const f of def.fields) {
    const raw = state.values[f.name];
    if (f.type === "gallery") {
      out[f.name] = Array.isArray(raw) ? raw : [];
      continue;
    }
    const v = typeof raw === "string" ? raw.trim() : "";
    switch (f.type) {
      case "int":
      case "rating":
        out[f.name] = v === "" ? null : parseInt(v, 10);
        break;
      case "datetime":
        out[f.name] = v === "" ? null : v.length === 16 ? `${v}:00` : v;
        break;
      case "date":
      case "photo":
        out[f.name] = v === "" ? null : v;
        break;
      default:
        out[f.name] = v === "" && f.nullable ? null : v;
    }
  }
  out.is_published = state.is_published;
  out.sort_order = sortOrder;
  return out as Omit<CollectionMap[C], "id">;
}
