#!/bin/bash
# Template: Form Automation — Snapshot/ref form fill loop
# COPY this template and customize for your specific form.
#
# Usage pattern:
#   1. Copy this file
#   2. Set SURFACE and URL variables
#   3. Customize the FILL FIELDS section
#   4. Run the script

set -euo pipefail

# --- Configuration (customize these) ---
SURFACE="surface:2"           # Target browser surface
URL="https://example.com/form" # Form URL (leave empty to use current page)
SUBMIT_SELECTOR="e1"          # Ref or CSS selector for submit button
SUCCESS_TEXT="Thank you"      # Text that appears on success

# --- Navigate to form (if URL set) ---
if [ -n "$URL" ]; then
    cmux browser "$SURFACE" go "$URL"
    cmux browser "$SURFACE" wait --load-state complete --timeout-ms 15000
fi

# --- Snapshot to discover fields ---
echo "Taking initial snapshot..."
cmux browser "$SURFACE" snapshot --interactive --compact

# --- FILL FIELDS (customize these) ---
# Use refs from snapshot output, or CSS selectors
# cmux browser "$SURFACE" fill e2 --value "John Doe"
# cmux browser "$SURFACE" fill e3 --value "john@example.com"
# cmux browser "$SURFACE" fill e4 --value "password123"
# cmux browser "$SURFACE" select e5 --value "US"
# cmux browser "$SURFACE" check e6

echo "Fill in the field commands above, then uncomment them."
echo "After filling, submit:"

# --- Submit ---
# cmux browser "$SURFACE" click "$SUBMIT_SELECTOR" --snapshot-after

# --- Verify ---
# cmux browser "$SURFACE" wait --text "$SUCCESS_TEXT" --timeout-ms 10000
# echo "Form submitted successfully"
