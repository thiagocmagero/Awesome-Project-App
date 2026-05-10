# syntax=docker/dockerfile:1

# ── Stage 1: Build Vite ────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Serve com nginx ───────────────────────────────────────────
FROM nginx:alpine

# `gettext` fornece o comando `envsubst` (injeta env vars no nginx.conf em runtime).
RUN apk add --no-cache gettext

# Ficheiros estáticos compilados pelo Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Template de configuração nginx + entrypoint
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
