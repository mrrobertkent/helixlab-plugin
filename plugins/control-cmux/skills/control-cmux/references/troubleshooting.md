<overview>
Common issues and solutions when working with cmux. Check this reference when something isn't working.
</overview>

<table_of_contents>

1. Issues: not_in_cmux, socket_not_found, stale_refs, wrong_surface, browser_surface_not_responding, page_not_loaded, permission_denied, workspace_interference
2. Unsupported Operations
3. Diagnostic Commands

</table_of_contents>

<issues>

<issue name="not_in_cmux">
**Symptom:** `cmux: command not found` or commands return connection errors
**Cause:** Not running inside cmux, or cmux not installed
**Fix:**
1. Check: `echo $CMUX_WORKSPACE_ID` — should show `workspace:N`
2. Check: `which cmux` — should show path to cmux binary
3. Check: `cmux ping` — should return `pong`
4. If not in cmux: inform user that cmux commands require the cmux terminal
</issue>

<issue name="socket_not_found">
**Symptom:** `Error: socket not found at /tmp/cmux.sock`
**Cause:** cmux server isn't running or socket path is different
**Fix:**
1. Verify cmux is running (it's the terminal app itself)
2. Check socket: `ls -la /tmp/cmux.sock`
3. If missing: restart cmux (close and reopen the app)
</issue>

<issue name="stale_refs">
**Symptom:** `ref e3 not found or stale`
**Cause:** DOM changed since last snapshot — refs are invalidated
**Fix:**
1. Re-snapshot: `cmux browser surface:N snapshot --interactive --compact`
2. Use the new refs from fresh snapshot output
3. Prevention: always use `--snapshot-after` on mutating commands
</issue>

<issue name="wrong_surface">
**Symptom:** Command succeeds but nothing visible happens
**Cause:** Targeting wrong surface (e.g., terminal instead of browser)
**Fix:**
1. List surfaces: `cmux list-surfaces --json`
2. Identify which surface is the browser: `cmux browser identify`
3. Use correct surface handle in subsequent commands
</issue>

<issue name="browser_surface_not_responding">
**Symptom:** Browser commands hang or timeout
**Cause:** Page not loaded, or browser surface crashed
**Fix:**
1. Check URL: `cmux browser surface:N get url` (may timeout if crashed)
2. Try reload: `cmux browser surface:N reload`
3. If crashed: close surface, open new one: `cmux close-surface --surface surface:N` then `cmux browser open <url>`
</issue>

<issue name="page_not_loaded">
**Symptom:** Snapshot returns empty or minimal content
**Cause:** Page hasn't finished loading
**Fix:**
1. Wait for load: `cmux browser surface:N wait --load-state complete --timeout-ms 15000`
2. Then snapshot: `cmux browser surface:N snapshot --interactive --compact`
3. For SPAs, wait for specific content: `cmux browser surface:N wait --text "Dashboard" --timeout-ms 10000`
</issue>

<issue name="permission_denied">
**Symptom:** Spawned Claude session prompts for permissions
**Cause:** Forgot `--dangerously-skip-permissions` flag
**Fix:** Use the flag when launching Claude in new surfaces:
```bash
cmux send-surface --surface surface:N "claude --dangerously-skip-permissions\n"
```
Or use the spawn script which handles this automatically:
```bash
scripts/cmux-spawn.sh --type session --split --prompt "your task"
```
</issue>

<issue name="workspace_interference">
**Symptom:** Agent actions affect user's visible workspace
**Cause:** Targeting wrong workspace or using global commands
**Fix:**
1. Verify current workspace: `cmux identify --json`
2. Use workspace-relative commands (they default to `$CMUX_WORKSPACE_ID`)
3. To target specific workspace: add `--workspace workspace:N`
</issue>

</issues>

<unsupported_operations>

The following browser operations are **not supported** by cmux and will return `not_supported`:

- **Viewport/device emulation** — can't simulate mobile screens
- **Geolocation setting** — can't fake GPS coordinates
- **Offline mode** — can't simulate network offline
- **Trace/screencast recording** — can't record video of browser
- **Network interception/mocking** — can't intercept or mock HTTP requests
- **Raw input injection** — `input_mouse`, `input_keyboard`, `input_touch` are not available

If you need these capabilities, use Playwright or Puppeteer instead of cmux browser.

</unsupported_operations>

<diagnostic_commands>

When troubleshooting, use these commands to gather context:

```bash
# Full topology view
cmux tree

# Current context
cmux identify --json

# All surfaces in workspace
cmux list-surfaces --json

# Socket health
cmux ping

# Browser console errors
cmux browser surface:N errors

# Browser console messages
cmux browser surface:N console
```

</diagnostic_commands>
