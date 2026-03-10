<required_reading>

Read these reference files NOW:
1. references/cli-commands.md
2. references/environment-and-config.md

</required_reading>

<process>

**Step 1: Choose layout for new session**

Decide where the new Claude session will run:
- **Split pane** (side by side): `cmux new-split right` or `cmux new-split down`
- **New tab** (new workspace): `cmux new-workspace` then `cmux new-surface --type terminal`
- **New window**: `cmux window create` then use the new window's surface

**Step 2: Create the surface**

```bash
# Split pane (recommended for visibility)
cmux new-split right
# Note the output — it returns the new pane/surface handle
```

Or use the spawn script (handles all steps):
```bash
scripts/cmux-spawn.sh --type session --split --prompt "your task here"
```

If using the script, you can skip to Step 6.

**Step 3: Identify the new surface**

```bash
cmux list-surfaces --json
```

Find the newly created surface. It will be a terminal surface.

**Step 4: Launch Claude in the new surface**

```bash
cmux send-surface --surface surface:N "claude --dangerously-skip-permissions\n"
```

**Step 5: Wait for Claude to initialize**

Claude takes ~3-5 seconds to start. Wait briefly, then send the prompt:

```bash
sleep 4
```

**Step 6: Send the prompt**

```bash
cmux send-surface --surface surface:N "Your task description here\n"
```

For multi-line prompts or complex tasks, write to a file first:
```bash
cat > /tmp/task-prompt.md << 'EOF'
# Task: Review auth module

Review all files in src/auth/ for:
1. Security vulnerabilities
2. Missing input validation
3. Error handling gaps

Write your findings to /tmp/auth-review-results.md
EOF

cmux send-surface --surface surface:N "Read /tmp/task-prompt.md and follow the instructions\n"
```

</process>

<continuation_pattern>

For spawning a continuation session (current session hands off work):

1. Write context/instructions to a file
2. Spawn new session
3. Send the file path as the prompt

```bash
# Write context
cat > /tmp/continuation-context.md << 'EOF'
# Continuation Context

Previous session completed: database schema design
Next steps: implement the migrations

Schema file: /path/to/schema.sql
Target directory: /path/to/migrations/

Instructions:
1. Read the schema file
2. Generate migration files
3. Run migrations locally
4. Report results
EOF

# Spawn and hand off
scripts/cmux-spawn.sh --type session --split \
  --prompt "Read /tmp/continuation-context.md and follow the instructions"
```

</continuation_pattern>

<success_criteria>

This workflow is complete when:
- [ ] New surface created (split, tab, or window)
- [ ] Claude launched with `--dangerously-skip-permissions`
- [ ] Initial prompt sent successfully
- [ ] New session is actively working on the task

</success_criteria>
