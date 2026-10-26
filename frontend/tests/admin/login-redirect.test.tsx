import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/admin/LoginForm";
import { mockFetch, router } from "./helpers";

vi.mock("next/navigation", async () => {
  const h = await import("./helpers");
  return { useRouter: () => h.router, usePathname: () => "/admin/login" };
});

beforeEach(() => vi.clearAllMocks());

async function loginWith(next: string | undefined) {
  mockFetch(() => ({ body: { ok: true } }));
  render(<LoginForm next={next} />);
  await userEvent.type(screen.getByLabelText("Логин"), "admin");
  await userEvent.type(screen.getByLabelText("Пароль"), "pw");
  await userEvent.click(screen.getByRole("button", { name: "Войти" }));
  await waitFor(() => expect(router.replace).toHaveBeenCalled());
  return router.replace.mock.calls[0][0] as string;
}

describe("защита от открытого редиректа (next)", () => {
  it.each([
    ["https://evil.com", "/admin"],
    ["//evil.com", "/admin"],
    ["///evil.com", "/admin"],
    ["/\\evil.com", "/admin"],
    ["javascript:alert(1)", "/admin"],
    ["/evil", "/admin"],
    ["evil.com/admin", "/admin"],
    ["/admin/login", "/admin"],
    ["/admin/login?next=/admin", "/admin"],
    ["", "/admin"],
    [undefined, "/admin"],
  ])("next=%j -> %s", async (next, expected) => {
    expect(await loginWith(next)).toBe(expected);
  });

  it("нормальный путь админки сохраняется", async () => {
    expect(await loginWith("/admin/products/3")).toBe("/admin/products/3");
  });
});
