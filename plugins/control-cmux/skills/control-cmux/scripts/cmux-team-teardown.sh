#!/bin/bash
# cmux-team-teardown.sh — Graceful team shutdown
# Usage: cmux-team-teardown.sh --team-name NAME [options]
# EXPERIMENTAL

set -euo pipefail

# --- Defaults ---
TEAM_NAME=""
FORCE=false
DRY_RUN=false
SHUTDOWN_TIMEOUT=10

# --- Help ---
show_help() {
    cat << 'HELP'
cmux-team-teardown.sh — Graceful team shutdown
EXPERIMENTAL

Usage:
  cmux-team-teardown.sh --team-name "review-team"
  cmux-team-teardown.sh --team-name "review-team" --force
  cmux-team-teardown.sh --team-name "review-team" --dry-run

Required:
  --team-name NAME           Team identifier

Options:
  --force                    Skip graceful shutdown, close surfaces immediately
  --dry-run                  Show what would happen without executing
  --help                     Show this help

Process:
  1. Sends shutdown_request to each member's inbox
  2. Waits for acknowledgment (10s timeout)
  3. Closes surfaces
  4. Cleans up team config and inboxes
HELP
    exit 0
}

# --- Parse args ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        --team-name) TEAM_NAME="$2"; shift 2 ;;
        --force) FORCE=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        --help|-h) show_help ;;
        *) echo "Error: Unknown option $1"; exit 1 ;;
    esac
done

# --- Validate ---
if [ -z "$TEAM_NAME" ]; then
    echo "Error: --team-name is required"
    exit 1
fi

TEAM_DIR="$HOME/.claude/teams/$TEAM_NAME"
CONFIG_FILE="$TEAM_DIR/config.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Team config not found at $CONFIG_FILE"
    exit 1
fi

# Read surfaces from config
SURFACES=$(python3 -c "
import json
with open('$CONFIG_FILE') as f:
    config = json.load(f)
    for s in config.get('surfaces', []):
        print(s)
" 2>/dev/null || echo "")

if [ -z "$SURFACES" ]; then
    echo "Warning: No surfaces found in team config"
fi

# --- Dry run ---
if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would teardown team: $TEAM_NAME"
    echo "[DRY RUN] Surfaces to close:"
    echo "$SURFACES" | while read -r SURFACE; do
        [ -n "$SURFACE" ] && echo "  $SURFACE"
    done
    echo "[DRY RUN] Would clean up: $TEAM_DIR"
    exit 0
fi

# --- Graceful shutdown ---
if [ "$FORCE" = false ]; then
    echo "Sending shutdown requests..."
    INBOX_DIR="$TEAM_DIR/inboxes"

    for INBOX_FILE in "$INBOX_DIR"/*.json; do
        [ -f "$INBOX_FILE" ] || continue
        MEMBER_NAME=$(basename "$INBOX_FILE" .json)
        [ "$MEMBER_NAME" = "orchestrator" ] && continue

        # Write shutdown request
        python3 -c "
import json
msg = {
    'type': 'shutdown_request',
    'from': 'orchestrator',
    'content': 'Please finish current work and stop.',
    'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
}
with open('$INBOX_FILE', 'w') as f:
    json.dump([msg], f, indent=2)
" 2>/dev/null

        echo "  Sent shutdown to $MEMBER_NAME"
    done

    echo "Waiting ${SHUTDOWN_TIMEOUT}s for graceful shutdown..."
    sleep "$SHUTDOWN_TIMEOUT"
fi

# --- Close surfaces ---
echo "Closing surfaces..."
echo "$SURFACES" | while read -r SURFACE; do
    [ -z "$SURFACE" ] && continue
    if cmux close-surface --surface "$SURFACE" 2>/dev/null; then
        echo "  Closed $SURFACE"
    else
        echo "  $SURFACE already closed or not found"
    fi
done

# --- Cleanup ---
echo "Cleaning up team config..."
rm -rf "$TEAM_DIR"
echo ""
echo "Team '$TEAM_NAME' torn down."
