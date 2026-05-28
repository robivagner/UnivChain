#!/usr/bin/env bash
# Start/stop Anvil for local UnivChain dev. Used by the root Makefile.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT/blockchain/.anvil.pid"
LOG_FILE="$ROOT/blockchain/anvil.log"
PORT="${ANVIL_PORT:-8545}"
CHAIN_ID="${ANVIL_CHAIN_ID:-31337}"

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(cat "$PID_FILE")"
  kill -0 "$pid" 2>/dev/null || return 1
  # Ensure the pid is actually anvil (not a stale/wrong pid).
  if [[ -r "/proc/$pid/cmdline" ]]; then
    tr '\0' ' ' < "/proc/$pid/cmdline" | grep -q '[a]nvil' || return 1
  elif command -v ps >/dev/null 2>&1; then
    ps -p "$pid" -o args= 2>/dev/null | grep -q '[a]nvil' || return 1
  fi
  return 0
}

cmd_start() {
  if is_running; then
    echo "Anvil already running (pid $(cat "$PID_FILE"), port $PORT)"
    return 0
  fi
  rm -f "$PID_FILE"
  echo "Starting Anvil on port $PORT (chain $CHAIN_ID)..."
  nohup anvil --port "$PORT" --chain-id "$CHAIN_ID" >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 2
  if ! is_running; then
    echo "Anvil failed to start. See $LOG_FILE" >&2
    tail -20 "$LOG_FILE" >&2 || true
    rm -f "$PID_FILE"
    return 1
  fi
  echo "Anvil started (pid $(cat "$PID_FILE"))."
  echo "Log: $LOG_FILE"
}

cmd_stop() {
  if ! [[ -f "$PID_FILE" ]]; then
    echo "Anvil is not running (no pid file)."
    return 0
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    # Wait briefly for a clean shutdown.
    for _ in 1 2 3 4 5; do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.2
    done
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    echo "Anvil stopped (pid $pid)."
  else
    echo "Anvil was not running (stale pid $pid removed)."
  fi
  rm -f "$PID_FILE"
}

cmd_status() {
  if is_running; then
    echo "Anvil running (pid $(cat "$PID_FILE"), port $PORT)"
    return 0
  fi
  echo "Anvil not running."
  return 1
}

case "${1:-}" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  status) cmd_status ;;
  *)
    echo "Usage: $0 {start|stop|status}" >&2
    exit 1
    ;;
esac
