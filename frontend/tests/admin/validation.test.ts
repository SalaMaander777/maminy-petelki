import { describe, expect, it } from "vitest";
import { COLLECTIONS, emptyFormState, toFormState, toPayload, validateForm } from "@/lib/admin-collections";
import { moveItem, validateImageFile, validateOptionalUrl } from "@/lib/admin-validation";
import { parseValidation } from "@/lib/admin-api";

describe("validateImageFile", () => {
  it("принимает jpg/png/webp до 8 МБ", () => {
    expect(validateImageFile({ name: "a.jpg", size: 1000, type: "image/jpeg" })).toBeNull();
    expect(validateImageFile({ name: "a.webp", size: 8 * 1024 * 1024, type: "image/webp" })).toBeNull();
  });
  it("отклоняет большие и не-картинки", () => {
    expect(validateImageFile({ name: "a.jpg", size: 8 * 1024 * 1024 + 1, type: "image/jpeg" })).toMatch(/8 МБ/);
    expect(validateImageFile({ name: "a.pdf", size: 10, type: "application/pdf" })).toMatch(/JPG, PNG или WebP/);
  });
});

describe("прочее", () => {
  it("ссылки: пусто ок, только http(s)", () => {
    expect(validateOptionalUrl("")).toBeNull();
    expect(validateOptionalUrl("https://t.me/x")).toBeNull();
    expect(validateOptionalUrl("javascript:alert(1)")).not.toBeNull();
    expect(validateOptionalUrl("t.me/x")).not.toBeNull();
  });
  it("moveItem", () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
  });
  it("422 -> ошибки по полям на русском", () => {
    const r = parseValidation([{ loc: ["body", "name"], msg: "String should have at least 1 character" }]);
    expect(r.name).toBe("Заполните это поле");
  });
});

describe("форма коллекций", () => {
  const def = COLLECTIONS.products;
  it("название обязательно, цена — число", () => {
    const s = emptyFormState(def);
    expect(validateForm(def, s).name).toBeTruthy();
    s.values.name = "Плед";
    s.values.price = "12 000";
    expect(validateForm(def, s).price).toBeTruthy();
    s.values.price = "12000";
    expect(validateForm(def, s)).toEqual({});
  });
  it("payload: пустые числа -> null, trim, sort_order", () => {
    const s = emptyFormState(def);
    s.values.name = "  Плед ";
    const p = toPayload(def, s, 4) as unknown as Record<string, unknown>;
    expect(p).toMatchObject({ name: "Плед", price: null, photo: null, is_published: true, sort_order: 4 });
  });
  it("дата и время: datetime-local <-> ISO", () => {
    const d = COLLECTIONS.masterclasses;
    const s = toFormState(d, { title: "x", starts_at: "2026-11-05T15:00:00", is_published: true });
    expect(s.values.starts_at).toBe("2026-11-05T15:00");
    s.values.title = "x";
    expect((toPayload(d, s, 0) as unknown as Record<string, unknown>).starts_at).toBe("2026-11-05T15:00:00");
  });
});
