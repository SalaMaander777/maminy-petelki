const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

const RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

/** «5 ноября, 15:00» из «2026-11-05T15:00:00» (время местное, без пересчёта часовых поясов). */
export function formatDateTime(iso: string | null | undefined): string {
  const m = iso ? RE.exec(iso) : null;
  if (!m) return "";
  const day = Number(m[3]);
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return "";
  return m[4] ? `${day} ${month}, ${m[4]}:${m[5]}` : `${day} ${month}`;
}

/** «31 декабря» / «31 декабря 2027», если год не текущий. */
export function formatDate(iso: string | null | undefined, now: Date = new Date()): string {
  const m = iso ? RE.exec(iso) : null;
  if (!m) return "";
  const base = formatDateTime(`${m[1]}-${m[2]}-${m[3]}`);
  return Number(m[1]) === now.getFullYear() ? base : `${base} ${m[1]}`;
}

/** Прошло ли событие (время местное). Без даты — не прошло. */
export function isPast(iso: string | null | undefined, now: Date = new Date()): boolean {
  const m = iso ? RE.exec(iso) : null;
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 23), Number(m[5] ?? 59));
  return d.getTime() < now.getTime();
}

export function formatPrice(price: number | null | undefined): string {
  if (price == null) return "";
  return `${new Intl.NumberFormat("ru-RU").format(price).replace(/ /g, " ")} ₽`;
}

export function seatsLabel(n: number): string {
  const a = n % 10, b = n % 100;
  const w = a === 1 && b !== 11 ? "место" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "места" : "мест";
  return `${n} ${w}`;
}

/** Мастер-классы: предстоящие по порядку, прошедшие — вниз (порядок внутри групп сохраняется). */
export function sortPastLast<T extends { starts_at: string | null }>(items: T[], now: Date = new Date()): T[] {
  const up = items.filter((i) => !isPast(i.starts_at, now));
  const past = items.filter((i) => isPast(i.starts_at, now));
  return [...up, ...past];
}
