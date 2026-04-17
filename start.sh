#!/bin/bash

set -euo pipefail

FRONTEND_PORT=3000
BACKEND_PORT=4000
BACKEND_LOG_FILE="backend.log"
BACKEND_PID_FILE="backend.pid"

cleanup_port() {
  local port="$1"
  local pid
  pid=$(lsof -ti tcp:"$port" || true)

  if [ -n "${pid:-}" ]; then
    echo "==> Port $port is occupied by process $pid. Stopping it..."
    kill -9 "$pid" || true
    sleep 1
  else
    echo "==> Port $port is free."
  fi
}

cleanup() {
  if [ -f "$BACKEND_PID_FILE" ]; then
    local backend_pid
    backend_pid=$(cat "$BACKEND_PID_FILE")
    if kill -0 "$backend_pid" >/dev/null 2>&1; then
      echo
      echo "==> Stopping backend process $backend_pid..."
      kill "$backend_pid" || true
      wait "$backend_pid" 2>/dev/null || true
    fi
    rm -f "$BACKEND_PID_FILE"
  fi
}

trap cleanup EXIT INT TERM

echo "---------------------------------------"
echo "Starting Claude Log Analyzer dev stack..."
echo "---------------------------------------"

echo "==> Checking frontend port $FRONTEND_PORT..."
cleanup_port "$FRONTEND_PORT"

echo "==> Checking backend port $BACKEND_PORT..."
cleanup_port "$BACKEND_PORT"

echo "==> Starting backend in the background..."
nohup node server.cjs > "$BACKEND_LOG_FILE" 2>&1 &
echo $! > "$BACKEND_PID_FILE"
sleep 1

echo "==> Backend started. PID: $(cat "$BACKEND_PID_FILE")"
echo "==> Backend log: $BACKEND_LOG_FILE"
echo "==> Backend URL: http://localhost:$BACKEND_PORT"
echo "==> Starting frontend in the foreground..."
echo "==> Frontend URL: http://localhost:$FRONTEND_PORT"
echo

npm run dev
