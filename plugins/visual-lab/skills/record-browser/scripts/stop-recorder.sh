#!/bin/bash
# stop-recorder.sh — Signal the browser recorder to stop and save
# Usage: stop-recorder.sh
# Sends SIGTERM to the running recorder process
# Exit: 0 on success, 1 if no recorder is running

set -euo pipefail

PID_FILE="/tmp/claude-recorder.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No active recording found (no PID file at $PID_FILE)." >&2
  exit 1
fi

RECORDER_PID=$(cat "$PID_FILE")

# Verify the PID is alive AND is actually a node recorder process (not PID reuse)
if ! kill -0 "$RECORDER_PID" 2>/dev/null; then
  echo "Recorder process $RECORDER_PID is not running." >&2
  rm -f "$PID_FILE"
  exit 1
fi

PROC_CMD=$(ps -p "$RECORDER_PID" -o args= 2>/dev/null || true)
if [[ "$PROC_CMD" != *"recorder.js"* ]]; then
  echo "PID $RECORDER_PID is not a recorder process (stale PID file)." >&2
  rm -f "$PID_FILE"
  exit 1
fi

echo "Stopping recorder (PID: $RECORDER_PID)..."
kill -TERM "$RECORDER_PID"

# Wait for graceful shutdown (up to 10 seconds)
for i in $(seq 1 10); do
  if ! kill -0 "$RECORDER_PID" 2>/dev/null; then
    echo "Recorder stopped."
    rm -f "$PID_FILE"
    exit 0
  fi
  sleep 1
done

echo "WARNING: Recorder did not stop gracefully. Force killing..." >&2
kill -9 "$RECORDER_PID" 2>/dev/null || true
rm -f "$PID_FILE"
echo "Recorder killed."
