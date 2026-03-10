#!/bin/bash
# Template: Spawn and Handoff — Create new session with context file
# COPY this template for session continuation workflows.
#
# Usage pattern:
#   1. Copy and customize the CONTEXT section
#   2. Run to spawn a new session with the context

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Configuration (customize these) ---
CONTEXT_FILE="/tmp/handoff-context.md"
LAYOUT="split"  # split or tab

# --- Write context file (customize this) ---
cat > "$CONTEXT_FILE" << 'CONTEXT'
# Task Handoff

## Previous Session Summary
[Describe what was accomplished]

## Remaining Work
[Describe what needs to be done]

## Key Files
- /path/to/file1.ts — [description]
- /path/to/file2.ts — [description]

## Instructions
1. Read the files listed above
2. [Specific instructions]
3. Write results to /tmp/handoff-results.md
CONTEXT

echo "Context written to $CONTEXT_FILE"

# --- Spawn session ---
"$SCRIPT_DIR/../scripts/cmux-spawn.sh" \
    --type session \
    --"$LAYOUT" \
    --prompt "Read $CONTEXT_FILE and follow the instructions inside."

echo "Session spawned with context handoff."
