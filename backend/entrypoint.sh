#!/bin/sh
# Entrypoint do container backend.
# Corre as migrations da BD + seed (idempotente) antes de arrancar o NestJS.
# `set -e` aborta o script imediatamente se qualquer comando falhar — assim
# o Railway marca o deploy como falhado em vez de arrancar com schema errado.
set -e

echo "==> Running Prisma migrations..."
npx prisma migrate deploy

echo "==> Running seed (idempotent — upsert preserves admin edits)..."
npm run seed

echo "==> Starting NestJS backend..."
exec node dist/main
