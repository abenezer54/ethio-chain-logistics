#!/bin/sh
set -eu

echo "=== Starting API ==="
echo "API_PORT=${API_PORT:-8080}"
echo "DATABASE_URL set: $([ -z "${DATABASE_URL:-}" ] && echo 'NO' || echo 'YES')"
echo "PORT set: $([ -z "${PORT:-}" ] && echo 'NO' || echo 'YES')"

export API_PORT="${PORT:-8080}"

echo "=== Executing /app/api ==="
exec /app/api
