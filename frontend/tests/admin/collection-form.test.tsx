import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { ToastProvider } from "@/components/admin/ui";
import { mockFetch, router } from "./helpers";

vi.mock("next/navigation", async () => {
  const h = await import("./helpers");
  return { useRouter: () => h.router, usePathname: () => "/admin/products/new" };
});

const wrap = (ui: React.ReactElement) => render(<ToastProvider>{ui}</ToastProvider>);

beforeEach(() => vi.clearAllMocks());

describe("форма изделия", () => {
  it("не отправляет без названия и показывает ошибку", async () => {
    const { calls } = mockFetch((url) => (url.endsWith("/products") ? { body: [] } : undefined));
    wrap(<CollectionForm collection="products" />);
    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findAllByText("Заполните это поле")).not.toHaveLength(0);
    expect(calls.some((c) => c.init?.method === "POST")).toBe(false);
  });

  it("отправляет POST с данными и уходит к списку", async () => {
    const { calls } = mockFetch((url, init) => {
      if (init?.method === "POST") return { status: 201, body: { id: 1 } };
      if (url.endsWith("/products")) return { body: [{ id: 5, sort_order: 2 }] };
    });
    wrap(<CollectionForm collection="products" />);
    await userEvent.type(screen.getByLabelText(/Название/), "Плед");
    await userEvent.type(screen.getByLabelText(/Цена/), "12000");
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/products"))).toBe(true));
    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/admin/products"));
    const post = calls.find((c) => c.init?.method === "POST")!;
    expect(post.url).toBe("/api/admin/products");
    expect(post.init?.credentials).toBe("same-origin");
    expect(JSON.parse(String(post.init?.body))).toMatchObject({ name: "Плед", price: 12000, is_published: true, sort_order: 3 });
  });

  it("показывает 422 под полями", async () => {
    mockFetch((url, init) => {
      if (init?.method === "POST") return { status: 422, body: { detail: [{ loc: ["body", "name"], msg: "String should have at most 200 characters" }] } };
      if (url.endsWith("/products")) return { body: [] };
    });
    wrap(<CollectionForm collection="products" />);
    await userEvent.type(screen.getByLabelText(/Название/), "Плед");
    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Слишком длинное значение")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});
