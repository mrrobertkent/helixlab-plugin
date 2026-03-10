<overview>
How interactive snapshot refs work, their lifecycle, and best practices for reliable browser automation. This is the most important concept for browser interaction in cmux.
</overview>

<table_of_contents>

1. How Refs Work
2. Ref Lifecycle
3. Stale Ref Recovery
4. Snapshot Flags
5. Snapshot-After Pattern
6. CSS Selector Fallback
7. Best Practices

</table_of_contents>

<how_refs_work>

When you take an interactive snapshot, cmux assigns short references to every interactive element on the page:

```bash
cmux browser surface:2 snapshot --interactive --compact
```

Output includes lines like:
```
[e1] button "Sign In"
[e2] input[type=email] "Email address"
[e3] input[type=password] "Password"
[e4] a "Forgot password?"
[e5] button "Create account"
```

These refs (`e1`, `e2`, `e3`...) can be used in subsequent commands instead of CSS selectors:

```bash
cmux browser surface:2 fill e2 --value "user@example.com"
cmux browser surface:2 fill e3 --value "password123"
cmux browser surface:2 click e1 --snapshot-after
```

</how_refs_work>

<ref_lifecycle>

**Refs are valid ONLY until the DOM changes or the page navigates.**

```
1. Take snapshot --interactive          → refs assigned (e1, e2, e3...)
2. Use refs in commands                 → refs are valid ✓
3. Page navigates or DOM updates        → ALL refs become STALE ✗
4. Must re-snapshot                     → NEW refs assigned
```

**What invalidates refs:**
- Any page navigation (`go`, `back`, `forward`, clicking a link)
- DOM mutations (JavaScript adding/removing elements)
- Form submissions that trigger page reload
- SPA route changes
- AJAX responses that update the DOM

**Key rule:** After any action that changes the page, re-snapshot before using refs again.

</ref_lifecycle>

<stale_ref_recovery>

If you use a stale ref, cmux returns an error like: `"ref e3 not found or stale"`

**Recovery steps:**
1. Take a fresh snapshot: `cmux browser surface:2 snapshot --interactive --compact`
2. Identify the element again in the new snapshot output
3. Use the new ref

**Prevention:** Use `--snapshot-after` on mutating commands — this automatically provides fresh refs after the action.

</stale_ref_recovery>

<snapshot_flags>

| Flag | Effect |
|------|--------|
| `--interactive` | Assigns refs to interactive elements (inputs, buttons, links, etc.) |
| `--compact` | Reduces output size by omitting non-interactive structural elements |
| `--mode full` | Full HTML structure (verbose, rarely needed) |

**Recommended default:** `--interactive --compact`

Use `--mode full` only when you need to inspect the complete page structure (e.g., debugging layout issues).

</snapshot_flags>

<snapshot_after_pattern>

The `--snapshot-after` flag is available on all mutating browser commands. It combines the action + a fresh interactive snapshot in one call:

```bash
# Without --snapshot-after (2 commands):
cmux browser surface:2 click e1
cmux browser surface:2 snapshot --interactive --compact

# With --snapshot-after (1 command, same result):
cmux browser surface:2 click e1 --snapshot-after
```

**Always use `--snapshot-after`** on actions that change the page. It saves a round trip and ensures you have fresh refs immediately.

</snapshot_after_pattern>

<css_selector_fallback>

When refs are unreliable or you know the exact selector, use CSS selectors instead:

```bash
cmux browser surface:2 click "button[type=submit]" --snapshot-after
cmux browser surface:2 fill "input#email" --value "user@example.com"
cmux browser surface:2 get text ".error-message"
```

CSS selectors are stable across page changes (the selector itself doesn't go stale, though the element it matches might not exist). Prefer refs for interactive workflows, selectors for known elements.

</css_selector_fallback>

<best_practices>

1. **Always snapshot first** before interacting with a page
2. **Always use `--snapshot-after`** on mutating actions
3. **Re-snapshot after navigation** — never assume old refs are valid
4. **Use `--interactive --compact`** as the default snapshot flags
5. **CSS selectors for known elements** — use when you know the exact selector
6. **Refs for discovery** — use when exploring an unfamiliar page
7. **Check snapshot output** before acting — verify the element you want exists
8. **One action at a time** — don't batch multiple clicks without re-snapshotting between

</best_practices>
