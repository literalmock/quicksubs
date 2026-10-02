#!/usr/bin/env bash

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT_DIR/clipcaptions/app"
SERVER_DIR="$ROOT_DIR/clipcaptions/server"
WORKER_DIR="$ROOT_DIR/clipcaptions/worker"

echo "Starting QuickSubs dev stack (server + worker + app)..."

ensure_deps() {
  local dir="$1"
  if [ ! -d "$dir/node_modules" ]; then
    echo "→ Installing dependencies in $dir"
    (cd "$dir" && npm install)
  fi
}

ensure_deps "$SERVER_DIR"
ensure_deps "$WORKER_DIR"
ensure_deps "$APP_DIR"

echo ""
echo "Launching processes:"
echo "  - server  (port 5000)"
echo "  - worker  (BullMQ jobs)"
echo "  - app     (Vite dashboard, port 5173)"
echo ""

cd "$SERVER_DIR"
NODE_ENV=development npm run dev &
SERVER_PID=$!

cd "$WORKER_DIR"
NODE_ENV=development npm run dev &
WORKER_PID=$!

cd "$APP_DIR"
npm run dev &
APP_PID=$!

echo "PIDs:"
echo "  server: $SERVER_PID"
echo "  worker: $WORKER_PID"
echo "  app:    $APP_PID"
echo ""
echo "Use Ctrl+C in this terminal to stop all three."

trap "echo 'Stopping dev processes...'; kill $SERVER_PID $WORKER_PID $APP_PID 2>/dev/null || true" INT TERM

wait

