#!/bin/bash
# contact-sheet.sh — Generate a grid overview image from a video
# Usage: contact-sheet.sh <video-path> <output-path> [fps=5] [tile_columns=5]
# Output: Single PNG grid image (320px per frame width)
# Stdout: output path and grid dimensions

set -euo pipefail

command -v bc >/dev/null 2>&1 || { echo "Error: bc is required but not installed" >&2; exit 1; }

# Suppress fontconfig warnings from static ffmpeg builds
_FC="$(cd "$(dirname "$0")/../config" 2>/dev/null && pwd)/fonts.conf"
[[ -f "$_FC" ]] && export FONTCONFIG_FILE="$_FC"

VIDEO_PATH="${1:-}"
OUTPUT_PATH="${2:-}"
FPS="${3:-5}"
TILE_COLS="${4:-5}"

if [[ -z "$VIDEO_PATH" || -z "$OUTPUT_PATH" ]]; then
  echo "Error: Missing required arguments" >&2
  echo "Usage: contact-sheet.sh <video-path> <output-path> [fps] [tile_columns]" >&2
  exit 1
fi

if [[ ! -f "$VIDEO_PATH" ]]; then
  echo "Error: File not found: $VIDEO_PATH" >&2
  exit 1
fi

# Get duration to calculate rows needed
DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_PATH" 2>/dev/null)
if [[ -z "$DURATION" || "$DURATION" == "N/A" ]]; then
  echo "Error: Could not determine video duration for: $VIDEO_PATH" >&2
  exit 1
fi
TOTAL_FRAMES=$(echo "$DURATION * $FPS" | bc | cut -d'.' -f1)
ROWS=$(( (TOTAL_FRAMES + TILE_COLS - 1) / TILE_COLS ))

# Generate contact sheet using ffmpeg tile filter
ffmpeg -y -loglevel error -i "$VIDEO_PATH" \
  -vf "fps=$FPS,scale=320:-1,tile=${TILE_COLS}x${ROWS}" \
  "$OUTPUT_PATH" || {
  echo "Error: Contact sheet generation failed" >&2
  exit 2
}

echo "output_path=$OUTPUT_PATH"
echo "grid=${TILE_COLS}x${ROWS}"
echo "total_frames=$TOTAL_FRAMES"
echo "fps_sampled=$FPS"
