import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionList } from "@/components/admin/CollectionList";
import { ToastProvider } from "@/components/admin/ui";
import { mockFetch } from "./helpers";

const base = { description: "", size: "", materials: "", lead_time: "", price: null, photo: null };
const data = [
  { id: 1, name: "Плед", is_published: true, sort_order: 0, ...base },
  { id: 2, name: "Шапка", is_published: true, sort_order: 1, ...base },
];

function setup() {
  const m = mockFetch((url, init) => {
    if (url.endsWith("/products") && init?.method === "GET") return { body: data };
    if (url.endsWith("/reorder")) return { status: 204 };
    if (init?.method === "PUT") return { body: {} };
    if (init?.method === "DELETE") return { status: 204 };
  });
  render(
    <ToastProvider>
      <CollectionList collection="products" />
    </ToastProvider>,
  );
  return m;
}
beforeEach(() => vi.clearAllMocks());

describe("список", () => {
  it("скрывает запись переключателем (PUT с is_published=false)", async () => {
    const { calls } = setup();
    await userEvent.click(await screen.findByRole("switch", { name: /Плед/ }));
    await waitFor(() => expect(calls.some((c) => c.init?.method === "PUT")).toBe(true));
    const put = calls.find((c) => c.init?.method === "PUT")!;
    expect(put.url).toBe("/api/admin/products/1");
    expect(JSON.parse(String(put.init?.body)).is_published).toBe(false);
    expect(screen.getByText("Скрыто")).toBeInTheDocument();
  });

  it("удаление требует подтверждения", async () => {
    const { calls } = setup();
    await userEvent.click(await screen.findByRole("button", { name: "Удалить «Плед»" }));
    expect(calls.some((c) => c.init?.method === "DELETE")).toBe(false);
    const dlg = screen.getByRole("dialog");
    await userEvent.click(within(dlg).getByRole("button", { name: "Удалить" }));
    await waitFor(() => expect(screen.queryByText("Плед")).not.toBeInTheDocument());
    expect(calls.find((c) => c.init?.method === "DELETE")!.url).toBe("/api/admin/products/1");
  });

  it("отмена удаления ничего не удаляет", async () => {
    const { calls } = setup();
    await userEvent.click(await screen.findByRole("button", { name: "Удалить «Плед»" }));
    await userEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(calls.some((c) => c.init?.method === "DELETE")).toBe(false);
    expect(screen.getByText("Плед")).toBeInTheDocument();
  });

  it("перемещение ниже отправляет reorder", async () => {
    const { calls } = setup();
    await userEvent.click(await screen.findByRole("button", { name: "Переместить «Плед» ниже" }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/reorder"))).toBe(true));
    expect(JSON.parse(String(calls.find((c) => c.url.endsWith("/reorder"))!.init?.body))).toEqual({ ids: [2, 1] });
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Шапка");
  });

  it("поиск фильтрует по названию", async () => {
    setup();
    await userEvent.type(await screen.findByLabelText("Поиск по названию"), "шап");
    expect(screen.queryByText("Плед")).not.toBeInTheDocument();
    expect(screen.getByText("Шапка")).toBeInTheDocument();
  });
});
