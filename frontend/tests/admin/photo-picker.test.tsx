import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoPicker } from "@/components/admin/PhotoPicker";
import { UploadZone } from "@/components/admin/UploadZone";
import { mockFetch } from "./helpers";

beforeEach(() => vi.clearAllMocks());

const file = (name: string, type: string, size = 100) => {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("загрузка фото", () => {
  it("отказывает при размере > 8 МБ, не отправляя запрос", async () => {
    const { calls } = mockFetch(() => ({ status: 201, body: { url: "/uploads/a.webp" } }));
    const onUploaded = vi.fn();
    render(<UploadZone onUploaded={onUploaded} />);
    await userEvent.upload(screen.getByTestId("file-input"), file("big.jpg", "image/jpeg", 9 * 1024 * 1024));
    expect(await screen.findByRole("alert")).toHaveTextContent(/слишком большой/);
    expect(calls).toHaveLength(0);
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("отказывает для не-картинки", async () => {
    const { calls } = mockFetch(() => ({ status: 201, body: {} }));
    render(<UploadZone onUploaded={vi.fn()} />);
    const input = screen.getByTestId("file-input");
    // accept фильтрует в браузере; в тесте обходим, чтобы проверить проверку в коде
    await userEvent.upload(input, file("doc.pdf", "application/pdf"), { applyAccept: false });
    expect(await screen.findByRole("alert")).toHaveTextContent(/JPG, PNG или WebP/);
    expect(calls).toHaveLength(0);
  });

  it("загружает корректный файл", async () => {
    const { calls } = mockFetch(() => ({ status: 201, body: { url: "/uploads/a.webp" } }));
    const onUploaded = vi.fn();
    render(<UploadZone onUploaded={onUploaded} />);
    await userEvent.upload(screen.getByTestId("file-input"), file("ok.png", "image/png"));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(["/uploads/a.webp"]));
    expect(calls[0].url).toBe("/api/admin/media");
    expect(calls[0].init?.body).toBeInstanceOf(FormData);
  });

  it("ошибка 413 от сервера показана понятным текстом", async () => {
    mockFetch(() => ({ status: 413, body: { detail: "too big" } }));
    render(<UploadZone onUploaded={vi.fn()} />);
    await userEvent.upload(screen.getByTestId("file-input"), file("ok.png", "image/png"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/слишком большой/);
  });
});

describe("PhotoPicker", () => {
  it("убрать фото -> onChange(null)", async () => {
    const onChange = vi.fn();
    render(<PhotoPicker value="/uploads/a.webp" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Убрать фото" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("выбор из загруженных", async () => {
    mockFetch(() => ({ body: [{ url: "/uploads/b.webp", size: 10, created_at: "" }] }));
    const onChange = vi.fn();
    render(<PhotoPicker value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Добавить фото" }));
    await userEvent.click(await screen.findByRole("button", { name: "Выбрать это фото" }));
    expect(onChange).toHaveBeenCalledWith("/uploads/b.webp");
  });
});
