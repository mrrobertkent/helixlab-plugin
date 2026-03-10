#!/bin/bash
# cmux-team-create.sh — Create team surfaces and launch Claude teammates
# Usage: cmux-team-create.sh --team-name NAME --members N [options]
# EXPERIMENTAL: Team orchestration is not battle-tested

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Defaults ---
TEAM_NAME=""
MEMBER_COUNT=0
DRY_RUN=false
COLORS=(red blue green yellow purple orange pink cyan)

# --- Help ---
show_help() {
    cat << 'HELP'
cmux-team-create.sh — Create team surfaces + launch Claude teammates
EXPERIMENTAL: Team orchestration is not battle-tested

Usage:
  cmux-team-create.sh --team-name "review-team" --members 3
  cmux-team-create.sh --team-name "build-team" --members 2 --dry-run

Required:
  --team-name NAME           Team identifier
  --members N                Number of team members (2-8)

Other:
  --dry-run                  Show plan without executing
  --help                     Show this help

Creates:
  - Split surfaces for each member
  - Launches Claude with team flags in each surface
  - Team config at ~/.claude/teams/{team-name}/config.json
  - Inbox directories at ~/.claude/teams/{team-name}/inboxes/
HELP
    exit 0
}

# --- Parse args ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        --team-name) TEAM_NAME="$2"; shift 2 ;;
        --members) MEMBER_COUNT="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        --help|-h) show_help ;;
        *) echo "Error: Unknown option $1"; exit 1 ;;
    esac
done

# --- Validate ---
if [ -z "$TEAM_NAME" ]; then
    echo "Error: --team-name is required"
    exit 1
fi

if [ "$MEMBER_COUNT" -lt 2 ] || [ "$MEMBER_COUNT" -gt 8 ]; then
    echo "Error: --members must be between 2 and 8"
    exit 1
fi

if ! "$SCRIPT_DIR/cmux-env.sh" --quiet 2>/dev/null; then
    echo "Error: Not in cmux environment"
    exit 1
fi

# --- Get parent session ID ---
PARENT_SESSION="${CLAUDE_SESSION_ID:-unknown}"

# --- Team directories ---
TEAM_DIR="$HOME/.claude/teams/$TEAM_NAME"
INBOX_DIR="$TEAM_DIR/inboxes"

# --- Dry run ---
if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Team: $TEAM_NAME"
    echo "[DRY RUN] Members: $MEMBER_COUNT"
    echo "[DRY RUN] Team dir: $TEAM_DIR"
    for i in $(seq 1 "$MEMBER_COUNT"); do
        COLOR_IDX=$(( (i - 1) % ${#COLORS[@]} ))
        echo "[DRY RUN] Member $i: member-$i (${COLORS[$COLOR_IDX]})"
    done
    exit 0
fi

# --- Create team directories ---
mkdir -p "$INBOX_DIR"

# --- Create surfaces and launch Claude ---
SURFACE_IDS=()
for i in $(seq 1 "$MEMBER_COUNT"); do
    MEMBER_NAME="member-$i"
    COLOR_IDX=$(( (i - 1) % ${#COLORS[@]} ))
    COLOR="${COLORS[$COLOR_IDX]}"

    # Create split surface
    cmux new-split right > /dev/null 2>&1

    # Get new surface ID
    SURFACE_ID=$(cmux list-surfaces --json | python3 -c "
import sys, json
surfaces = json.load(sys.stdin)
terminals = [s for s in surfaces if s.get('type') == 'terminal']
if terminals:
    print(terminals[-1]['handle'])
" 2>/dev/null || echo "")

    if [ -z "$SURFACE_ID" ]; then
        echo "Error: Could not create surface for $MEMBER_NAME"
        continue
    fi

    SURFACE_IDS+=("$SURFACE_ID")

    # Launch Claude with team flags
    CLAUDE_CMD="claude --dangerously-skip-permissions"
    CLAUDE_CMD+=" --agent-id $MEMBER_NAME"
    CLAUDE_CMD+=" --agent-name $MEMBER_NAME"
    CLAUDE_CMD+=" --team-name $TEAM_NAME"
    CLAUDE_CMD+=" --agent-color $COLOR"
    CLAUDE_CMD+=" --parent-session-id $PARENT_SESSION"

    cmux send-surface --surface "$SURFACE_ID" "${CLAUDE_CMD}\n"

    # Create member inbox
    echo '[]' > "$INBOX_DIR/$MEMBER_NAME.json"

    echo "Created $MEMBER_NAME ($COLOR) in $SURFACE_ID"
done

# Create orchestrator inbox
echo '[]' > "$INBOX_DIR/orchestrator.json"

# Save team config
cat > "$TEAM_DIR/config.json" << EOF
{
  "team_name": "$TEAM_NAME",
  "member_count": $MEMBER_COUNT,
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "parent_session": "$PARENT_SESSION",
  "surfaces": [$(printf '"%s",' "${SURFACE_IDS[@]}" | sed 's/,$//')]
}
EOF

echo ""
echo "Team '$TEAM_NAME' created with $MEMBER_COUNT members"
echo "Config: $TEAM_DIR/config.json"
echo "Inboxes: $INBOX_DIR/"
