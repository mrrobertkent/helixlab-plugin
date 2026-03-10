#!/bin/bash
# Template: Capture Workflow — Navigate pages and capture snapshots
# COPY this template for multi-page capture workflows.
#
# Usage pattern:
#   1. Copy and set SURFACE, URLS array, OUTPUT_DIR
#   2. Run to navigate each URL and capture snapshots

set -euo pipefail

# --- Configuration (customize these) ---
SURFACE="surface:2"
OUTPUT_DIR="/tmp/captures"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# URLs to capture (customize this list)
URLS=(
    "https://example.com"
    "https://example.com/about"
    "https://example.com/contact"
)

# --- Setup ---
mkdir -p "$OUTPUT_DIR"

# --- Capture loop ---
for i in "${!URLS[@]}"; do
    URL="${URLS[$i]}"
    PAGE_NAME="page_$((i+1))"

    echo "Capturing $URL..."

    # Navigate
    cmux browser "$SURFACE" go "$URL"
    cmux browser "$SURFACE" wait --load-state complete --timeout-ms 15000

    # Capture snapshot
    SNAPSHOT=$(cmux browser "$SURFACE" snapshot --interactive --compact)
    echo "$SNAPSHOT" > "$OUTPUT_DIR/${TIMESTAMP}_${PAGE_NAME}_snapshot.txt"

    # Get page info
    TITLE=$(cmux browser "$SURFACE" get title 2>/dev/null || echo "untitled")
    CURRENT_URL=$(cmux browser "$SURFACE" get url)

    echo "  Title: $TITLE"
    echo "  URL: $CURRENT_URL"
    echo "  Snapshot: $OUTPUT_DIR/${TIMESTAMP}_${PAGE_NAME}_snapshot.txt"
    echo ""
done

echo "Captured ${#URLS[@]} pages to $OUTPUT_DIR/"
