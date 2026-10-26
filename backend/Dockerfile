# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Непривилегированный пользователь и каталоги для данных (монтируются томами).
RUN groupadd --system --gid 10001 app \
 && useradd --system --uid 10001 --gid app --home-dir /app --shell /usr/sbin/nologin app \
 && mkdir -p /app/data /app/uploads \
 && chown -R app:app /app

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY --chown=app:app app ./app

ENV DATABASE_URL=sqlite:////app/data/app.db \
    UPLOADS_DIR=/app/uploads

USER app
VOLUME ["/app/data", "/app/uploads"]
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4).status == 200 else 1)"

# Один воркер: лимитер попыток входа хранится в памяти процесса.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
