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
  "normalize-video.sh"
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

# --- Record Browser ---
RB_DIR="$(cd "$(dirname "$0")/../skills/record-browser" && pwd)"

echo ""
echo "=== Record Browser Scripts ==="

# recorder.js and cdp.js exist and have valid syntax
for js_file in recorder.js cdp.js; do
  if [[ -f "$RB_DIR/scripts/$js_file" ]]; then
    pass "$js_file exists"
  else
    fail "$js_file NOT FOUND"
  fi

  if command -v node &>/dev/null && [[ -f "$RB_DIR/scripts/$js_file" ]]; then
    if node --check "$RB_DIR/scripts/$js_file" 2>/dev/null; then
      pass "$js_file syntax check"
    else
      fail "$js_file syntax error"
    fi
  fi
done

# Bash scripts exist and are executable
for rb_script in install-browser.sh launch-recorder.sh stop-recorder.sh; do
  if [[ -f "$RB_DIR/scripts/$rb_script" ]]; then
    pass "$rb_script exists"
  else
    fail "$rb_script NOT FOUND"
  fi
  if [[ -x "$RB_DIR/scripts/$rb_script" ]]; then
    pass "$rb_script is executable"
  else
    fail "$rb_script is NOT executable"
  fi
done

# stop-recorder.sh fails with no active recording
if bash "$RB_DIR/scripts/stop-recorder.sh" 2>/dev/null; then
  fail "stop-recorder.sh should exit non-zero with no active recording"
else
  pass "stop-recorder.sh exits non-zero with no active recording"
fi

# Vendored assets exist
if [[ -f "$RB_DIR/vendor/fabric.min.js" ]]; then
  pass "vendor/fabric.min.js exists"
else
  fail "vendor/fabric.min.js NOT FOUND"
fi

if [[ -f "$RB_DIR/pages/welcome.html" ]]; then
  pass "pages/welcome.html exists"
else
  fail "pages/welcome.html NOT FOUND"
fi

if [[ -f "$RB_DIR/pages/playground.html" ]]; then
  pass "pages/playground.html exists"
else
  fail "pages/playground.html NOT FOUND"
fi

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

  # drawtext filter for timestamp overlay
  if ffmpeg -filters 2>/dev/null | grep "drawtext" > /dev/null; then
    pass "drawtext filter available (timestamp overlay enabled)"
  else
    echo "  WARN: drawtext filter missing — timestamp overlays will be disabled"
    echo "        macOS: Download static build from https://ffmpeg.martin-riedl.de"
    echo "        macOS: Or run: bash scripts/setup.sh --yes"
    echo "        Linux: sudo apt install ffmpeg (includes drawtext by default)"
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
