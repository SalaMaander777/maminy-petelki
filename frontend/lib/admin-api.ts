// Клиентский слой админ-API. Контракт — docs/api-spec.md.
// Запросы идут на тот же origin (/api/admin/...), сессия — httpOnly cookie.
import type {
  CollectionMap,
  CollectionName,
  MediaFile,
  PageContent,
  PageSlug,
  Settings,
} from "@/lib/api-types";

export class ApiError extends Error {
  status: number;
  /** Ошибки по полям (422): имя поля -> текст на русском */
  fieldErrors: Record<string, string>;
  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** Оболочка админки регистрирует переход на экран входа. */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

function handleUnauthorized() {
  if (unauthorizedHandler) return unauthorizedHandler();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
    // запасной вариант, если оболочка админки не зарегистрировала обработчик
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/admin/login";
  }
}

function translateMsg(msg: string): string {
  const m = msg.toLowerCase();
  if (/at least 1|should have at least|field required|не может быть пуст|required/.test(m)) return "Заполните это поле";
  if (/at most|too long|слишком длин/.test(m)) return "Слишком длинное значение";
  if (/greater than or equal|ge=|не меньше|less than|greater than/.test(m)) return "Недопустимое число";
  if (/valid integer|valid number|not a valid/.test(m)) return "Введите корректное значение";
  return /[а-яё]/i.test(msg) ? msg : "Проверьте значение этого поля";
}

export function parseValidation(detail: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(detail)) return out;
  for (const d of detail) {
    if (!d || typeof d !== "object") continue;
    const loc = (d as { loc?: unknown[] }).loc ?? [];
    const msg = String((d as { msg?: unknown }).msg ?? "");
    const field = [...loc].reverse().find((x) => typeof x === "string" && x !== "body");
    const key = typeof field === "string" ? field : "_";
    if (!(key in out)) out[key] = translateMsg(msg);
  }
  return out;
}

interface RequestOptions {
  method?: string;
  json?: unknown;
  form?: FormData;
  /** Для входа: 401 — это «неверный пароль», а не «сессия закончилась» */
  skipAuthRedirect?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.form) {
    body = opts.form;
  }
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      method: opts.method ?? "GET",
      credentials: "same-origin",
      headers,
      body,
    });
  } catch {
    throw new ApiError(0, "Нет связи с сервером. Проверьте интернет и повторите.");
  }
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    try {
      return (await res.json()) as T;
    } catch {
      return undefined as T;
    }
  }
  let detail: unknown = null;
  try {
    detail = (await res.json())?.detail;
  } catch {
    /* тело не JSON */
  }
  const text = typeof detail === "string" ? detail : "";
  switch (res.status) {
    case 401:
      if (!opts.skipAuthRedirect) handleUnauthorized();
      throw new ApiError(401, opts.skipAuthRedirect ? text || "Неверный логин или пароль." : "Сессия закончилась. Войдите снова.");
    case 403:
      throw new ApiError(403, "Запрос отклонён. Обновите страницу и повторите.");
    case 404:
      throw new ApiError(404, text || "Запись не найдена. Возможно, её уже удалили.");
    case 413:
      throw new ApiError(413, "Файл слишком большой. Максимум — 8 МБ.");
    case 415:
      throw new ApiError(415, "Этот тип файла не подходит. Можно загружать только JPG, PNG или WebP.");
    case 422: {
      const fe = parseValidation(detail);
      throw new ApiError(422, text || "Проверьте поля формы — есть ошибки.", fe);
    }
    case 429:
      throw new ApiError(429, "Слишком много попыток входа. Подождите 10 минут и попробуйте снова.");
    default:
      if (res.status >= 500) throw new ApiError(res.status, "Ошибка на сервере. Попробуйте ещё раз чуть позже.");
      throw new ApiError(res.status, text || "Не удалось выполнить действие.");
  }
}

// --- вход ---
export const login = (username: string, password: string) =>
  request<{ ok: true }>("/login", { method: "POST", json: { username, password }, skipAuthRedirect: true });
export const logout = () => request<void>("/logout", { method: "POST", skipAuthRedirect: true });
export const getMe = () => request<{ username: string }>("/me");

// --- коллекции ---
export const listItems = <C extends CollectionName>(c: C) => request<CollectionMap[C][]>(`/${c}`);
export const getItem = <C extends CollectionName>(c: C, id: number) => request<CollectionMap[C]>(`/${c}/${id}`);
export const createItem = <C extends CollectionName>(c: C, data: Omit<CollectionMap[C], "id">) =>
  request<CollectionMap[C]>(`/${c}`, { method: "POST", json: data });
export const updateItem = <C extends CollectionName>(c: C, id: number, data: Omit<CollectionMap[C], "id">) =>
  request<CollectionMap[C]>(`/${c}/${id}`, { method: "PUT", json: data });
export const deleteItem = (c: CollectionName, id: number) => request<void>(`/${c}/${id}`, { method: "DELETE" });
export const reorderItems = (c: CollectionName, ids: number[]) =>
  request<void>(`/${c}/reorder`, { method: "POST", json: { ids } });

// --- настройки и страницы ---
export const getSettings = () => request<Settings>("/settings");
export const saveSettings = (s: Settings) => request<Settings>("/settings", { method: "PUT", json: s });
export const getPages = () => request<PageContent[]>("/pages");
export const savePage = (p: PageContent) =>
  request<PageContent>(`/pages/${p.slug satisfies PageSlug}`, { method: "PUT", json: p });

// --- фото ---
export const listMedia = () => request<MediaFile[]>("/media");
export function uploadMedia(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<{ url: string }>("/media", { method: "POST", form });
}
export const deleteMedia = (url: string) => request<void>("/media", { method: "DELETE", json: { url } });
