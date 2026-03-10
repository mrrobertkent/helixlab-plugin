#!/bin/bash
# cmux-env.sh — Detect cmux context, validate socket, report status
# Usage: cmux-env.sh [--json] [--quiet] [--help]

set -euo pipefail

# --- Help ---
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    cat << 'HELP'
cmux-env.sh — Detect cmux environment and report status

Usage:
  cmux-env.sh              Print human-readable status
  cmux-env.sh --json       Print JSON status object
  cmux-env.sh --quiet      Exit code only (0=in cmux, 1=not in cmux)
  cmux-env.sh --help       Show this help

Checks:
  1. CMUX_WORKSPACE_ID environment variable
  2. CMUX_SURFACE_ID environment variable
  3. Socket file at /tmp/cmux.sock
  4. cmux ping response

Exit codes:
  0 — Running in cmux, socket connected
  1 — Not in cmux or socket not connected
HELP
    exit 0
fi

# --- Detection ---
WORKSPACE_ID="${CMUX_WORKSPACE_ID:-}"
SURFACE_ID="${CMUX_SURFACE_ID:-}"
SOCKET_PATH="/tmp/cmux.sock"
SOCKET_EXISTS=false
PING_OK=false
IN_CMUX=false

if [ -S "$SOCKET_PATH" ]; then
    SOCKET_EXISTS=true
fi

if command -v cmux &> /dev/null && cmux ping &> /dev/null; then
    PING_OK=true
fi

if [ -n "$WORKSPACE_ID" ] && [ "$SOCKET_EXISTS" = true ] && [ "$PING_OK" = true ]; then
    IN_CMUX=true
fi

# --- Output ---
if [[ "${1:-}" == "--quiet" || "${1:-}" == "-q" ]]; then
    if [ "$IN_CMUX" = true ]; then exit 0; else exit 1; fi
fi

if [[ "${1:-}" == "--json" ]]; then
    cat << EOF
{
  "in_cmux": $IN_CMUX,
  "workspace_id": "${WORKSPACE_ID:-null}",
  "surface_id": "${SURFACE_ID:-null}",
  "socket_path": "$SOCKET_PATH",
  "socket_exists": $SOCKET_EXISTS,
  "ping_ok": $PING_OK
}
EOF
    if [ "$IN_CMUX" = true ]; then exit 0; else exit 1; fi
fi

# Human-readable output
if [ "$IN_CMUX" = true ]; then
    echo "✓ Running in cmux"
    echo "  Workspace: $WORKSPACE_ID"
    echo "  Surface:   $SURFACE_ID"
    echo "  Socket:    $SOCKET_PATH"
else
    echo "✗ Not in cmux"
    [ -z "$WORKSPACE_ID" ] && echo "  ✗ CMUX_WORKSPACE_ID not set"
    [ "$SOCKET_EXISTS" = false ] && echo "  ✗ Socket not found at $SOCKET_PATH"
    [ "$PING_OK" = false ] && echo "  ✗ cmux ping failed"
    exit 1
fi
