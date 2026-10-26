# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:22-alpine

# --- 1. зависимости ---
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# --- 2. сборка ---
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Эти значения вшиваются в сборку: rewrites (/api, /uploads) и NEXT_PUBLIC_*.
ARG BACKEND_URL=http://backend:8000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_MAX_URL=
ARG NEXT_PUBLIC_TELEGRAM_URL=
ARG NEXT_PUBLIC_VK_URL=
ENV BACKEND_URL=${BACKEND_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_MAX_URL=${NEXT_PUBLIC_MAX_URL} \
    NEXT_PUBLIC_TELEGRAM_URL=${NEXT_PUBLIC_TELEGRAM_URL} \
    NEXT_PUBLIC_VK_URL=${NEXT_PUBLIC_VK_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- 3. рантайм ---
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    BACKEND_URL=http://backend:8000

RUN addgroup -S -g 10001 nextjs && adduser -S -u 10001 -G nextjs nextjs

COPY --from=build --chown=nextjs:nextjs /app/public ./public
COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/robots.txt || exit 1

CMD ["node", "server.js"]
