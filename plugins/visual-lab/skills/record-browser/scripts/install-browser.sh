#!/bin/bash
# install-browser.sh — Download Chrome for Testing to .deps/
# Usage: install-browser.sh
# No npm dependencies required. Downloads directly from Chrome's release API.
# Exit: 0 on success, 1 on failure

set -euo pipefail

# Resolve plugin root (parent of skills/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DEPS_DIR="$PLUGIN_ROOT/.deps"

echo "=== Visual Lab: Installing Chrome for Testing ==="
echo "Plugin root: $PLUGIN_ROOT"
echo "Dependencies: $DEPS_DIR"

# Check Node.js (needed for JSON parsing + recorder.js)
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js 22+ is required but not installed." >&2
  echo "Install it from https://nodejs.org or via your package manager." >&2
  exit 1
fi

NODE_VERSION=$(node --version)
echo "Node.js: $NODE_VERSION"

# Check curl
if ! command -v curl &>/dev/null; then
  echo "ERROR: curl is required but not installed." >&2
  exit 1
fi

# Detect platform
case "$(uname -s)" in
  Darwin)
    case "$(uname -m)" in
      arm64) PLATFORM="mac-arm64" ;;
      *)     PLATFORM="mac-x64" ;;
    esac
    ;;
  Linux)  PLATFORM="linux64" ;;
  *)      echo "ERROR: Unsupported platform: $(uname -s)" >&2; exit 1 ;;
esac

echo "Platform: $PLATFORM"

# Create deps directory
mkdir -p "$DEPS_DIR"

# Fetch latest stable Chrome for Testing download URL
echo ""
echo "--- Fetching Chrome for Testing (stable) download URL ---"
ENDPOINTS_URL="https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json"

DOWNLOAD_URL=$(curl -sL "$ENDPOINTS_URL" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    const j=JSON.parse(d);
    const dl=j.channels.Stable.downloads.chrome.find(x=>x.platform==='$PLATFORM');
    if(dl) console.log(dl.url);
    else process.exit(1);
  });
")

if [[ -z "$DOWNLOAD_URL" ]]; then
  echo "ERROR: Could not find download URL for platform $PLATFORM" >&2
  exit 1
fi

echo "Download URL: $DOWNLOAD_URL"

# Download and extract
BROWSERS_DIR="$DEPS_DIR/browsers"
mkdir -p "$BROWSERS_DIR"

ARCHIVE="$BROWSERS_DIR/chrome.zip"
echo ""
echo "--- Downloading Chrome for Testing ---"
curl -L --progress-bar -o "$ARCHIVE" "$DOWNLOAD_URL"

echo "--- Extracting ---"
unzip -qo "$ARCHIVE" -d "$BROWSERS_DIR"
rm -f "$ARCHIVE"

# Find the installed Chrome binary
CHROME_PATH=""
case "$(uname -s)" in
  Darwin)
    CHROME_PATH=$(find "$BROWSERS_DIR" -name "Google Chrome for Testing" -type f | head -1)
    ;;
  Linux)
    CHROME_PATH=$(find "$BROWSERS_DIR" -name "chrome" -type f | head -1)
    ;;
esac

if [[ -z "$CHROME_PATH" ]]; then
  echo "ERROR: Could not find Chrome binary after extraction." >&2
  exit 1
fi

# Save Chrome path for other scripts
echo "$CHROME_PATH" > "$DEPS_DIR/.chrome-path"

echo ""
echo "=== Installation complete ==="
echo "Chrome binary: $CHROME_PATH"
echo ""
echo "Run 'launch-recorder.sh [url] [output.webm]' to start recording."

# WSL2 warning
if grep -qi microsoft /proc/version 2>/dev/null || [[ -n "${WSL_DISTRO_NAME:-}" ]]; then
  echo ""
  echo "NOTE: WSL2 detected. Record Browser launches a headed Chrome window."
  echo "  Windows 11 (WSLg): Should work automatically."
  echo "  Older Windows: Install an X server (VcXsrv, X410) and set DISPLAY=:0"
fi
