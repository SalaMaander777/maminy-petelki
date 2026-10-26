# Мамины петельки

Сайт-визитка компании «Мамины петельки» (вязаные изделия ручной работы) с админ-панелью, через которую владелица сама управляет всем контентом: каталог, мастер-классы, проекты, отзывы, акции, тексты, контакты, SEO-данные и фото. Язык интерфейса и текстов — русский.

## Архитектура

```
Браузер ──► [Caddy: HTTPS, gzip/zstd, кэш]  (опционально, профиль proxy)
               │
               ▼
          frontend (Next.js, :3000)  ── rewrites /api/* и /uploads/* ──►  backend (FastAPI, :8000)
                                                                              │
                                                                  SQLite (data/) + фото (uploads/)
```

- **frontend/** — Next.js (App Router), TypeScript, Tailwind, Framer Motion. Страницы рендерятся на сервере и берут контент из API. Браузер видит один домен: запросы `/api` и `/uploads` Next.js проксирует на backend, поэтому backend наружу не публикуется.
- **backend/** — FastAPI + SQLModel/SQLite. Публичное чтение контента, админ-API (cookie-сессия, один администратор из окружения), загрузка фото (конвертируются в webp).
- Деплой — Docker / docker-compose.

## Быстрый старт локально

Нужны Python 3.12 и Node.js LTS.

```bash
cp .env.example .env          # значения для разработки можно не менять

# backend (http://localhost:8000)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
ADMIN_PASSWORD=change-me uvicorn app.main:app --reload --port 8000   # или задайте пароль в .env

# frontend (http://localhost:3000) — в другом терминале
cd frontend
npm ci
npm run dev
```

Админка: `http://localhost:3000/admin` (логин `ADMIN_USERNAME`, по умолчанию `admin`).

Тесты и проверки:

```bash
cd backend && ruff check . && pytest
cd frontend && npm run lint && npm test && npm run build
```

## Запуск через Docker

```bash
cp .env.example .env
# Заполните в .env: ENVIRONMENT=production, SECRET_KEY, ADMIN_PASSWORD (или ADMIN_PASSWORD_HASH),
# NEXT_PUBLIC_SITE_URL (публичный адрес сайта), при HTTPS — COOKIE_SECURE=true
docker compose up -d --build
docker compose ps            # оба сервиса должны быть healthy
```

Сайт: `http://localhost:3000`. Если порт занят, задайте `FRONTEND_PORT=3100` (и поправьте `NEXT_PUBLIC_SITE_URL`, он же используется для проверки Origin при входе в админку, затем пересоберите: `docker compose build frontend`).

Важно:
- `NEXT_PUBLIC_*` вшиваются в frontend при сборке; после их изменения пересоберите образ.
- Backend доступен только внутри сети compose; в compose автоматически задаются `TRUST_PROXY=true`, `ALLOWED_ORIGINS` (по умолчанию = `NEXT_PUBLIC_SITE_URL`), пути БД и uploads.
- Данные хранятся в именованных томах `app_data` (БД) и `app_uploads` (фото).
- Если порт 3000 открыт в интернет напрямую (без Caddy), заголовок `X-Forwarded-For` можно подделать и обойти лимит попыток входа. По умолчанию в compose порт открыт только на `127.0.0.1` (`FRONTEND_HOST`); не меняйте это, если сайт выставлен в интернет.
- Вход в админку работает только с адресов из `ALLOWED_ORIGINS` (по умолчанию — `NEXT_PUBLIC_SITE_URL`). Если сайт открывается и с `www.`, и без, перечислите оба адреса через запятую, иначе сохранение в админке вернёт 403.

## HTTPS (Caddy)

1. Направьте DNS-запись домена на IP сервера, откройте порты 80 и 443 (tcp и udp).
2. В `.env`: `SITE_DOMAIN=example.ru`, `NEXT_PUBLIC_SITE_URL=https://example.ru`, `COOKIE_SECURE=true`, `FRONTEND_HOST=127.0.0.1`.
3. `docker compose --profile proxy up -d --build`

Caddy сам получает и продлевает сертификат Let's Encrypt, сжимает ответы (gzip/zstd) и ставит кэш-заголовки (`/_next/static` — immutable, `/uploads` — 30 дней). Конфигурация — `Caddyfile`. Подробности — в комментариях `Caddyfile` и `docker-compose.yml`.

## Администратор и пароль

Единственный администратор задаётся окружением: `ADMIN_USERNAME` и `ADMIN_PASSWORD` либо `ADMIN_PASSWORD_HASH` (bcrypt, предпочтительно в проде):

```bash
python -c "import bcrypt,getpass; print(bcrypt.hashpw(getpass.getpass().encode(), bcrypt.gensalt()).decode())"
```

Смена пароля: поменяйте значение в `.env` и перезапустите backend (`docker compose up -d backend`). Смена `SECRET_KEY` разлогинивает все сессии. В `.env` для compose символы `$` в хеше берите в одинарные кавычки или удваивайте. После 5 неудачных входов за 10 минут IP блокируется на 10 минут.

## Демо-данные

Для разработки можно залить примерные товары, отзывы, акции и т. д.:

```bash
cd backend && python -m app.seed --demo
# в Docker: docker compose exec backend python -m app.seed --demo
```

**В продакшене этого делать не нужно** (при `ENVIRONMENT=production` команда сама откажется работать, поэтому в Docker для демо временно запускайте с `ENVIRONMENT=development`): демо-записи содержат вымышленные тексты и цены и попадут на публичный сайт. Базовые тексты страниц создаются автоматически при первом запуске, остальное владелица добавляет через админку.

## Резервное копирование

Нужно сохранять БД и фото:

```bash
mkdir -p backup
docker compose run --rm --no-deps -v "$PWD/backup:/backup" backend \
  sh -c 'python -c "import sqlite3; s=sqlite3.connect(\"/app/data/app.db\"); d=sqlite3.connect(\"/backup/app.db\"); s.backup(d)" && tar czf /backup/uploads.tgz -C /app uploads'
```

(`sqlite3 .backup` даёт согласованную копию БД при работающем сайте.) Восстановление — положить `app.db` в том `app_data`, распаковать `uploads.tgz` в `app_uploads` и перезапустить сервисы. Рекомендуется выполнять по cron и хранить копии вне сервера.

## Структура репозитория

```
backend/            FastAPI-приложение (app/), тесты (tests/), Dockerfile
frontend/           Next.js-приложение (app/, components/, lib/), Dockerfile
docs/               артефакты проекта: brief, content, design-spec, api-spec, agreements, test-report
.github/workflows/  CI (ruff + pytest, lint + test + build, сборка образов)
docker-compose.yml  backend + frontend (+ Caddy по профилю proxy)
Caddyfile           reverse proxy с автоматическим HTTPS
.env.example        шаблон конфигурации с описанием всех переменных
.claude/            субагенты и команды пайплайна разработки
```

## Документация

Всё в [`docs/`](docs/): [`api-spec.md`](docs/api-spec.md) — контракт API, [`design-spec.md`](docs/design-spec.md) — дизайн, [`agreements.md`](docs/agreements.md) — договорённости с заказчиком.
