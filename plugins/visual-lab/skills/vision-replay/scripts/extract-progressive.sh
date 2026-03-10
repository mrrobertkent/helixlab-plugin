#!/bin/bash
# extract-progressive.sh — Lighthouse-style progressive frame extraction
# Usage: extract-progressive.sh <video-path> <output-dir>
# Intervals: 0-500ms@100ms, 500ms-2s@250ms, 2s-5s@500ms, 5s+@1s
# Output: PNG frames with timestamp naming (frame_0100ms.png, frame_0350ms.png, ...)
# Stdout: frame count and output directory

set -euo pipefail

command -v bc >/dev/null 2>&1 || { echo "Error: bc is required but not installed" >&2; exit 1; }

# Suppress fontconfig warnings from static ffmpeg builds
_FC="$(cd "$(dirname "$0")/../config" 2>/dev/null && pwd)/fonts.conf"
[[ -f "$_FC" ]] && export FONTCONFIG_FILE="$_FC"

VIDEO_PATH="${1:-}"
OUTPUT_DIR="${2:-}"

if [[ -z "$VIDEO_PATH" || -z "$OUTPUT_DIR" ]]; then
  echo "Error: Missing required arguments" >&2
  echo "Usage: extract-progressive.sh <video-path> <output-dir>" >&2
  exit 1
fi

if [[ ! -f "$VIDEO_PATH" ]]; then
  echo "Error: File not found: $VIDEO_PATH" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Get video duration in seconds
DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_PATH" 2>/dev/null)
if [[ -z "$DURATION" || "$DURATION" == "N/A" ]]; then
  echo "Error: Could not determine video duration for: $VIDEO_PATH" >&2
  exit 1
fi
DURATION_MS=$(echo "$DURATION * 1000" | bc | cut -d'.' -f1)

# Build timestamp list based on progressive intervals
TIMESTAMPS=()

# 0-500ms: every 100ms
for ms in $(seq 0 100 500); do
  if [[ $ms -le $DURATION_MS ]]; then
    TIMESTAMPS+=("$ms")
  fi
done

# 500ms-2000ms: every 250ms (skip 500 since already captured)
for ms in $(seq 750 250 2000); do
  if [[ $ms -le $DURATION_MS ]]; then
    TIMESTAMPS+=("$ms")
  fi
done

# 2000ms-5000ms: every 500ms
for ms in $(seq 2500 500 5000); do
  if [[ $ms -le $DURATION_MS ]]; then
    TIMESTAMPS+=("$ms")
  fi
done

# 5000ms+: every 1000ms (skip if video is shorter than 6s)
for ms in $(seq 6000 1000 "$DURATION_MS" 2>/dev/null); do
  if [[ $ms -le $DURATION_MS ]]; then
    TIMESTAMPS+=("$ms")
  fi
done

# Build select filter expression for all timestamps
# Using filter-based extraction (decode-then-seek) instead of -ss input seeking.
# Input seeking (-ss before -i) snaps to nearest keyframe in VFR/WebM/VP8 files,
# producing duplicate frames. Filter-based extraction decodes sequentially and
# picks exact frames at the requested PTS values.
SELECT_PARTS=()
for ms in "${TIMESTAMPS[@]}"; do
  SECONDS=$(echo "scale=3; $ms / 1000" | bc)
  SELECT_PARTS+=("between(t,$SECONDS,$SECONDS+0.02)")
done

SELECT_EXPR=$(IFS='|'; echo "${SELECT_PARTS[*]}")
SELECT_FILTER="select='${SELECT_EXPR}'"

# Extract all frames in a single decode pass
if ! ffmpeg -y -loglevel error -i "$VIDEO_PATH" \
  -vf "$SELECT_FILTER" -vsync vfr \
  "$OUTPUT_DIR/frame_seq_%04d.png" 2>/dev/null; then
  # Check if any frames were extracted despite the error
  EXTRACTED=$(find "$OUTPUT_DIR" -maxdepth 1 -name "frame_seq_*" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$EXTRACTED" -eq 0 ]]; then
    echo "Error: ffmpeg frame extraction failed — no frames produced" >&2
    exit 2
  fi
  echo "Warning: ffmpeg exited with errors but extracted $EXTRACTED frames — continuing" >&2
fi

# Rename sequential frames to timestamp-based names
SEQ_FRAMES=($(find "$OUTPUT_DIR" -maxdepth 1 -name "frame_seq_*" -type f | sort))
FRAME_COUNT=0
for i in "${!SEQ_FRAMES[@]}"; do
  if [[ $i -lt ${#TIMESTAMPS[@]} ]]; then
    ms="${TIMESTAMPS[$i]}"
    PADDED_MS=$(printf "%06d" "$ms")
    mv "${SEQ_FRAMES[$i]}" "$OUTPUT_DIR/frame_${PADDED_MS}ms.png"
    FRAME_COUNT=$((FRAME_COUNT + 1))
  fi
done

echo "frames_extracted=$FRAME_COUNT"
echo "output_dir=$OUTPUT_DIR"
echo "duration_ms=$DURATION_MS"
