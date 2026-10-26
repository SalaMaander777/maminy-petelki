import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "@/components/admin/AdminShell";
import { LoginForm } from "@/components/admin/LoginForm";
import { mockFetch, router } from "./helpers";

vi.mock("next/navigation", async () => {
  const h = await import("./helpers");
  return { useRouter: () => h.router, usePathname: () => "/admin/products" };
});

beforeEach(() => vi.clearAllMocks());

describe("защита маршрутов", () => {
  it("без сессии (401 на /me) -> переход на вход", async () => {
    mockFetch(() => ({ status: 401, body: { detail: "Not authenticated" } }));
    render(<AdminShell>секрет</AdminShell>);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin/login?next=%2Fadmin%2Fproducts"));
    expect(screen.queryByText("секрет")).not.toBeInTheDocument();
  });

  it("с сессией показывает содержимое и меню", async () => {
    mockFetch(() => ({ body: { username: "admin" } }));
    render(<AdminShell>контент</AdminShell>);
    expect(await screen.findByText("контент")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Каталог" }).length).toBeGreaterThan(0);
  });
});

describe("вход", () => {
  it("неверный пароль -> понятная ошибка, без редиректа", async () => {
    mockFetch(() => ({ status: 401, body: { detail: "Invalid" } }));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Логин"), "admin");
    await userEvent.type(screen.getByLabelText("Пароль"), "bad");
    await userEvent.click(screen.getByRole("button", { name: "Войти" }));
    expect(await screen.findByText(/Неверный логин или пароль/)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("429 -> сообщение про попытки", async () => {
    mockFetch(() => ({ status: 429, body: { detail: "x" } }));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Логин"), "a");
    await userEvent.type(screen.getByLabelText("Пароль"), "b");
    await userEvent.click(screen.getByRole("button", { name: "Войти" }));
    expect(await screen.findByText(/Слишком много попыток/)).toBeInTheDocument();
  });

  it("успех -> переход в админку", async () => {
    mockFetch(() => ({ body: { ok: true } }));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Логин"), "a");
    await userEvent.type(screen.getByLabelText("Пароль"), "b");
    await userEvent.click(screen.getByRole("button", { name: "Войти" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin"));
  });

  it("пустые поля не отправляются", async () => {
    const { calls } = mockFetch(() => ({ body: {} }));
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Войти" }));
    expect(await screen.findByText("Введите логин")).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
});
