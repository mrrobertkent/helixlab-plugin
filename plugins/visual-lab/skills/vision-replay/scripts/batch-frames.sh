#!/bin/bash
# batch-frames.sh — Organize frames into read-ready batches
# Usage: batch-frames.sh <frames-dir> [batch_size=15]
# Output: batch_01/, batch_02/, ... subdirs with symlinks
# Stdout: batch count and paths

set -euo pipefail

FRAMES_DIR="${1:-}"
BATCH_SIZE="${2:-15}"

if [[ -z "$FRAMES_DIR" ]]; then
  echo "Error: No frames directory provided" >&2
  echo "Usage: batch-frames.sh <frames-dir> [batch_size]" >&2
  exit 1
fi

if [[ ! -d "$FRAMES_DIR" ]]; then
  echo "Error: Directory not found: $FRAMES_DIR" >&2
  exit 1
fi

# Get sorted list of frame files
FRAMES=($(find "$FRAMES_DIR" -maxdepth 1 -name "frame_*" -type f | sort))
TOTAL=${#FRAMES[@]}

if [[ $TOTAL -eq 0 ]]; then
  echo "Error: No frame files found in $FRAMES_DIR" >&2
  exit 1
fi

BATCH_NUM=0
for ((i=0; i<TOTAL; i+=BATCH_SIZE)); do
  BATCH_NUM=$((BATCH_NUM + 1))
  BATCH_DIR=$(printf "%s/batch_%02d" "$FRAMES_DIR" "$BATCH_NUM")
  mkdir -p "$BATCH_DIR"

  for ((j=i; j<i+BATCH_SIZE && j<TOTAL; j++)); do
    FRAME="${FRAMES[$j]}"
    ln -sf "$FRAME" "$BATCH_DIR/$(basename "$FRAME")"
  done
done

echo "total_frames=$TOTAL"
echo "batch_size=$BATCH_SIZE"
echo "batch_count=$BATCH_NUM"
echo "batch_dir_prefix=$FRAMES_DIR/batch_"
