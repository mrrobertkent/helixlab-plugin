#!/bin/bash
# video-info.sh — Extract video metadata using ffmpeg
# Usage: video-info.sh <video-path>
# Output: Key=value pairs to stdout
# Exit: 0 success, 1 file not found or not a video

set -euo pipefail

VIDEO_PATH="${1:-}"

if [[ -z "$VIDEO_PATH" ]]; then
  echo "Error: No video path provided" >&2
  echo "Usage: video-info.sh <video-path>" >&2
  exit 1
fi

if [[ ! -f "$VIDEO_PATH" ]]; then
  echo "Error: File not found: $VIDEO_PATH" >&2
  exit 1
fi

# Extract metadata using ffprobe (part of ffmpeg)
PROBE_OUTPUT=$(ffprobe -v quiet -print_format json -show_format -show_streams "$VIDEO_PATH" 2>/dev/null) || {
  echo "Error: Not a valid video file: $VIDEO_PATH" >&2
  exit 1
}

# Parse video stream info (ffprobe JSON uses spaces around colons)
VIDEO_STREAM=$(echo "$PROBE_OUTPUT" | grep '"codec_type"' | grep '"video"' > /dev/null 2>&1 && echo "found" || echo "")
if [[ -z "$VIDEO_STREAM" ]]; then
  echo "Error: No video stream found in: $VIDEO_PATH" >&2
  exit 1
fi

# Extract a JSON field value from probe output (tolerates missing fields under pipefail)
extract_field() {
  local pattern="$1"
  local result
  result=$(echo "$PROBE_OUTPUT" | { grep -o "$pattern" || true; } | head -1 | sed 's/^[^:]*: *//;s/^"//;s/"$//')
  echo "$result"
}

DURATION=$(extract_field '"duration": *"[^"]*"')
WIDTH=$(extract_field '"width": *[0-9]*')
HEIGHT=$(extract_field '"height": *[0-9]*')
CODEC=$(extract_field '"codec_name": *"[^"]*"')
FPS_RAW=$(extract_field '"r_frame_rate": *"[^"]*"')
NB_FRAMES=$(extract_field '"nb_frames": *"[^"]*"')
AVG_FPS_RAW=$(extract_field '"avg_frame_rate": *"[^"]*"')

# Calculate fps from fraction (e.g., "30/1" -> "30")
calc_fps() {
  local raw="$1"
  if [[ -z "$raw" ]]; then echo ""; return; fi
  if [[ "$raw" == *"/"* ]]; then
    local num=$(echo "$raw" | cut -d'/' -f1)
    local den=$(echo "$raw" | cut -d'/' -f2)
    if [[ "$den" -gt 0 ]] 2>/dev/null; then
      echo "scale=2; $num / $den" | bc
    else
      echo ""
    fi
  else
    echo "$raw"
  fi
}

R_FPS=$(calc_fps "$FPS_RAW")
A_FPS=$(calc_fps "$AVG_FPS_RAW")

# Prefer avg_frame_rate when r_frame_rate is unreasonable (VFR/WebM timebase often 1000/1)
if [[ -n "$A_FPS" && "$A_FPS" != "0" ]]; then
  FPS="$A_FPS"
elif [[ -n "$R_FPS" ]]; then
  FPS="$R_FPS"
else
  FPS="unknown"
fi

# Flag variable frame rate
VFR="false"
if [[ -n "$R_FPS" && -n "$A_FPS" && "$R_FPS" != "$A_FPS" && "$A_FPS" != "0" ]]; then
  VFR="true"
fi

# Output structured metadata
echo "file=$VIDEO_PATH"
echo "duration_seconds=${DURATION:-unknown}"
echo "fps=${FPS:-unknown}"
echo "width=${WIDTH:-unknown}"
echo "height=${HEIGHT:-unknown}"
echo "codec=${CODEC:-unknown}"
echo "total_frames=${NB_FRAMES:-unknown}"
echo "resolution=${WIDTH:-?}x${HEIGHT:-?}"
echo "variable_frame_rate=$VFR"
