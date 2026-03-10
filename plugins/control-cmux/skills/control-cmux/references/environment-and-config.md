<overview>
How to detect, configure, and operate within a cmux environment. Every workflow should verify cmux context before executing commands.
</overview>

<detection>

**Three ways to confirm you're in cmux:**

1. **Check env var** (fastest): `[ -n "$CMUX_WORKSPACE_ID" ]`
2. **Ping socket**: `cmux ping` → returns `pong` if connected
3. **Check socket file**: `[ -S /tmp/cmux.sock ]`

Use the `scripts/cmux-env.sh` script for comprehensive detection with JSON output.

If not in cmux, inform the user: "This operation requires cmux. Commands won't work in a standard terminal."

</detection>

<environment_variables>

| Variable | Set By | Value | Purpose |
|----------|--------|-------|---------|
| `CMUX_WORKSPACE_ID` | cmux (per surface) | `workspace:N` | Identifies which workspace the current surface belongs to |
| `CMUX_SURFACE_ID` | cmux (per surface) | `surface:N` | Identifies the current surface |

These are set automatically for every surface cmux creates. They are workspace-relative — commands that don't specify a target use these values.

**Important:** Each surface gets its own env vars. A terminal in `surface:3` inside `workspace:1` sees `CMUX_WORKSPACE_ID=workspace:1` and `CMUX_SURFACE_ID=surface:3`.

</environment_variables>

<socket>

**Path:** `/tmp/cmux.sock`
**Protocol:** JSON-RPC v2 over Unix domain socket

All `cmux` CLI commands communicate with the cmux server via this socket. The CLI is a thin client — it formats JSON-RPC requests, sends them to the socket, and prints responses.

You never need to interact with the socket directly. Use `cmux` CLI commands.

</socket>

<handle_format>

cmux uses short reference handles instead of UUIDs:

| Handle | Format | Example |
|--------|--------|---------|
| Surface | `surface:N` | `surface:3` |
| Workspace | `workspace:N` | `workspace:1` |
| Pane | `pane:N` | `pane:2` |
| Window | `window:N` | `window:0` |

**Rules:**
- N is a small integer assigned sequentially
- Handles are stable for the lifetime of the object
- Always use handles in commands, never UUIDs
- Use `cmux identify` to discover your current handles

</handle_format>

<hierarchy>

```
Window (OS-level window)
  └── Workspace (virtual desktop, switchable tabs)
        └── Pane (split region within workspace)
              └── Surface (content view: terminal, browser, markdown)
                    └── Panel (sub-view within surface, rare)
```

**Key relationships:**
- A window contains 1+ workspaces (tabs)
- A workspace contains 1+ panes (splits)
- A pane contains 1+ surfaces (content views)
- Most commands target surfaces (the content layer)
- Layout commands target workspaces and panes

</hierarchy>

<ghostty_integration>

cmux runs inside Ghostty terminal. Relevant Ghostty details:

- **Config file:** `~/.config/ghostty/config`
- **Shell integration:** Required for working directory tracking — cmux uses this
- **Keybindings:** Ghostty has its own keybindings for tabs/splits, but cmux CLI is the primary control surface for agents (keybindings are for human use)

Agents should always use `cmux` CLI commands, not Ghostty keybindings.

</ghostty_integration>

<workspace_relative_behavior>

Commands are workspace-relative by default:
- `cmux list-surfaces` lists surfaces in YOUR workspace, not all workspaces
- `cmux new-split right` creates a split in YOUR workspace
- `cmux browser open https://...` opens browser in YOUR workspace

To target a different workspace, use `--workspace workspace:N` flag.
To target a specific window, use `--window window:N` flag.

This means an agent running in a background workspace won't accidentally affect the user's visible workspace.

</workspace_relative_behavior>
