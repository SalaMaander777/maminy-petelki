# API-контракт — «Мамины петельки»

Единственный источник правды по интерфейсу между `frontend/` и `backend/`. Менять — только через этот файл (и `frontend/lib/api-types.ts`, который его отражает). Язык сообщений об ошибках и данных — русский.

## Общее
- Backend: FastAPI + SQLModel + SQLite. Базовый префикс `/api`. JSON, UTF-8, ISO-8601 даты (`2026-11-05T15:00:00`, без часового пояса — время местное).
- Фронтенд (Next.js) проксирует `/api/*` и `/uploads/*` на backend через `rewrites` (`BACKEND_URL`, по умолчанию `http://localhost:8000`), поэтому браузер видит один origin и cookie работают без CORS.
- Публичные страницы получают данные серверно (SSR, `cache: "no-store"` или `revalidate ≤ 30`), чтобы правки из админки появлялись сразу. Если backend недоступен — страница рендерится с пустыми данными/значениями по умолчанию, не падает.
- Ошибки: HTTP-статус + `{"detail": "текст"}` (422 — `{"detail": [{"loc":[...],"msg":"..."}]}` по умолчанию FastAPI).
- `id` — целое число. Все списки отсортированы по `sort_order` (по возрастанию), затем по `id`.
- Публичные эндпоинты возвращают только записи с `is_published = true`.

## Модели

### Product (товар каталога)
`id, name, description, size, materials, lead_time, price (int ₽ | null), photo (url | null), is_published, sort_order`

### MasterClass (мастер-класс)
`id, title, description, starts_at (datetime | null), duration (string | null, «2 часа»), price (int | null), seats (int | null), signup_url (string | null), photo (url | null), is_published, sort_order`

### Project (проект / готовая работа)
`id, title, description, photo (url | null), gallery (string[] url), is_published, sort_order`

### Review (отзыв)
`id, author, text, rating (1–5 | null), photo (url | null), is_published, sort_order`

### Promo (акция)
`id, title, description, badge (string | null, «−20%»), valid_until (date | null), photo (url | null), is_published, sort_order`

### PageContent (тексты и SEO страницы)
`slug` ∈ `home | catalog | masterclasses | projects | reviews | sales`, `title` (H1), `subtitle` (string), `seo_title`, `seo_description`.
Для `home` дополнительно используются настройки героя (см. Settings).

### Settings (настройки сайта, один объект)
```
{
  "hero_title": string, "hero_text": string, "hero_cta": string,
  "hero_photo": url | null,
  "marquee": string[],                       // бегущая строка
  "menu": [{ "slug": PageSlug, "label": string, "visible": bool }],   // порядок = порядок в меню
  "contacts": { "max_url": string, "telegram_url": string, "vk_url": string },
  "footer_title": string, "footer_text": string, "copyright": string,
  "site_name": string
}
```
Пустая ссылка контакта → кнопка скрывается на сайте.

## Публичные эндпоинты (без авторизации)
| Метод | Путь | Ответ |
|---|---|---|
| GET | `/api/site` | `{ settings: Settings, pages: PageContent[] }` |
| GET | `/api/products` | `Product[]` |
| GET | `/api/masterclasses` | `MasterClass[]` (прошедшие скрывать не нужно — решает админ) |
| GET | `/api/projects` | `Project[]` |
| GET | `/api/reviews` | `Review[]` |
| GET | `/api/promos` | `Promo[]` (с `valid_until` в прошлом не отдавать) |
| GET | `/api/health` | `{"status":"ok"}` |

## Авторизация администратора
- Один администратор из окружения: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (bcrypt/argon2) — или `ADMIN_PASSWORD` для первого запуска (хешируется при сидировании; в логах не печатать). `SECRET_KEY` — подпись сессий.
- `POST /api/admin/login` `{username, password}` → 200 `{ "ok": true }` + cookie `session` (`HttpOnly`, `SameSite=Lax`, `Secure` в prod, срок 12 ч). Неверно → 401. Ограничение попыток: ≥5 неудач с одного IP за 10 минут → 429 на 10 минут.
- `POST /api/admin/logout` → удаляет cookie. `GET /api/admin/me` → `{ "username": string }` или 401.
- Все `/api/admin/*` (кроме login) требуют сессии, иначе 401. Изменяющие запросы (POST/PUT/DELETE) проверяют заголовок `Origin`/`Host` на совпадение (защита от CSRF).

## Админ-эндпоинты (нужна сессия)
Коллекции `products | masterclasses | projects | reviews | promos`:
| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/admin/{collection}` | все записи (включая скрытые) |
| POST | `/api/admin/{collection}` | создать (тело — модель без `id`), 201 + запись |
| GET | `/api/admin/{collection}/{id}` | одна запись |
| PUT | `/api/admin/{collection}/{id}` | полностью заменить поля, 200 + запись |
| DELETE | `/api/admin/{collection}/{id}` | удалить, 204 |
| POST | `/api/admin/{collection}/reorder` | `{ "ids": [3,1,2] }` → переписать `sort_order`, 204 |

Остальное:
| Метод | Путь | Описание |
|---|---|---|
| GET/PUT | `/api/admin/settings` | прочитать / сохранить Settings целиком |
| GET | `/api/admin/pages` | `PageContent[]` |
| PUT | `/api/admin/pages/{slug}` | сохранить PageContent |
| POST | `/api/admin/media` | `multipart/form-data`, поле `file` → 201 `{ "url": "/uploads/<имя>.webp" }` |
| GET | `/api/admin/media` | список загруженных `[{ "url", "size", "created_at" }]` |
| DELETE | `/api/admin/media` | `{ "url": "/uploads/..." }` → 204 (404 если нет) |

### Загрузка изображений
- Разрешены `image/jpeg`, `image/png`, `image/webp`; ≤ 8 МБ; проверять содержимое (Pillow), а не только расширение. Имя файла — случайное (uuid), исходное имя не используется. Большие изображения уменьшать до ширины ≤ 1920 px и сохранять в WebP. Файлы лежат в `UPLOADS_DIR` (по умолчанию `backend/uploads`, в `.gitignore`) и отдаются по `/uploads/*`.
- 415 — недопустимый тип, 413 — слишком большой файл.

### Валидация
- Идентификаторы в путях и `sort_order` — целые 1…2147483647 (иначе 404/422, не 500). В `settings.menu` каждый `slug` встречается не более одного раза (иначе 422).
- Строки: обрезать пробелы; `name/title/author/text` — обязательные, 1–200 символов (`description`/`text` до 5000); `price ≥ 0`; `rating` 1–5; URL ссылок — только `http(s)://` или пустая строка; пути фото — только `/uploads/…` или `https://`.

## Сид и окружение
- При первом запуске создаются: Settings и PageContent со значениями по умолчанию (тексты из `docs/design-spec.md`, меню из 5 пунктов), администратор из окружения. Демо-контент — только по команде `python -m app.seed --demo` (6 изделий-примеров), в продакшене не запускать.
- `.env.example`: `SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `DATABASE_URL=sqlite:///./data/app.db`, `UPLOADS_DIR`, `BACKEND_URL`, `COOKIE_SECURE`, `NEXT_PUBLIC_SITE_URL`.
