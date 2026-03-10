#!/bin/bash
# launch-recorder.sh — Launch headed Chrome with recording overlay and annotation tools
# Usage: launch-recorder.sh [url] [output-path] [viewport]
# Default URL: bundled welcome page
# Default output: /tmp/claude-video-frames/<timestamp>/recording.webm
# Default viewport: 1280x720
# Exit: 0 on success, 1 on failure

set -euo pipefail

URL="${1:-}"
OUTPUT="${2:-}"
# Viewport presets: desktop (default), mobile, tablet — or custom WxH
VIEWPORT_ARG="${3:-desktop}"
case "$VIEWPORT_ARG" in
  desktop) VIEWPORT="1280x720" ;;
  mobile)  VIEWPORT="375x812" ;;
  tablet)  VIEWPORT="768x1024" ;;
  *x*)     VIEWPORT="$VIEWPORT_ARG" ;;  # custom WxH passthrough
  *)       VIEWPORT="1280x720" ;;
esac

# Resolve paths (needed for welcome page fallback)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# If no URL provided, use the bundled welcome page
if [[ -z "$URL" ]]; then
  WELCOME_PAGE="$SCRIPT_DIR/../pages/welcome.html"
  if [[ -f "$WELCOME_PAGE" ]]; then
    URL="file://$(cd "$(dirname "$WELCOME_PAGE")" && pwd)/$(basename "$WELCOME_PAGE")"
  else
    echo "Usage: launch-recorder.sh [url] [output-path]" >&2
    echo "" >&2
    echo "  url          URL to open (default: welcome page)" >&2
    echo "  output-path  Where to save recording (default: /tmp/claude-video-frames/<ts>/recording.webm)" >&2
    echo "  viewport     desktop (default), mobile (375x812), tablet (768x1024), or WxH" >&2
    exit 1
  fi
fi

PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DEPS_DIR="$PLUGIN_ROOT/.deps"
RECORDER_JS="$SCRIPT_DIR/recorder.js"

# Check dependencies
if [[ ! -f "$DEPS_DIR/.chrome-path" ]]; then
  echo "ERROR: Chrome for Testing not installed. Run install-browser.sh first." >&2
  exit 1
fi

CHROME_PATH=$(cat "$DEPS_DIR/.chrome-path")

if [[ ! -f "$CHROME_PATH" ]]; then
  echo "ERROR: Chrome binary not found at $CHROME_PATH" >&2
  echo "Run install-browser.sh to reinstall." >&2
  exit 1
fi

# Default output path
if [[ -z "$OUTPUT" ]]; then
  WORK_DIR="/tmp/claude-video-frames/$(date +%s)"
  mkdir -p "$WORK_DIR"
  OUTPUT="$WORK_DIR/recording.webm"
fi

# Ensure output directory exists
mkdir -p "$(dirname "$OUTPUT")"

# Process management state
PID_FILE="/tmp/claude-recorder.pid"
RECORDER_LOG="/tmp/helix-recorder-$$.log"
NODE_PID=""
TAIL_PID=""

cleanup() {
  [[ -n "${TAIL_PID:-}" ]] && kill "$TAIL_PID" 2>/dev/null || true
  [[ -n "${TAIL_PID:-}" ]] && wait "$TAIL_PID" 2>/dev/null || true
  if [[ -n "${NODE_PID:-}" ]] && kill -0 "$NODE_PID" 2>/dev/null; then
    kill -TERM "$NODE_PID" 2>/dev/null || true
    for i in $(seq 1 30); do
      kill -0 "$NODE_PID" 2>/dev/null || break
      sleep 0.1
    done
    kill -0 "$NODE_PID" 2>/dev/null && kill -9 "$NODE_PID" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
}
trap cleanup EXIT

echo "=== Visual Lab: Browser Recorder ==="
echo "URL: $URL"
echo "Output: $OUTPUT"
echo "Chrome: $CHROME_PATH"
echo ""
echo "Recording controls are in the browser toolbar."
echo "Run stop-recorder.sh or click Stop in the toolbar to finish."
echo ""

# Launch recorder, log output to file and mirror to stdout
touch "$RECORDER_LOG"

node "$RECORDER_JS" "$URL" "$OUTPUT" "$CHROME_PATH" "$VIEWPORT" > "$RECORDER_LOG" 2>&1 &
NODE_PID=$!
echo "$NODE_PID" > "$PID_FILE"

# Mirror log output to stdout in background
tail -f "$RECORDER_LOG" &
TAIL_PID=$!

echo "Recorder PID: $NODE_PID"
echo "Waiting for recording to complete..."

wait "$NODE_PID" || true

# Remux saved WebM to fix missing duration metadata
SAVED_FILE=""
if [[ -f "$RECORDER_LOG" ]]; then
  SAVED_FILE=$(grep -o 'HELIX_SAVED=.*' "$RECORDER_LOG" | head -1 | cut -d= -f2-)
fi
rm -f "$RECORDER_LOG"

if [[ -n "$SAVED_FILE" && -f "$SAVED_FILE" ]]; then
  FFMPEG_BIN=""
  if command -v ffmpeg &>/dev/null; then
    FFMPEG_BIN="ffmpeg"
  elif [[ -f "$HOME/.local/bin/ffmpeg" ]]; then
    FFMPEG_BIN="$HOME/.local/bin/ffmpeg"
  fi
  if [[ -n "$FFMPEG_BIN" ]]; then
    REMUX_TMP="/tmp/helix-remux-$$.webm"
    if "$FFMPEG_BIN" -y -i "$SAVED_FILE" -c copy "$REMUX_TMP" 2>/dev/null; then
      mv "$REMUX_TMP" "$SAVED_FILE"
      echo "Remuxed: duration metadata fixed"
    else
      rm -f "$REMUX_TMP"
      echo "Remux skipped: ffmpeg copy failed" >&2
    fi
  fi
fi

echo ""
echo "=== Session complete ==="
