import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "@/components/EmptyState";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MasterClassCard } from "@/components/MasterClassCard";
import { Marquee } from "@/components/Marquee";
import { ProductCard } from "@/components/ProductCard";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { ReviewCard } from "@/components/ReviewCard";
import { PromoCard } from "@/components/PromoCard";
import type { MasterClass, Product, Project } from "@/lib/api-types";
import { DEFAULT_SETTINGS, DEFAULT_MENU, visibleMenu } from "@/lib/site";

const pathname = "/catalog";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const product: Product = {
  id: 1, name: "Плед", description: "Тёплый плед", size: "150×200 см", materials: "мериносовая шерсть",
  lead_time: "3 недели", price: 12000, photo: null, is_published: true, sort_order: 0,
};

const mc: MasterClass = {
  id: 1, title: "Вяжем шарф", description: "Для начинающих", starts_at: "2026-11-05T15:00:00", duration: "2 часа",
  price: 1500, seats: 8, signup_url: null, photo: null, is_published: true, sort_order: 0,
};

describe("Header", () => {
  it("по умолчанию 5 пунктов, ведущих на реальные маршруты, текущий отмечен", () => {
    render(<Header />);
    const nav = screen.getByRole("navigation", { name: "Основное меню" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Каталог", "Мастер-классы", "Проекты", "Отзывы", "Акции"]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/catalog", "/masterclasses", "/projects", "/reviews", "/sales"]);
    expect(within(nav).getByRole("link", { name: "Каталог" })).toHaveAttribute("aria-current", "page");
  });

  it("учитывает подписи, порядок и скрытие из настроек", () => {
    const menu = [
      { slug: "sales" as const, label: "Скидки", visible: true },
      { slug: "catalog" as const, label: "Изделия", visible: true },
      { slug: "reviews" as const, label: "Отзывы", visible: false },
    ];
    render(<Header items={visibleMenu(menu)} />);
    const links = within(screen.getByRole("navigation")).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Скидки", "Изделия"]);
  });

  it("visibleMenu по умолчанию даёт 5 пунктов", () => {
    expect(visibleMenu(DEFAULT_MENU)).toHaveLength(5);
  });
});

