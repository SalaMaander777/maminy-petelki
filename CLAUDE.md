# Мамины петельки — сайт-визитка

Сайт-визитка компании «Мамины петельки» (вязаные изделия ручной работы). Язык интерфейса и текстов — русский.

## Стек
- **frontend/** — Next.js (App Router) + TypeScript, Tailwind, shadcn/ui, Framer Motion, GSAP + ScrollTrigger, Lenis
- **backend/** — Python + FastAPI, SQLModel/SQLite, pytest
- Тесты: pytest (backend), Vitest + React Testing Library (frontend), Playwright (e2e)
- Деплой: Docker / docker-compose

## Структура
- `docs/` — артефакты пайплайна: `brief.md`, `content.md`, `design-spec.md`, `api-spec.md`, `test-report.md`
- `.claude/agents/` — субагенты, `.claude/commands/` — слэш-команды (`/pipeline`, `/feature`)
- `.mcp.json` — MCP: `magic` (21st.dev, нужен `TWENTYFIRST_API_KEY` в окружении), `shadcn`, `playwright`

## Пайплайн
`/pipeline "идея"` → orchestrator ведёт этапы, после каждого гейта ждёт подтверждения пользователя:
1. product-analyst → `docs/brief.md`
2. content-writer ∥ ui-designer → `docs/content.md`, `docs/design-spec.md`
3. backend-dev ∥ frontend-dev (контракт — `docs/api-spec.md`)
4. qa-engineer → `docs/test-report.md`
5. e2e-tester
6. devops-seo → релиз

## Правила
- Агенты меняют только свою зону (frontend/, backend/, docs/ по ролям); контракт API меняется только через `docs/api-spec.md`.
- Секреты не коммитить; конфигурация через `.env` (шаблон `.env.example`).
- Каждый этап заканчивается артефактом и кратким отчётом оркестратору.
