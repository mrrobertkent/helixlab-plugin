<experimental_notice>
**EXPERIMENTAL:** This example uses cmux-native team orchestration, which is not battle-tested.
</experimental_notice>

<overview>
Demonstrates team orchestration: an orchestrator creates a 3-member team, assigns different file sets for review, monitors progress, collects results, and tears down the team.
</overview>

<scenario>
A codebase has three major areas that need security review: authentication, API routes, and database queries. Instead of reviewing sequentially, the orchestrator assigns each area to a different team member for parallel review.
</scenario>

<walkthrough>

**Step 1: Create the team**
```bash
scripts/cmux-team-create.sh --team-name "security-review" --members 3
```

This creates 3 split surfaces, each running Claude with team flags.

**Step 2: Assign tasks**
```bash
TEAM_DIR="$HOME/.claude/teams/security-review/inboxes"

# Member 1: Auth review
cat > "$TEAM_DIR/member-1.json" << 'EOF'
[{
  "type": "task_assignment",
  "from": "orchestrator",
  "content": "Review all files in src/auth/ for security vulnerabilities. Focus on: input validation, SQL injection, XSS, CSRF, session management. Write findings to /tmp/review-auth.md",
  "timestamp": "2026-03-09T10:00:00Z"
}]
EOF

# Member 2: API routes review
cat > "$TEAM_DIR/member-2.json" << 'EOF'
[{
  "type": "task_assignment",
  "from": "orchestrator",
  "content": "Review all files in src/api/ for security vulnerabilities. Focus on: authorization checks, rate limiting, input sanitization, error info leakage. Write findings to /tmp/review-api.md",
  "timestamp": "2026-03-09T10:00:00Z"
}]
EOF

# Member 3: Database review
cat > "$TEAM_DIR/member-3.json" << 'EOF'
[{
  "type": "task_assignment",
  "from": "orchestrator",
  "content": "Review all files in src/db/ for security vulnerabilities. Focus on: parameterized queries, RLS policies, data exposure, connection security. Write findings to /tmp/review-db.md",
  "timestamp": "2026-03-09T10:00:00Z"
}]
EOF
```

**Step 3: Monitor progress**
```bash
# Check status periodically
scripts/cmux-team-status.sh --team-name "security-review"

# Or watch continuously
scripts/cmux-team-status.sh --team-name "security-review" --watch
```

**Step 4: Collect results**
When members complete their reviews, collect the output:
```bash
# Check if result files exist
ls -la /tmp/review-auth.md /tmp/review-api.md /tmp/review-db.md

# Read and aggregate
cat /tmp/review-auth.md
cat /tmp/review-api.md
cat /tmp/review-db.md
```

**Step 5: Teardown**
```bash
scripts/cmux-team-teardown.sh --team-name "security-review"
```

</walkthrough>

<key_point>
Team orchestration enables parallel work across multiple Claude sessions. The orchestrator assigns tasks via inbox files, members work independently, and results are collected via output files. This is useful for tasks that can be parallelized across different parts of a codebase.
</key_point>
