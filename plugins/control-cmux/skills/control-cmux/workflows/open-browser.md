<required_reading>

Read these reference files NOW:
1. references/environment-and-config.md
2. references/cli-commands.md

</required_reading>

<process>

**Step 1: Verify cmux environment**

Run the environment check script or verify manually:
```bash
# Quick check
[ -n "$CMUX_WORKSPACE_ID" ] && echo "In cmux" || echo "Not in cmux"

# Or use the script
scripts/cmux-env.sh
```

If not in cmux, stop and inform the user.

**Step 2: Open the browser**

Choose based on desired layout:

```bash
# New browser tab (default — opens in current workspace)
cmux browser open https://example.com

# Browser in split pane (side-by-side with terminal)
cmux browser open-split https://example.com
```

**Step 3: Identify the new surface**

The open command output includes the surface handle. If you missed it:
```bash
cmux browser identify
# or
cmux list-surfaces --json
```

Note the surface handle (e.g., `surface:2`) — you need it for all subsequent browser commands.

**Step 4: Wait for page to load**

```bash
cmux browser surface:N wait --load-state complete --timeout-ms 15000
```

For SPAs or dynamic pages, wait for specific content:
```bash
cmux browser surface:N wait --text "Expected content" --timeout-ms 10000
```

**Step 5: Verify URL loaded correctly**

```bash
cmux browser surface:N get url
```

Confirm the URL matches what was requested.

**Step 6: Take initial snapshot**

```bash
cmux browser surface:N snapshot --interactive --compact
```

Read the snapshot output to understand the page structure and available interactive elements.

</process>

<success_criteria>

This workflow is complete when:
- [ ] Browser surface is open with the correct URL
- [ ] Surface handle is known (surface:N)
- [ ] Page has fully loaded
- [ ] Initial interactive snapshot has been taken
- [ ] Page structure and interactive elements are understood

</success_criteria>
