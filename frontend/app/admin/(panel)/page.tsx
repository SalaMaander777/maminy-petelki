import Link from "next/link";
import { COLLECTIONS, COLLECTION_ORDER } from "@/lib/admin-collections";

const items = [
  { href: "/admin/settings", title: "Главная и настройки", text: "Заголовок и фото на главной, бегущая строка, меню, контакты, подвал." },
  { href: "/admin/pages", title: "Тексты страниц и SEO", text: "Заголовки страниц и описания для поисковиков." },
  ...COLLECTION_ORDER.map((c) => ({ href: `/admin/${c}`, title: COLLECTIONS[c].label, text: "Добавить, изменить, скрыть, удалить, поменять порядок." })),
  { href: "/admin/media", title: "Фото", text: "Загруженные картинки: добавить и удалить." },
];

export default function AdminHome() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-extrabold text-burgundy md:text-3xl">Что хотите изменить?</h1>
      <p className="mb-5 text-muted">Выберите раздел. Все изменения сразу появляются на сайте после сохранения.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="block h-full min-h-11 rounded-2xl border border-line bg-white p-4 hover:border-burgundy">
              <span className="block text-lg font-bold text-burgundy">{i.title}</span>
              <span className="block text-sm text-muted">{i.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
