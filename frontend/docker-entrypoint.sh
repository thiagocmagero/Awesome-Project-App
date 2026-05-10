#!/bin/sh
# Entrypoint do container frontend.
# Processa o template nginx com env vars (PORT, BACKEND_URL) e arranca o nginx.
set -e

# Validar variáveis obrigatórias antes de arrancar.
# Falhar cedo é melhor do que arrancar o nginx com configuração quebrada.
if [ -z "$PORT" ]; then
    echo "ERROR: PORT is not set" >&2
    exit 1
fi
if [ -z "$BACKEND_URL" ]; then
    echo "ERROR: BACKEND_URL is not set" >&2
    exit 1
fi

# Remover trailing slash de BACKEND_URL para evitar URLs com '//' duplicado
BACKEND_URL="${BACKEND_URL%/}"

echo "==> Configuring nginx: PORT=${PORT}, BACKEND_URL=${BACKEND_URL}"

# envsubst SELECTIVO — só substitui ${PORT} e ${BACKEND_URL}.
# Sem a lista, envsubst substituiria todas as variáveis nginx ($host, $uri,
# $scheme, etc.) por strings vazias — quebrando completamente a config.
envsubst '${PORT} ${BACKEND_URL}' \
    < /etc/nginx/nginx.conf.template \
    > /etc/nginx/nginx.conf

# Validar a configuração antes de arrancar
nginx -t

echo "==> Starting nginx..."
exec nginx -g "daemon off;"
