#!/bin/bash
# dedupe-video.sh — Remove unchanged/static frames from a video
# Usage: dedupe-video.sh <input-video> <output-video> [threshold]
# Threshold: 0-100, controls dedup sensitivity (default: 5)
#   Lower = stricter, keeps more frames (preserves subtle animations)
#   Higher = looser, drops more frames (only keeps major visual changes)
#
# Recommended thresholds by analysis type:
#   Animation analysis:  1  (preserve subtle easing, fades, micro-interactions)
#   Page load analysis:  3  (preserve progressive rendering changes)
#   Workflow review:    15  (keep only major state changes like navigation, modals)
#
# The threshold maps to both mpdecimate's frac parameter (what fraction of
# pixels must change) and its hi/lo parameters (how much a pixel must change
# to count). Low thresholds use sensitive pixel detection; high thresholds
# only react to large visual changes.
#
# Handles VFR (variable frame rate) recordings by normalizing to 120fps before
# deduplication. Screen recording tools commonly output VFR containers (e.g.,
# 1000fps) which break frame comparison without normalization.
#
# Output: deduped video with static frames removed and timestamps corrected
# Stdout: original_duration, deduped_duration, reduction_percent, threshold
# Exit: 0 success, 1 invalid input, 2 ffmpeg error

set -euo pipefail

INPUT="${1:-}"
OUTPUT="${2:-}"
THRESHOLD="${3:-5}"

if [[ -z "$INPUT" || -z "$OUTPUT" ]]; then
  echo "Error: Missing required arguments" >&2
  echo "Usage: dedupe-video.sh <input-video> <output-video> [threshold]" >&2
  echo "  threshold: 0-100, dedup sensitivity (default: 5)" >&2
  echo "" >&2
  echo "  Recommended thresholds:" >&2
  echo "    1   Animation analysis (preserve subtle motion)" >&2
  echo "    3   Page load analysis (preserve render changes)" >&2
  echo "    15  Workflow review (major state changes only)" >&2
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

if [[ "$THRESHOLD" -gt 100 ]]; then
  echo "Error: Threshold must be 0-100, got: $THRESHOLD" >&2
  exit 1
fi

# Get original duration for comparison
ORIG_DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$INPUT" 2>/dev/null || echo "0")

# Map threshold to mpdecimate parameters.
# mpdecimate uses three params:
#   hi  - if any 8x8 block exceeds this SAD, the frame is kept
#   lo  - per-block SAD threshold for "changed" classification
#   frac - fraction of blocks that must exceed lo to keep the frame
#
# Low thresholds (1-4): sensitive pixel detection for subtle animations.
#   hi=64 lo=16 catches small easing steps, anti-aliasing shifts, opacity fades.
# Medium thresholds (5-10): balanced detection for render changes.
#   hi=200 lo=64 catches layout shifts, progressive paints, content appearing.
# High thresholds (11+): coarse detection for major state changes.
#   hi=768 lo=320 (ffmpeg defaults) catches navigation, modals, large reflows.
if [[ "$THRESHOLD" -le 4 ]]; then
  HI=64
  LO=16
elif [[ "$THRESHOLD" -le 10 ]]; then
  HI=200
  LO=64
else
  HI=768
  LO=320
fi

# Convert threshold to frac (0.01 - 1.00)
FRAC=$(echo "scale=2; $THRESHOLD / 100" | bc)
if [[ $(echo "$FRAC < 0.01" | bc -l) -eq 1 ]]; then
  FRAC="0.01"
fi

# Build the filter chain:
# 1. fps=120: normalize VFR recordings (screen recorders often use 1000fps containers)
# 2. mpdecimate: drop static/unchanged frames
# 3. setpts: re-timestamp remaining frames sequentially
# 4. drawtext (if available): burn the deduped timeline position as a second timestamp
#    The original timestamp was already burned by normalize-video.sh (top-left).
#    This adds the deduped position (top-right) so the agent sees both.
FILTER_CHAIN="fps=120,mpdecimate=hi=$HI:lo=$LO:frac=$FRAC,setpts=N/FRAME_RATE/TB"

# Check if drawtext is available for the deduped timestamp overlay
if ffmpeg -filters 2>/dev/null | grep -q "drawtext"; then
  # Get output width for font size calculation (use input width as proxy)
  INPUT_WIDTH=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$INPUT" 2>/dev/null || echo "1920")
  FONTSIZE=$(echo "$INPUT_WIDTH * 28 / 1920" | bc 2>/dev/null || echo "24")
  if [[ "$FONTSIZE" -lt 16 ]]; then
    FONTSIZE=16
  fi

  # Deduped timestamp: top-right, green text to distinguish from original (white, top-left)
  FILTER_CHAIN="${FILTER_CHAIN},drawtext=text='%{pts\\:hms}':x=(w-tw-10):y=10:fontsize=${FONTSIZE}:fontcolor=lime:box=1:boxcolor=black@0.5:boxborderw=5"
fi

ffmpeg -y -loglevel error \
  -i "$INPUT" \
  -vf "$FILTER_CHAIN" \
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
echo "threshold=$THRESHOLD"
echo "output=$OUTPUT"
