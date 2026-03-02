#!/bin/bash
# cleanup.sh — Safely remove extracted frame directories
# Usage: cleanup.sh <frames-dir>
# Safety: Only removes directories under /tmp/claude-video-frames/
# Exit: 0 success, 1 path doesn't match safety prefix

set -euo pipefail

FRAMES_DIR="${1:-}"
SAFETY_PREFIX="/tmp/claude-video-frames/"

if [[ -z "$FRAMES_DIR" ]]; then
  echo "Error: No directory path provided" >&2
  echo "Usage: cleanup.sh <frames-dir>" >&2
  exit 1
fi

# Resolve to absolute path
ABS_PATH=$(cd "$FRAMES_DIR" 2>/dev/null && pwd || echo "$FRAMES_DIR")

# Safety check: only allow deletion under the safety prefix
if [[ "$ABS_PATH" != "$SAFETY_PREFIX"* ]]; then
  echo "Error: Refusing to delete outside safety prefix ($SAFETY_PREFIX)" >&2
  echo "Attempted path: $ABS_PATH" >&2
  exit 1
fi

# Additional safety: never delete the safety prefix itself
if [[ "$ABS_PATH" == "$SAFETY_PREFIX" || "$ABS_PATH" == "${SAFETY_PREFIX%/}" ]]; then
  echo "Error: Cannot delete the root frames directory itself" >&2
  exit 1
fi

rm -rf "$FRAMES_DIR"
echo "cleaned=$FRAMES_DIR"
