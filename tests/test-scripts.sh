#!/bin/bash
# test-scripts.sh — Validate vision-replay shell scripts
# Usage: test-scripts.sh [--check-ffmpeg]
# Exit: 0 all tests pass, 1 any test fails

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/../skills/vision-replay/scripts" && pwd)"
PASS=0
FAIL=0
CHECK_FFMPEG=false

for arg in "$@"; do
  if [[ "$arg" == "--check-ffmpeg" ]]; then
    CHECK_FFMPEG=true
  fi
done

pass() {
  PASS=$((PASS + 1))
  echo "  PASS: $1"
}

fail() {
  FAIL=$((FAIL + 1))
  echo "  FAIL: $1"
}

SCRIPTS=(
  "video-info.sh"
  "dedupe-video.sh"
  "extract-frames.sh"
  "extract-progressive.sh"
  "contact-sheet.sh"
  "batch-frames.sh"
  "diff-frames.sh"
  "cleanup.sh"
)

echo "=== Script Existence ==="
for script in "${SCRIPTS[@]}"; do
  if [[ -f "$SCRIPT_DIR/$script" ]]; then
    pass "$script exists"
  else
    fail "$script NOT FOUND at $SCRIPT_DIR/$script"
  fi
done

echo ""
echo "=== Script Executability ==="
for script in "${SCRIPTS[@]}"; do
  if [[ -x "$SCRIPT_DIR/$script" ]]; then
    pass "$script is executable"
  else
    fail "$script is NOT executable"
  fi
done

echo ""
echo "=== Script Usage Output (no args → stderr + non-zero exit) ==="
for script in "${SCRIPTS[@]}"; do
  if [[ ! -f "$SCRIPT_DIR/$script" ]]; then
    fail "$script skipped (not found)"
    continue
  fi
  OUTPUT=$(bash "$SCRIPT_DIR/$script" 2>&1 || true)
  EXIT_CODE=$(bash "$SCRIPT_DIR/$script" 2>/dev/null; echo $?) 2>/dev/null || EXIT_CODE=$?
  if [[ $EXIT_CODE -ne 0 ]]; then
    pass "$script exits non-zero with no args"
  else
    fail "$script exits 0 with no args (should fail)"
  fi
done

if [[ "$CHECK_FFMPEG" == true ]]; then
  echo ""
  echo "=== ffmpeg Availability ==="
  if command -v ffmpeg &>/dev/null; then
    pass "ffmpeg is installed ($(ffmpeg -version 2>&1 | head -1))"
  else
    fail "ffmpeg is NOT installed"
  fi

  if command -v ffprobe &>/dev/null; then
    pass "ffprobe is installed"
  else
    fail "ffprobe is NOT installed"
  fi

  if command -v bc &>/dev/null; then
    pass "bc is installed"
  else
    fail "bc is NOT installed"
  fi
fi

echo ""
echo "=== Results ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi

echo "All tests passed."
