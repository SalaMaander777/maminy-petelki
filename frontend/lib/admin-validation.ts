// Проверки, общие для админ-панели (без зависимостей от React).

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_RULES_TEXT = "JPG, PNG или WebP, не больше 8 МБ";

/** Проверка файла перед загрузкой. Возвращает текст ошибки или null. */
export function validateImageFile(file: { name: string; size: number; type: string }): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `Файл «${file.name}» не подходит: можно загружать только JPG, PNG или WebP.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Файл «${file.name}» слишком большой (${formatBytes(file.size)}). Максимум — 8 МБ.`;
  }
  if (file.size === 0) {
    return `Файл «${file.name}» пустой.`;
  }
  return null;
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Пустая строка допустима (ссылка скрывается). */
export function validateOptionalUrl(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  return isHttpUrl(v) ? null : "Ссылка должна начинаться с http:// или https://";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} КБ`;
  return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

/** Перемещение элемента массива (возвращает новый массив). */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length || from === to || from < 0 || from >= arr.length) return arr;
  const copy = arr.slice();
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}
