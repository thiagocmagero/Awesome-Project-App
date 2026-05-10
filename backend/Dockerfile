# syntax=docker/dockerfile:1

# ── Stage 1: Build ─────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Instalar dependências (com devDependencies para o build)
COPY package*.json ./
RUN npm ci

# Copiar código e gerar Prisma Client + build TypeScript
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Runtime ───────────────────────────────────────────────────
FROM node:22-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production

# Copiar artefactos do builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Prisma schema + migrations (necessários para `prisma migrate deploy`)
COPY prisma ./prisma

# package.json para runtime + entrypoint
COPY package*.json ./
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Correr como utilizador não-root (segurança)
USER node

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
