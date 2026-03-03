#!/bin/bash
# normalize-video.sh — Downscale and add timestamp overlay to a video
# Usage: normalize-video.sh <input-video> <output-video> [max-dimension]
# Max-dimension: cap the longest side at this value (default: 1920)
#   Desktop recordings (landscape): width capped at max-dimension
#   Mobile/tablet recordings (portrait): height capped at max-dimension
#   Already within limit: no scaling applied, timestamps still added if available
#
# Applies in a single ffmpeg pass:
#   1. Proportional downscaling if longest side exceeds max-dimension
#   2. Timestamp overlay (requires ffmpeg built with --enable-libfreetype)
#
# If drawtext is unavailable, scaling is still applied but timestamps are skipped.
# The agent can still reference frame filenames for timing.
#
# Output: normalized video
# Stdout: original_resolution, output_resolution, scaled, timestamps
# Exit: 0 success, 1 invalid input, 2 ffmpeg error

set -euo pipefail

INPUT="${1:-}"
OUTPUT="${2:-}"
MAX_DIM="${3:-1920}"

if [[ -z "$INPUT" || -z "$OUTPUT" ]]; then
  echo "Error: Missing required arguments" >&2
  echo "Usage: normalize-video.sh <input-video> <output-video> [max-dimension]" >&2
  echo "  max-dimension: cap longest side (default: 1920)" >&2
  exit 1
fi

if [[ ! -f "$INPUT" ]]; then
  echo "Error: File not found: $INPUT" >&2
  exit 1
fi

# Validate max-dimension is a number
if ! [[ "$MAX_DIM" =~ ^[0-9]+$ ]]; then
  echo "Error: max-dimension must be a number, got: $MAX_DIM" >&2
  exit 1
fi

# Get input dimensions
WIDTH=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$INPUT" 2>/dev/null)
HEIGHT=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$INPUT" 2>/dev/null)

if [[ -z "$WIDTH" || -z "$HEIGHT" ]]; then
  echo "Error: Could not determine video dimensions" >&2
  exit 1
fi

ORIG_RES="${WIDTH}x${HEIGHT}"

# Determine if scaling is needed
if [[ "$WIDTH" -ge "$HEIGHT" ]]; then
  LONGEST="$WIDTH"
else
  LONGEST="$HEIGHT"
fi

FILTERS=""
SCALED=false

if [[ "$LONGEST" -gt "$MAX_DIM" ]]; then
  # Scale down: cap longest side at MAX_DIM, maintain aspect ratio, ensure even dimensions
  FILTERS="scale=${MAX_DIM}:${MAX_DIM}:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0"
  SCALED=true
fi

# Check if drawtext filter is available (requires libfreetype)
HAS_DRAWTEXT=false
if ffmpeg -filters 2>/dev/null | grep "drawtext" > /dev/null; then
  HAS_DRAWTEXT=true
fi

TIMESTAMPS=false
if [[ "$HAS_DRAWTEXT" == true ]]; then
  # Calculate font size relative to output width
  # For 1920px wide: fontsize=28, scales proportionally down to minimum 16
  if [[ "$SCALED" == true ]]; then
    if [[ "$WIDTH" -ge "$HEIGHT" ]]; then
      OUT_WIDTH="$MAX_DIM"
    else
      OUT_WIDTH=$(echo "$WIDTH * $MAX_DIM / $HEIGHT" | bc)
    fi
  else
    OUT_WIDTH="$WIDTH"
  fi

  FONTSIZE=$(echo "$OUT_WIDTH * 28 / 1920" | bc)
  if [[ "$FONTSIZE" -lt 16 ]]; then
    FONTSIZE=16
  fi

  # Timestamp overlay: top-left with semi-transparent black background
  TIMESTAMP="drawtext=text='%{pts\\:hms}':x=10:y=10:fontsize=${FONTSIZE}:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=5"

  if [[ -n "$FILTERS" ]]; then
    FILTERS="${FILTERS},${TIMESTAMP}"
  else
    FILTERS="${TIMESTAMP}"
  fi
  TIMESTAMPS=true
fi

# If no filters needed (no scaling, no drawtext), still produce output for pipeline consistency
if [[ -z "$FILTERS" ]]; then
  # No processing needed — copy the video as-is
  cp "$INPUT" "$OUTPUT"
else
  ffmpeg -y -loglevel error \
    -i "$INPUT" \
    -vf "$FILTERS" \
    -an \
    "$OUTPUT" || {
    echo "Error: ffmpeg normalization failed" >&2
    exit 2
  }
fi

# Get output dimensions
OUT_WIDTH_ACTUAL=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$OUTPUT" 2>/dev/null)
OUT_HEIGHT_ACTUAL=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$OUTPUT" 2>/dev/null)
OUT_RES="${OUT_WIDTH_ACTUAL}x${OUT_HEIGHT_ACTUAL}"

echo "original_resolution=$ORIG_RES"
echo "output_resolution=$OUT_RES"
echo "scaled=$SCALED"
echo "timestamps=$TIMESTAMPS"
echo "max_dimension=$MAX_DIM"
echo "output=$OUTPUT"

if [[ "$HAS_DRAWTEXT" == false ]]; then
  echo "note=drawtext unavailable (install ffmpeg with libfreetype for timestamp overlay)" >&2
fi
