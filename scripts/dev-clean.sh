#!/usr/bin/env bash
# Kill any stale Vite process on the default port, clear the module cache, then start dev.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PROTOWIKI_DEV_PORT:-5173}"

if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -t -i ":${PORT}" 2>/dev/null || true)
  if [ -n "${PIDS}" ]; then
    echo "Stopping process(es) on port ${PORT}: ${PIDS}"
    kill -9 ${PIDS} 2>/dev/null || true
    sleep 1
  fi
fi

rm -rf "${ROOT}/node_modules/.vite"
echo "Cleared Vite cache. Starting dev server on port ${PORT}..."
cd "${ROOT}"
exec vite --port "${PORT}" --strictPort
