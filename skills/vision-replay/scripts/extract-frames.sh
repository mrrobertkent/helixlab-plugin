#!/bin/bash
# extract-frames.sh — Extract frames from a video at configurable fps
# Usage: extract-frames.sh <video-path> <output-dir> <fps> [start_seconds] [duration_seconds] [crop_WxH:X:Y] [scale_width]
# Flags: --scene-detect (use scene change detection instead of fixed fps)
# Output: PNG frames as frame_0001.png, frame_0002.png, ...
# Stdout: frame count and output directory
# Exit: 0 success, 1 invalid input, 2 ffmpeg error

set -euo pipefail

# Suppress fontconfig warnings from static ffmpeg builds
_FC="$(cd "$(dirname "$0")/../config" 2>/dev/null && pwd)/fonts.conf"
[[ -f "$_FC" ]] && export FONTCONFIG_FILE="$_FC"

# Parse flags
SCENE_DETECT=false
ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--scene-detect" ]]; then
    SCENE_DETECT=true
  else
    ARGS+=("$arg")
  fi
done

VIDEO_PATH="${ARGS[0]:-}"
OUTPUT_DIR="${ARGS[1]:-}"
FPS="${ARGS[2]:-10}"
START="${ARGS[3]:-}"
DURATION="${ARGS[4]:-}"
CROP="${ARGS[5]:-}"
SCALE_WIDTH="${ARGS[6]:-}"

if [[ -z "$VIDEO_PATH" || -z "$OUTPUT_DIR" ]]; then
  echo "Error: Missing required arguments" >&2
  echo "Usage: extract-frames.sh <video-path> <output-dir> <fps> [start] [duration] [crop] [scale_width]" >&2
  exit 1
fi

if [[ ! -f "$VIDEO_PATH" ]]; then
  echo "Error: File not found: $VIDEO_PATH" >&2
  exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build ffmpeg filter chain
FILTERS=()

if [[ "$SCENE_DETECT" == true ]]; then
  FILTERS+=("select='gt(scene,0.01)'")
else
  FILTERS+=("fps=$FPS")
fi

if [[ -n "$CROP" ]]; then
  FILTERS+=("crop=$CROP")
fi

if [[ -n "$SCALE_WIDTH" ]]; then
  FILTERS+=("scale=$SCALE_WIDTH:-1")
fi

FILTER_STRING=$(IFS=','; echo "${FILTERS[*]}")

# Build ffmpeg command
CMD=(ffmpeg -y -loglevel error)

if [[ -n "$START" ]]; then
  CMD+=(-ss "$START")
fi

CMD+=(-i "$VIDEO_PATH")

if [[ -n "$DURATION" ]]; then
  CMD+=(-t "$DURATION")
fi

CMD+=(-vf "$FILTER_STRING")

if [[ "$SCENE_DETECT" == true ]]; then
  CMD+=(-vsync vfr)
fi

CMD+=("$OUTPUT_DIR/frame_%04d.png")

# Execute
"${CMD[@]}" || {
  echo "Error: ffmpeg extraction failed" >&2
  exit 2
}

# Count extracted frames
FRAME_COUNT=$(find "$OUTPUT_DIR" -name "frame_*.png" -type f | wc -l | tr -d ' ')

echo "frames_extracted=$FRAME_COUNT"
echo "output_dir=$OUTPUT_DIR"
