#!/bin/bash
# diff-frames.sh — Generate side-by-side comparison composites
# Usage: diff-frames.sh <ref-dir> <impl-dir> <output-dir>
# Output: Side-by-side PNGs (diff_0001.png, diff_0002.png, ...)
# Handles mismatched frame counts (pads shorter set with last frame)

set -euo pipefail

REF_DIR="${1:-}"
IMPL_DIR="${2:-}"
OUTPUT_DIR="${3:-}"

if [[ -z "$REF_DIR" || -z "$IMPL_DIR" || -z "$OUTPUT_DIR" ]]; then
  echo "Error: Missing required arguments" >&2
  echo "Usage: diff-frames.sh <ref-dir> <impl-dir> <output-dir>" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

REF_FRAMES=($(find "$REF_DIR" -maxdepth 1 -name "frame_*" -type f | sort))
IMPL_FRAMES=($(find "$IMPL_DIR" -maxdepth 1 -name "frame_*" -type f | sort))

REF_COUNT=${#REF_FRAMES[@]}
IMPL_COUNT=${#IMPL_FRAMES[@]}
MAX_COUNT=$((REF_COUNT > IMPL_COUNT ? REF_COUNT : IMPL_COUNT))

if [[ $MAX_COUNT -eq 0 ]]; then
  echo "Error: No frames found in input directories" >&2
  exit 1
fi

DIFF_COUNT=0
for ((i=0; i<MAX_COUNT; i++)); do
  # Pad with last frame if one set is shorter
  REF_IDX=$((i < REF_COUNT ? i : REF_COUNT - 1))
  IMPL_IDX=$((i < IMPL_COUNT ? i : IMPL_COUNT - 1))

  REF_FRAME="${REF_FRAMES[$REF_IDX]}"
  IMPL_FRAME="${IMPL_FRAMES[$IMPL_IDX]}"
  OUTPUT_FILE=$(printf "%s/diff_%04d.png" "$OUTPUT_DIR" $((i + 1)))

  ffmpeg -y -loglevel error \
    -i "$REF_FRAME" -i "$IMPL_FRAME" \
    -filter_complex "[0:v]scale=480:-1,pad=490:ih:0:0:black[left];[1:v]scale=480:-1[right];[left][right]overlay=490:0" \
    "$OUTPUT_FILE" && {
    DIFF_COUNT=$((DIFF_COUNT + 1))
  }
done

echo "diff_frames=$DIFF_COUNT"
echo "ref_frames=$REF_COUNT"
echo "impl_frames=$IMPL_COUNT"
echo "output_dir=$OUTPUT_DIR"