describe("Footer", () => {
  it("скрывает кнопки с пустыми ссылками", () => {
    render(<Footer settings={{ ...DEFAULT_SETTINGS, contacts: { max_url: "", telegram_url: "https://t.me/x", vk_url: "" } }} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "https://t.me/x");
  });

  it("скрывает весь блок кнопок, если все ссылки пусты", () => {
    render(<Footer settings={DEFAULT_SETTINGS} />);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("берёт заголовок, текст и копирайт из настроек", () => {
    render(<Footer settings={{ ...DEFAULT_SETTINGS, footer_title: "Связь", footer_text: "Пишите", copyright: "© 2026" }} />);
    expect(screen.getByRole("heading", { name: "Связь" })).toBeInTheDocument();
    expect(screen.getByText("Пишите")).toBeInTheDocument();
    expect(screen.getByText("© 2026")).toBeInTheDocument();
  });
});

describe("Marquee", () => {
  it("не рендерится при пустом списке", () => {
    const { container } = render(<Marquee words={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("рендерит слова", () => {
    render(<Marquee words={["Ручная работа"]} />);
    expect(screen.getAllByText("Ручная работа").length).toBeGreaterThan(1);
  });
});

describe("ProductCard", () => {
  it("показывает размер, материалы, срок и цену", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText("150×200 см")).toBeInTheDocument();
    expect(screen.getByText("мериносовая шерсть")).toBeInTheDocument();
    expect(screen.getByText("3 недели")).toBeInTheDocument();
    expect(screen.getByText("12 000 ₽")).toBeInTheDocument();
  });

  it("сердечко переключается и сохраняется в localStorage", async () => {
    const user = userEvent.setup();
    render(<ProductCard product={product} />);
    const btn = screen.getByRole("button", { name: "Сохранить: Плед" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(JSON.parse(window.localStorage.getItem("mp:favorites") ?? "[]")).toEqual(["1"]);
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("без цены показывает «По запросу», пустые поля не выводит", () => {
    render(<ProductCard product={{ ...product, price: null, size: "" }} />);
    expect(screen.getByText("По запросу")).toBeInTheDocument();
    expect(screen.queryByText("Размер")).toBeNull();
  });
});

describe("EmptyState", () => {
  it("показывает дружелюбное сообщение", () => {
    render(<EmptyState />);
    expect(screen.getByRole("status")).toHaveTextContent("Скоро здесь появятся изделия — загляните позже");
  });
});

describe("MasterClassCard", () => {
  const now = new Date(2026, 9, 26);
  it("форматирует дату «5 ноября, 15:00» и показывает детали", () => {
    render(<MasterClassCard item={mc} now={now} />);
    expect(screen.getByText("5 ноября, 15:00")).toBeInTheDocument();
    expect(screen.getByText("2 часа")).toBeInTheDocument();
    expect(screen.getByText("1 500 ₽")).toBeInTheDocument();
    expect(screen.getByText("8 мест")).toBeInTheDocument();
  });
  it("кнопка ведёт к контактам, если нет signup_url", () => {
    render(<MasterClassCard item={mc} now={now} />);
    expect(screen.getByRole("link", { name: "Записаться" })).toHaveAttribute("href", "#contacts");
  });
  it("использует signup_url", () => {
    render(<MasterClassCard item={{ ...mc, signup_url: "https://example.com/s" }} now={now} />);
    expect(screen.getByRole("link", { name: "Записаться" })).toHaveAttribute("href", "https://example.com/s");
  });
  it("помечает прошедший «Прошёл» и убирает запись", () => {
    render(<MasterClassCard item={{ ...mc, starts_at: "2026-01-05T15:00:00" }} now={now} />);
    expect(screen.getByText("Прошёл")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Записаться" })).toBeNull();
  });
  it("предстоящий без пометки", () => {
    render(<MasterClassCard item={mc} now={now} />);
    expect(screen.queryByText("Прошёл")).toBeNull();
  });
});

describe("ReviewCard и PromoCard", () => {
  it("отзыв: звёзды с текстовой оценкой", () => {
    render(<ReviewCard item={{ id: 1, author: "Анна", text: "Супер", rating: 4, photo: null, is_published: true, sort_order: 0 }} />);
    expect(screen.getByRole("img", { name: "Оценка: 4 из 5" })).toBeInTheDocument();
    expect(screen.getByText("Анна")).toBeInTheDocument();
  });
  it("отзыв без рейтинга — без звёзд", () => {
    render(<ReviewCard item={{ id: 1, author: "Анна", text: "Супер", rating: null, photo: null, is_published: true, sort_order: 0 }} />);
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("акция: бейдж и «действует до»", () => {
    render(<PromoCard item={{ id: 1, title: "Скидка", description: "d", badge: "−20%", valid_until: "2026-12-31", photo: null, is_published: true, sort_order: 0 }} />);
    expect(screen.getByText("−20%")).toBeInTheDocument();
    expect(screen.getByText(/Действует до/)).toHaveTextContent("31 декабря");
  });
});

describe("ProjectsGrid", () => {
  const project: Project = { id: 1, title: "Плед для дома", description: "О проекте", photo: null, gallery: ["/uploads/a.webp"], is_published: true, sort_order: 0 };
  it("открывает и закрывает модальное окно с галереей", async () => {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
    const user = userEvent.setup();
    render(<ProjectsGrid projects={[project]} gridClass="" />);
    await user.click(screen.getByRole("button", { name: /Плед для дома/ }));
    const dialog = screen.getByRole("dialog", { name: "Плед для дома" });
    expect(within(dialog).getByAltText("Плед для дома — фото 1")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
