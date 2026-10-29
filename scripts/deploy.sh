#!/usr/bin/env bash
# Выкладка на сервере: подтянуть main и пересобрать контейнеры.
# Запускается из GitHub Actions по SSH (или вручную: ./scripts/deploy.sh).
set -euo pipefail

cd "$(dirname "$0")/.."

git fetch --prune origin main
git reset --hard origin/main

docker compose --profile proxy up -d --build --remove-orphans
docker image prune -f

# Ждём, пока сайт начнёт отвечать.
for i in $(seq 1 30); do
  if docker compose exec -T frontend wget -qO /dev/null http://127.0.0.1:3000/robots.txt; then
    echo "Деплой завершён"
    exit 0
  fi
  sleep 3
done
echo "Сайт не ответил после деплоя" >&2
docker compose logs --tail=50
exit 1
