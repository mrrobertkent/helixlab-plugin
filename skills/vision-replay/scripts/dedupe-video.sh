#!/bin/bash
# dedupe-video.sh — Remove unchanged/static frames from a video
# Usage: dedupe-video.sh <input-video> <output-video> [threshold]
# Threshold: 0-100, percentage of pixels that must change (default: 5)
#   Lower = more aggressive (keeps fewer frames), Higher = more permissive
#   1  = drops frames with <1% pixel change (very aggressive)
#   5  = drops frames with <5% pixel change (balanced default)
#   15 = drops frames with <15% pixel change (permissive)
# Output: deduped video with static frames removed and timestamps corrected
# Stdout: original_duration, deduped_duration, reduction_percent
# Exit: 0 success, 1 invalid input, 2 ffmpeg error

set -euo pipefail

INPUT="${1:-}"
OUTPUT="${2:-}"
THRESHOLD="${3:-5}"

if [[ -z "$INPUT" || -z "$OUTPUT" ]]; then
  echo "Error: Missing required arguments" >&2
  echo "Usage: dedupe-video.sh <input-video> <output-video> [threshold]" >&2
  echo "  threshold: 0-100, percent of pixels that must change (default: 5)" >&2
  exit 1
fi

if [[ ! -f "$INPUT" ]]; then
  echo "Error: File not found: $INPUT" >&2
  exit 1
fi

# Validate threshold is a number
if ! [[ "$THRESHOLD" =~ ^[0-9]+$ ]]; then
  echo "Error: Threshold must be a number (0-100), got: $THRESHOLD" >&2
  exit 1
fi

# Get original duration for comparison
ORIG_DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$INPUT" 2>/dev/null || echo "0")

# mpdecimate removes frames that are nearly identical to the previous frame
# hi/lo control the pixel difference thresholds, frac controls what fraction
# of pixels must exceed the threshold to keep a frame
# Convert our simple 0-100 threshold to mpdecimate's frac parameter
FRAC=$(echo "scale=2; $THRESHOLD / 100" | bc)

# Ensure frac is at least 0.01
if [[ $(echo "$FRAC < 0.01" | bc -l) -eq 1 ]]; then
  FRAC="0.01"
fi

ffmpeg -y -loglevel error \
  -i "$INPUT" \
  -vf "mpdecimate=frac=$FRAC,setpts=N/FRAME_RATE/TB" \
  -an \
  "$OUTPUT" || {
  echo "Error: ffmpeg deduplication failed" >&2
  exit 2
}

# Get deduped duration
DEDUP_DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTPUT" 2>/dev/null || echo "0")

# Calculate reduction
if [[ "$ORIG_DURATION" != "0" && -n "$ORIG_DURATION" ]]; then
  REDUCTION=$(echo "scale=1; (1 - $DEDUP_DURATION / $ORIG_DURATION) * 100" | bc 2>/dev/null || echo "0")
else
  REDUCTION="0"
fi

echo "original_duration=${ORIG_DURATION}s"
echo "deduped_duration=${DEDUP_DURATION}s"
echo "reduction=${REDUCTION}%"
echo "output=$OUTPUT"
