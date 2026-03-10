<required_reading>

Read these reference files NOW:
1. references/cli-commands.md
2. references/environment-and-config.md

</required_reading>

<process>

**Step 1: Identify current context**

```bash
cmux identify --json
```

This tells you your current surface, workspace, pane, and window.

For a visual overview:
```bash
cmux tree
```

**Step 2: Choose the operation**

**New workspace (tab):**
```bash
cmux new-workspace
```
Creates a new workspace tab and switches to it. Returns the new workspace handle.

**New split pane:**
```bash
# Vertical split (new pane to the right)
cmux new-split right

# Horizontal split (new pane below)
cmux new-split down
```
Returns the new pane handle with a terminal surface inside it.

**New surface in existing pane:**
```bash
cmux new-surface --type terminal --pane pane:N
cmux new-surface --type browser --pane pane:N
```

**Step 3: Navigate between workspaces**

```bash
# Switch to specific workspace
cmux select-workspace --workspace workspace:N

# List all workspaces
cmux list-workspaces --json
```

**Step 4: Focus a surface**

```bash
cmux focus-surface --surface surface:N
```

**Step 5: Close surfaces/workspaces**

```bash
# Close a surface
cmux close-surface --surface surface:N

# Close a workspace (closes all surfaces in it)
cmux close-workspace --workspace workspace:N
```

**Step 6: List what exists**

```bash
# Surfaces in current workspace
cmux list-surfaces --json

# Panes in current workspace
cmux list-panes --json

# Full hierarchy
cmux tree
```

</process>

<multi_window>

For multi-window operations:

```bash
# List all windows
cmux window list --json

# Create new window
cmux window create

# Move workspace to different window
cmux workspace move-to-window --workspace workspace:N --window window:N

# Target specific window
cmux list-workspaces --window window:N --json
```

</multi_window>

<common_layouts>

**Terminal + browser side-by-side:**
```bash
cmux browser open-split https://example.com
```

**Three-pane layout (terminal + two splits):**
```bash
cmux new-split right                    # First split
cmux new-split down                     # Second split (splits the right pane)
```

**Dedicated workspace for browser testing:**
```bash
cmux new-workspace                      # New workspace tab
cmux browser open https://example.com   # Open browser in it
cmux new-split right                    # Terminal next to browser
```

</common_layouts>

<success_criteria>

This workflow is complete when:
- [ ] Desired layout is created (workspaces, panes, surfaces)
- [ ] All surface handles are known
- [ ] Navigation between surfaces/workspaces works
- [ ] `cmux tree` shows expected topology

</success_criteria>
