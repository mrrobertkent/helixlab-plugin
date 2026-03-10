<overview>
Demonstrates session continuation: the current session writes context to a file, spawns a new Claude session, and hands off the work. Useful for long-running tasks, parallel work, or when a fresh context is beneficial.
</overview>

<scenario>
An agent has completed database schema design and needs to hand off migration implementation to a fresh session.
</scenario>

<walkthrough>

**Step 1: Write context file**
```bash
cat > /tmp/migration-handoff.md << 'EOF'
# Migration Implementation

## Context
Database schema design is complete. The schema file is at:
/path/to/project/schema/v2.sql

## Previous Decisions
- Using PostgreSQL 16
- Row-level security enabled
- Multi-tenant via org_id column

## Your Task
1. Read the schema file at /path/to/project/schema/v2.sql
2. Generate Supabase migration files in /path/to/project/supabase/migrations/
3. Include RLS policies for each table
4. Test migrations locally with `supabase db reset`
5. Write a summary of changes to /tmp/migration-results.md

## Key Constraints
- Do NOT modify the schema file itself
- Each migration file should be idempotent
- Follow existing naming convention: YYYYMMDDHHMMSS_description.sql
EOF
```

**Step 2: Spawn continuation session**
```bash
# Using the spawn script
scripts/cmux-spawn.sh --type session --split \
  --prompt "Read /tmp/migration-handoff.md and follow the instructions."
```

Or manually:
```bash
# Create split
cmux new-split right

# Get new surface
cmux list-surfaces --json

# Launch Claude
cmux send-surface --surface surface:N "claude --dangerously-skip-permissions\n"

# Wait and send prompt
sleep 4
cmux send-surface --surface surface:N "Read /tmp/migration-handoff.md and follow the instructions.\n"
```

**Step 3: Monitor (optional)**
The spawned session runs independently. You can:
- Watch the split pane visually
- Check for result files: `ls /tmp/migration-results.md`
- Set up cmux status/progress in the original session

</walkthrough>

<key_point>
The context file is the handoff mechanism. Write everything the new session needs to know — what was done, what remains, where files are, what constraints apply. The new session starts fresh with full context from the file.
</key_point>
