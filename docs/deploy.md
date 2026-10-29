# Деплой на VPS: домен и автообновление из GitHub

Схема: `git push` в `main` → GitHub Actions прогоняет тесты → по SSH запускает `scripts/deploy.sh` на VPS → Docker пересобирает сайт. HTTPS выпускает Caddy сам.

## 1. Домен
1. Купите домен (reg.ru, nic.ru, REG и т.п.).
2. В DNS-панели регистратора создайте A-записи на IP вашего VPS:
   - `@` → IP сервера
   - `www` → IP сервера
3. DNS обновляется от минут до нескольких часов. Проверка: `dig +short ваш-домен.ru`.

## 2. Подготовка VPS (один раз, Ubuntu/Debian)
```
# Docker
curl -fsSL https://get.docker.com | sh
# Файрвол: только SSH, HTTP, HTTPS
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443 && ufw enable
# Код
git clone git@github.com:SalaMaander777/maminy-petelki.git /opt/mamini-petelki
cd /opt/mamini-petelki && cp .env.example .env && nano .env
```
Для `git clone` приватного репозитория на VPS нужен deploy key: `ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""`, публичную часть добавьте в GitHub → Settings → Deploy keys (read-only), и пропишите ключ в `~/.ssh/config` для `github.com`.

В `.env` на сервере:
```
ENVIRONMENT=production
SITE_DOMAIN=ваш-домен.ru
NEXT_PUBLIC_SITE_URL=https://ваш-домен.ru
ALLOWED_ORIGINS=https://ваш-домен.ru,https://www.ваш-домен.ru
COOKIE_SECURE=true
SECRET_KEY=<python3 -c "import secrets; print(secrets.token_urlsafe(48))">
ADMIN_PASSWORD=<надёжный пароль>
```
Первый запуск: `./scripts/deploy.sh` (когда DNS уже указывает на сервер, иначе Caddy не получит сертификат).

Сайт по `www` лучше перенаправить на основной адрес — при необходимости добавьте блок в `Caddyfile`.

## 3. Ключ для GitHub Actions
Отдельный ключ только для деплоя (на своём компьютере):
```
ssh-keygen -t ed25519 -f deploy_key -N "" -C github-actions
ssh-copy-id -i deploy_key.pub пользователь@IP     # или добавьте в ~/.ssh/authorized_keys на VPS
ssh-keyscan -H IP                                  # вывод пойдёт в DEPLOY_KNOWN_HOSTS
```
В GitHub → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Значение |
|---|---|
| `DEPLOY_SSH_KEY` | содержимое приватного файла `deploy_key` |
| `DEPLOY_HOST` | IP или домен сервера |
| `DEPLOY_USER` | пользователь на VPS (должен иметь доступ к docker) |
| `DEPLOY_PATH` | `/opt/mamini-petelki` |
| `DEPLOY_KNOWN_HOSTS` | вывод `ssh-keyscan -H IP` |

После этого `deploy_key` с компьютера удалите.

## 4. Как это работает дальше
- Push в `main` → job `deploy` в `.github/workflows/ci.yml` (запускается только если backend, frontend и сборка Docker прошли).
- Pull request и другие ветки только тестируются, на сервер не выкладываются.
- Данные (база и фото) лежат в Docker-томах и при деплое не теряются. Делайте их резервные копии (см. `docs/instructions.md`, п. 7).
- Откат: `git revert` + push, либо на сервере `git reset --hard <коммит> && docker compose --profile proxy up -d --build`.
