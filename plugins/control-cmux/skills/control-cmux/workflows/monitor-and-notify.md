<required_reading>

Read these reference files NOW:
1. references/cli-commands.md (status, progress, and notification sections)

</required_reading>

<process>

**Step 1: Choose notification type**

- **Status pill** — persistent sidebar indicator (key-value, stays until cleared)
- **Progress bar** — bottom bar showing 0-100% completion
- **Notification** — one-time popup message
- **Log entry** — append to cmux log

**Step 2: Set status pills**

Status pills appear in the cmux sidebar. Use for persistent state display:

```bash
# Set a status pill
cmux set-status "task" "Running tests" --icon "🧪" --color "#4CAF50"
cmux set-status "build" "Compiling..." --icon "🔨" --color "#FF9800"

# Update the same key (replaces previous value)
cmux set-status "task" "Tests passed (42/42)" --icon "✅" --color "#4CAF50"

# Clear when done
cmux clear-status "task"
cmux clear-status "build"
```

**Step 3: Set progress bar**

```bash
# Set progress (0.0 to 1.0)
cmux set-progress 0.0 --label "Starting..."
cmux set-progress 0.25 --label "Processing files (25%)"
cmux set-progress 0.5 --label "Running tests (50%)"
cmux set-progress 1.0 --label "Complete"

# Clear progress bar
cmux clear-progress
```

**Step 4: Send notifications**

```bash
cmux notify --title "Build Complete" --body "All tests passed. Ready to deploy."
```

**Step 5: Write log entries**

```bash
cmux log "Started test suite" --level info --source "test-runner"
cmux log "All 42 tests passed" --level success --source "test-runner"
cmux log "Deprecated API used in auth.ts" --level warn --source "linter"
cmux log "Connection refused on port 5432" --level error --source "db-check"
```

**Log levels:** `success`, `info`, `warn`, `error`

</process>

<monitoring_pattern>

For long-running tasks, combine status + progress + final notification:

```bash
# Start
cmux set-status "deploy" "Deploying..." --icon "🚀"
cmux set-progress 0.0 --label "Building..."

# Progress updates
cmux set-progress 0.3 --label "Running tests..."
cmux set-progress 0.6 --label "Building container..."
cmux set-progress 0.9 --label "Pushing to registry..."

# Complete
cmux set-progress 1.0 --label "Done"
cmux set-status "deploy" "Deployed v2.1.0" --icon "✅" --color "#4CAF50"
cmux notify --title "Deploy Complete" --body "v2.1.0 deployed to production"

# Clean up
cmux clear-progress
# (leave status pill for visibility)
```

</monitoring_pattern>

<success_criteria>

This workflow is complete when:
- [ ] Appropriate notification type was chosen
- [ ] Status/progress/notification/log was set correctly
- [ ] Status pills were cleared after completion
- [ ] Progress bar was cleared after completion

</success_criteria>
