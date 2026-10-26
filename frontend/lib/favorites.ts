const KEY = "mp:favorites";
const EVENT = "mp:favorites-change";

export function getRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function getServerRaw(): string {
  return "[]";
}

export function parseFavorites(raw: string): string[] {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(id: string): void {
  const list = parseFavorites(getRaw());
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* localStorage недоступен — состояние не сохраняется */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
