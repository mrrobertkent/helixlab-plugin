#!/bin/bash
# cmux-spawn.sh — Spawn a Claude session or browser in a new surface
# Usage: cmux-spawn.sh --type session|browser [options]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Defaults ---
TYPE=""
LAYOUT="split"
PROMPT=""
URL=""
PERMISSIONS="skip"
DRY_RUN=false

# --- Help ---
show_help() {
    cat << 'HELP'
cmux-spawn.sh — Spawn session or browser in new cmux surface

Usage:
  cmux-spawn.sh --type session --split --prompt "Run tests"
  cmux-spawn.sh --type browser --tab --url https://example.com
  cmux-spawn.sh --type session --workspace --prompt "Deploy to prod"

Required:
  --type session|browser     What to spawn

Layout (pick one):
  --split                    Split pane (default)
  --tab                      New workspace tab
  --workspace                New workspace

Session options:
  --prompt "..."             Initial prompt to send
  --permissions skip|ask     Permission mode (default: skip)

Browser options:
  --url <url>                URL to open

Other:
  --dry-run                  Show what would happen without executing
  --help                     Show this help

Output:
  Prints the new surface handle (e.g., surface:5)
HELP
    exit 0
}

# --- Parse args ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        --type) TYPE="$2"; shift 2 ;;
        --split) LAYOUT="split"; shift ;;
        --tab|--workspace) LAYOUT="workspace"; shift ;;
        --prompt) PROMPT="$2"; shift 2 ;;
        --url) URL="$2"; shift 2 ;;
        --permissions) PERMISSIONS="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        --help|-h) show_help ;;
        *) echo "Error: Unknown option $1"; echo "Run with --help for usage"; exit 1 ;;
    esac
done

# --- Validate ---
if [ -z "$TYPE" ]; then
    echo "Error: --type is required (session or browser)"
    exit 1
fi

if [[ "$TYPE" != "session" && "$TYPE" != "browser" ]]; then
    echo "Error: --type must be 'session' or 'browser'"
    exit 1
fi

if [[ "$TYPE" == "browser" && -z "$URL" ]]; then
    echo "Error: --url is required for browser type"
    exit 1
fi

# Check cmux environment
if ! "$SCRIPT_DIR/cmux-env.sh" --quiet 2>/dev/null; then
    echo "Error: Not in cmux environment. Run cmux-env.sh for details."
    exit 1
fi

# --- Dry run ---
if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would spawn: type=$TYPE layout=$LAYOUT"
    [ -n "$PROMPT" ] && echo "[DRY RUN] Prompt: $PROMPT"
    [ -n "$URL" ] && echo "[DRY RUN] URL: $URL"
    exit 0
fi

# --- Create surface ---
if [[ "$TYPE" == "browser" ]]; then
    if [[ "$LAYOUT" == "split" ]]; then
        OUTPUT=$(cmux browser open-split "$URL" 2>&1)
    else
        cmux new-workspace
        OUTPUT=$(cmux browser open "$URL" 2>&1)
    fi
    echo "$OUTPUT"
    exit 0
fi

# --- Session spawn ---
if [[ "$LAYOUT" == "split" ]]; then
    SPLIT_OUTPUT=$(cmux new-split right 2>&1)
else
    cmux new-workspace
    SPLIT_OUTPUT=$(cmux list-surfaces --json 2>&1)
fi

# Get the new surface ID from list-surfaces
SURFACE_ID=$(cmux list-surfaces --json | python3 -c "
import sys, json
surfaces = json.load(sys.stdin)
# Get the last terminal surface (most recently created)
terminals = [s for s in surfaces if s.get('type') == 'terminal']
if terminals:
    print(terminals[-1]['handle'])
" 2>/dev/null || echo "")

if [ -z "$SURFACE_ID" ]; then
    echo "Error: Could not determine new surface ID"
    exit 1
fi

# Launch Claude
CLAUDE_CMD="claude"
if [[ "$PERMISSIONS" == "skip" ]]; then
    CLAUDE_CMD="claude --dangerously-skip-permissions"
fi

cmux send-surface --surface "$SURFACE_ID" "${CLAUDE_CMD}\n"

# Wait for Claude to initialize
sleep 4

# Send prompt if provided
if [ -n "$PROMPT" ]; then
    cmux send-surface --surface "$SURFACE_ID" "${PROMPT}\n"
fi

echo "$SURFACE_ID"
