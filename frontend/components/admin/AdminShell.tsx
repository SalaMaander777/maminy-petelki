"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, getMe, logout, setUnauthorizedHandler } from "@/lib/admin-api";
import { COLLECTIONS, COLLECTION_ORDER } from "@/lib/admin-collections";
import { Button, Loading, ToastProvider, cx } from "./ui";
import { DirtyContext, UNSAVED_TEXT } from "./unsaved";

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/settings", label: "Главная и настройки" },
  { href: "/admin/pages", label: "Тексты страниц и SEO" },
  ...COLLECTION_ORDER.map((c) => ({ href: `/admin/${c}`, label: COLLECTIONS[c].label })),
  { href: "/admin/media", label: "Фото" },
];

function isActive(path: string, href: string) {
  return href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const dirty = useRef(false);
  const [state, setState] = useState<"checking" | "ok" | "error">("checking");
  const [user, setUser] = useState("");
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const setMenuOpen = (v: boolean | ((o: boolean) => boolean)) => setMenuPath((cur) => ((typeof v === "function" ? v(cur === pathname) : v) ? pathname : null));
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  // 401 из любого запроса -> экран входа
  useEffect(() => {
    setUnauthorizedHandler(() => {
      dirty.current = false;
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    });
    return () => setUnauthorizedHandler(null);
  }, [router, pathname]);

  // проверка сессии
  useEffect(() => {
    let alive = true;
    getMe()
      .then((m) => {
        if (!alive) return;
        setUser(m.username);
        setState("ok");
      })
      .catch((e) => {
        if (!alive || (e instanceof ApiError && e.status === 401)) return; // редирект уже сделан обработчиком
        setError(e instanceof ApiError ? e.message : "Не удалось проверить вход.");
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  // предупреждение о несохранённых изменениях при клике по внутренним ссылкам
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dirty.current || e.defaultPrevented) return;
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      if (a.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm(UNSAVED_TEXT)) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        dirty.current = false;
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  async function onLogout() {
    if (dirty.current && !window.confirm(UNSAVED_TEXT)) return;
    dirty.current = false;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      /* всё равно уходим на вход */
    }
    router.replace("/admin/login");
  }

  if (state === "checking") {
    return (
      <div className="mx-auto max-w-md p-6">
        <Loading text="Проверяем вход…" />
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <p role="alert" className="font-semibold text-[#7a1319]">
          {error}
        </p>
        <Button onClick={() => window.location.reload()}>Попробовать снова</Button>
      </div>
    );
  }

  const nav = (
    <nav aria-label="Разделы админ-панели">
      <ul className="space-y-1">
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-11 items-center rounded-xl px-3 py-2 text-base font-semibold",
                  active ? "bg-burgundy text-bg" : "text-ink hover:bg-pink-soft",
                )}
              >
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <DirtyContext.Provider value={dirty}>
      <ToastProvider>
        <div className="min-h-screen bg-bg text-ink md:flex">
          <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[80] focus:rounded-lg focus:bg-white focus:p-3">
            К содержимому
          </a>
          {/* десктоп: боковое меню */}
          <aside className="hidden w-72 shrink-0 border-r border-line bg-white p-4 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:justify-between md:overflow-y-auto">
            <div className="space-y-4">
              <p className="px-3 text-lg font-extrabold text-burgundy">Мамины петельки</p>
              {nav}
            </div>
            <div className="space-y-2 border-t border-line pt-3">
              <p className="px-3 text-sm text-muted">Вы вошли как {user}</p>
              <a href="/" target="_blank" rel="noopener" className="flex min-h-11 items-center px-3 font-semibold text-burgundy underline">
                Открыть сайт
              </a>
              <Button variant="secondary" busy={loggingOut} onClick={onLogout} className="w-full">
                Выйти
              </Button>
            </div>
          </aside>

          {/* телефон: верхняя панель + выдвижное меню */}
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-white px-3 py-2 md:hidden">
            <p className="font-extrabold text-burgundy">Мамины петельки</p>
            <Button variant="secondary" aria-expanded={menuOpen} aria-controls="admin-drawer" onClick={() => setMenuOpen((o) => !o)}>
              {menuOpen ? "Закрыть" : "Меню"}
            </Button>
          </header>
          {menuOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <button type="button" aria-label="Закрыть меню" className="absolute inset-0 bg-ink/50" onClick={() => setMenuOpen(false)} />
              <div id="admin-drawer" className="absolute inset-y-0 right-0 flex w-[85%] max-w-sm flex-col justify-between overflow-y-auto bg-white p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-burgundy">Разделы</p>
                    <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                      Закрыть
                    </Button>
                  </div>
                  {nav}
                </div>
                <div className="mt-6 space-y-2 border-t border-line pt-3">
                  <p className="text-sm text-muted">Вы вошли как {user}</p>
                  <a href="/" target="_blank" rel="noopener" className="flex min-h-11 items-center font-semibold text-burgundy underline">
                    Открыть сайт
                  </a>
                  <Button variant="secondary" busy={loggingOut} onClick={onLogout} className="w-full">
                    Выйти
                  </Button>
                </div>
              </div>
            </div>
          )}

          <main id="admin-main" className="min-w-0 grow p-4 pb-24 md:p-8">
            <div className="mx-auto max-w-4xl">{children}</div>
          </main>
        </div>
      </ToastProvider>
    </DirtyContext.Provider>
  );
}
