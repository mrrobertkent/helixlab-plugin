#!/bin/bash
# Template: Authenticated Session — Login once, save/load state
# COPY this template for auth workflows.
#
# Usage pattern:
#   1. Copy and set LOGIN_URL, APP_URL, STATE_FILE
#   2. Customize login form filling
#   3. Run to login and save state
#   4. Use saved state in other surfaces

set -euo pipefail

# --- Configuration (customize these) ---
SURFACE="surface:2"
LOGIN_URL="https://app.example.com/login"
APP_URL="https://app.example.com/dashboard"
STATE_FILE="/tmp/auth-state.json"
SUCCESS_TEXT="Dashboard"

# --- Check for existing state ---
if [ -f "$STATE_FILE" ]; then
    echo "Loading existing auth state from $STATE_FILE..."
    cmux browser "$SURFACE" state load "$STATE_FILE"
    cmux browser "$SURFACE" go "$APP_URL"
    cmux browser "$SURFACE" wait --load-state complete --timeout-ms 15000

    # Check if still authenticated
    CURRENT_URL=$(cmux browser "$SURFACE" get url)
    if [[ "$CURRENT_URL" != *"login"* ]]; then
        echo "Auth state still valid. Loaded successfully."
        exit 0
    fi
    echo "Auth state expired. Re-authenticating..."
fi

# --- Navigate to login ---
cmux browser "$SURFACE" go "$LOGIN_URL"
cmux browser "$SURFACE" wait --load-state complete --timeout-ms 15000

# --- Snapshot login form ---
cmux browser "$SURFACE" snapshot --interactive --compact

# --- FILL LOGIN FORM (customize these) ---
# cmux browser "$SURFACE" fill e2 --value "user@example.com"
# cmux browser "$SURFACE" fill e3 --value "password123"
# cmux browser "$SURFACE" click e1 --snapshot-after

echo "Customize the login form commands above."

# --- Wait for login redirect ---
# cmux browser "$SURFACE" wait --text "$SUCCESS_TEXT" --timeout-ms 15000

# --- Save state for reuse ---
# cmux browser "$SURFACE" state save "$STATE_FILE"
# echo "Auth state saved to $STATE_FILE"
# echo "Load in other surfaces: cmux browser surface:N state load $STATE_FILE"
