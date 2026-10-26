import { vi } from "vitest";

type Handler = (url: string, init?: RequestInit) => { status?: number; body?: unknown } | undefined;

/** Мок fetch: handler возвращает ответ по URL; все вызовы пишутся в calls. */
export function mockFetch(handler: Handler) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, init });
    const r = handler(u, init) ?? { status: 404, body: { detail: "Не найдено" } };
    const status = r.status ?? 200;
    return new Response(status === 204 ? null : JSON.stringify(r.body ?? {}), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fn);
  return { calls, fn };
}

export const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() };
