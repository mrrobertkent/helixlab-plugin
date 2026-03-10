<experimental_notice>
**EXPERIMENTAL:** This workflow uses cmux-native team orchestration. It is functional but not battle-tested. Expect to adapt coordination patterns based on real-world results.
</experimental_notice>

<required_reading>

Read these reference files NOW:
1. references/team-protocol.md
2. references/cli-commands.md

</required_reading>

<process>

**Step 1: Plan the team**

Determine:
- Number of members (2-8 recommended)
- Member names and roles (e.g., "reviewer-1", "tester", "documenter")
- Team name (e.g., "review-team", "build-team")
- Task assignments for each member

**Step 2: Create team surfaces**

Use the team creation script:

```bash
scripts/cmux-team-create.sh \
  --team-name "review-team" \
  --members 3
```

The script:
- Creates split surfaces for each member
- Launches `claude --dangerously-skip-permissions` in each with team flags
- Assigns colors automatically
- Creates team config at `~/.claude/teams/review-team/config.json`

Or create manually (for custom layouts):

```bash
# Create surfaces
cmux new-split right    # Member 1
cmux new-split down     # Member 2

# Launch Claude in each with team flags
cmux send-surface --surface surface:N "claude --dangerously-skip-permissions --agent-id member-1 --agent-name 'Reviewer' --team-name review-team --agent-color blue\n"
```

**Step 3: Assign tasks**

Write task assignments to each member's inbox:

```bash
# Create inbox directory
mkdir -p ~/.claude/teams/review-team/inboxes

# Assign task to member
cat > ~/.claude/teams/review-team/inboxes/member-1.json << 'EOF'
{
  "type": "task_assignment",
  "from": "orchestrator",
  "content": "Review all files in src/auth/ for security issues. Write findings to /tmp/review-member-1.md",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

**Step 4: Monitor progress**

Use the status script:

```bash
scripts/cmux-team-status.sh --team-name "review-team"
```

Or poll manually:

```bash
# Check for completion messages
cat ~/.claude/teams/review-team/inboxes/orchestrator.json
```

**Step 5: Collect results**

When members write completion messages, read the results:

```bash
# Read result files that members were instructed to create
cat /tmp/review-member-1.md
cat /tmp/review-member-2.md
cat /tmp/review-member-3.md
```

**Step 6: Teardown**

```bash
scripts/cmux-team-teardown.sh --team-name "review-team"
```

The script:
- Sends shutdown requests to each member's inbox
- Waits for acknowledgment (with timeout)
- Closes surfaces
- Cleans up team config

</process>

<success_criteria>

This workflow is complete when:
- [ ] Team surfaces created and Claude running in each
- [ ] Tasks assigned via inbox files
- [ ] Members completed their work
- [ ] Results collected
- [ ] Team torn down gracefully

</success_criteria>
