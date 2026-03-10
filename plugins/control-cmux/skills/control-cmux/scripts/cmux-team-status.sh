#!/bin/bash
# cmux-team-status.sh — Check team health and inbox status
# Usage: cmux-team-status.sh --team-name NAME [options]
# EXPERIMENTAL

set -euo pipefail

# --- Defaults ---
TEAM_NAME=""
JSON_OUTPUT=false
WATCH_MODE=false

# --- Help ---
show_help() {
    cat << 'HELP'
cmux-team-status.sh — Check team health and inbox status
EXPERIMENTAL

Usage:
  cmux-team-status.sh --team-name "review-team"
  cmux-team-status.sh --team-name "review-team" --json
  cmux-team-status.sh --team-name "review-team" --watch

Required:
  --team-name NAME           Team identifier

Options:
  --json                     Output as JSON
  --watch                    Poll every 5 seconds
  --help                     Show this help
HELP
    exit 0
}

# --- Parse args ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        --team-name) TEAM_NAME="$2"; shift 2 ;;
        --json) JSON_OUTPUT=true; shift ;;
        --watch) WATCH_MODE=true; shift ;;
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
INBOX_DIR="$TEAM_DIR/inboxes"

if [ ! -d "$TEAM_DIR" ]; then
    echo "Error: Team '$TEAM_NAME' not found at $TEAM_DIR"
    exit 1
fi

# --- Status function ---
show_status() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "{"
        echo "  \"team_name\": \"$TEAM_NAME\","
        echo "  \"members\": ["
    else
        echo "Team: $TEAM_NAME"
        echo "---"
    fi

    FIRST=true
    for INBOX_FILE in "$INBOX_DIR"/*.json; do
        [ -f "$INBOX_FILE" ] || continue
        MEMBER_NAME=$(basename "$INBOX_FILE" .json)
        [ "$MEMBER_NAME" = "orchestrator" ] && continue

        MSG_COUNT=$(python3 -c "
import json
with open('$INBOX_FILE') as f:
    data = json.load(f)
    if isinstance(data, list):
        print(len(data))
    else:
        print(1)
" 2>/dev/null || echo "0")

        LAST_MODIFIED=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$INBOX_FILE" 2>/dev/null || echo "unknown")

        if [ "$JSON_OUTPUT" = true ]; then
            [ "$FIRST" = true ] || echo ","
            echo "    {\"name\": \"$MEMBER_NAME\", \"messages\": $MSG_COUNT, \"last_modified\": \"$LAST_MODIFIED\"}"
            FIRST=false
        else
            echo "  $MEMBER_NAME: $MSG_COUNT messages (last: $LAST_MODIFIED)"
        fi
    done

    if [ "$JSON_OUTPUT" = true ]; then
        echo ""
        echo "  ]"
        echo "}"
    fi
}

# --- Execute ---
if [ "$WATCH_MODE" = true ]; then
    while true; do
        clear
        show_status
        sleep 5
    done
else
    show_status
fi
