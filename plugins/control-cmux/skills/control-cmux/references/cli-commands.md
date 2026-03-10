<overview>
Complete cmux CLI reference for topology control: windows, workspaces, panes, surfaces, status, and notifications. For browser-specific commands, see browser-commands.md.

All commands follow: `cmux <command> [args] [flags]`
Most commands accept `--json` for machine-readable output.
</overview>

<table_of_contents>

1. Identification
2. Workspace Commands
3. Pane Commands
4. Surface Commands
5. Window Commands
6. Status & Progress
7. Notifications & Logging
8. Common Patterns

</table_of_contents>

<identification>

| Command | Purpose | Example |
|---------|---------|---------|
| `cmux identify` | Show current surface/workspace/pane info | `cmux identify --json` |
| `cmux tree` | Full hierarchy view (windows/workspaces/panes/surfaces) | `cmux tree` |
| `cmux ping` | Check socket connection | `cmux ping` → `pong` |

`identify --json` output includes: surface ID, workspace ID, pane ID, window ID, surface type.

</identification>

<workspace_commands>

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `cmux list-workspaces` | List workspaces in current window | `--json` |
| `cmux new-workspace` | Create new workspace (tab) | Returns workspace handle |
| `cmux select-workspace` | Switch to a workspace | `--workspace workspace:N` |
| `cmux close-workspace` | Close a workspace | `--workspace workspace:N` |

**Workspace lifecycle:**
1. `cmux new-workspace` → creates `workspace:N`, switches to it
2. `cmux select-workspace --workspace workspace:1` → switches back
3. `cmux close-workspace --workspace workspace:N` → closes it

</workspace_commands>

<pane_commands>

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `cmux list-panes` | List panes in current workspace | `--json` |
| `cmux new-split` | Create split pane | `right`, `down` (direction) |

**Split directions:**
- `cmux new-split right` → vertical split (new pane to the right)
- `cmux new-split down` → horizontal split (new pane below)

New split returns the new pane handle and creates a terminal surface in it.

</pane_commands>

<surface_commands>

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `cmux list-surfaces` | List surfaces in current workspace | `--json` |
| `cmux new-surface` | Create surface in a pane | `--type terminal\|browser`, `--pane pane:N` |
| `cmux focus-surface` | Focus a surface | `--surface surface:N` |
| `cmux close-surface` | Close a surface | `--surface surface:N` |
| `cmux send-surface` | Send text/keystrokes to a surface | `--surface surface:N "text\n"` |

**Surface types:** `terminal`, `browser`, `markdown`

**send-surface** is how you type into a terminal surface programmatically:
```bash
# Send a command to a terminal surface (include \n to execute)
cmux send-surface --surface surface:5 "echo hello\n"

# Send to launch Claude in a new surface
cmux send-surface --surface surface:5 "claude --dangerously-skip-permissions\n"
```

</surface_commands>

<window_commands>

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `cmux window list` | List all windows | `--json` |
| `cmux window current` | Show current window | `--json` |
| `cmux window create` | Create new OS window | Returns window handle |
| `cmux window focus` | Focus a window | `--window window:N` |
| `cmux window close` | Close a window | `--window window:N` |

**Cross-window operations:**
- Target specific window: `cmux list-workspaces --window window:N`
- Move workspace to window: `cmux workspace move-to-window --workspace workspace:N --window window:N`
- Most commands default to current window if `--window` omitted

</window_commands>

<status_and_progress>

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `cmux set-status` | Set sidebar status pill | `<key> <value> [--icon <icon>] [--color <hex>]` |
| `cmux clear-status` | Clear a status pill | `<key>` |
| `cmux set-progress` | Set progress bar (0.0–1.0) | `<value> [--label "text"]` |
| `cmux clear-progress` | Clear progress bar | (none) |

**Status pills** appear in the cmux sidebar. Use for persistent state display:
```bash
cmux set-status "task" "Running tests" --icon "🧪" --color "#4CAF50"
cmux clear-status "task"
```

**Progress bar** appears at the bottom. Use for long operations:
```bash
cmux set-progress 0.5 --label "Processing files..."
cmux clear-progress
```

</status_and_progress>

<notifications_and_logging>

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `cmux notify` | Send notification | `--title "..." --body "..."` |
| `cmux log` | Write log entry | `"message" --level success\|info\|warn\|error --source "name"` |

```bash
cmux notify --title "Build Complete" --body "All 42 tests passed"
cmux log "Test suite passed" --level success --source "test-runner"
```

</notifications_and_logging>

<common_patterns>

**Create a workspace with two splits:**
```bash
cmux new-workspace           # Creates workspace:N, switches to it
cmux new-split right         # Creates right split, returns pane:N
```

**Open browser next to terminal:**
```bash
cmux new-split right                        # New pane to the right
cmux browser open https://example.com       # Opens in new browser surface
```

**Discover current topology:**
```bash
cmux tree                                   # Visual hierarchy
cmux identify --json                        # Current surface context
cmux list-surfaces --json                   # All surfaces in workspace
```

</common_patterns>
