<overview>
Complete cmux browser command reference. All browser commands follow:

`cmux browser [surface:N] <command> [args] [flags]`

If `surface:N` is omitted, the command targets the focused browser surface.

**Critical flag:** `--snapshot-after` — available on all mutating commands (click, fill, scroll, etc.). Takes an interactive snapshot immediately after the action completes, saving a separate snapshot call.
</overview>

<table_of_contents>

1. Navigation
2. Waiting
3. Snapshots
4. DOM Interaction (click, fill, type, press, check, select, scroll)
5. Inspection (get text, html, attributes, styles, counts)
6. JavaScript Injection
7. State & Session
8. Tabs
9. Console & Errors
10. Dialogs
11. Focus Management
12. Meta
13. Unsupported Operations

</table_of_contents>

<navigation>

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `open <url>` | Open URL in new browser surface tab | (opens in current workspace) |
| `open-split <url>` | Open URL in split pane | Creates new pane + browser surface |
| `go <url>` | Navigate existing surface to URL | (replaces current page) |
| `back` | Go back | |
| `forward` | Go forward | |
| `reload` | Reload page | `--hard` (bypass cache) |
| `get url` | Get current URL | |
| `get title` | Get page title | |

```bash
# Open browser in split pane
cmux browser open-split https://example.com

# Navigate existing surface
cmux browser surface:2 go https://other.com

# Get current URL
cmux browser surface:2 get url
```

</navigation>

<waiting>

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `wait` | Wait for condition | `--load-state`, `--text`, `--selector`, `--timeout-ms` |

**Wait conditions (pick one):**
- `--load-state complete` — page fully loaded (DOMContentLoaded + resources)
- `--load-state domcontentloaded` — DOM parsed, subresources may still load
- `--text "..."` — wait for text to appear on page
- `--selector "..."` — wait for CSS selector to match an element

**Always include `--timeout-ms`** to prevent indefinite hangs:
```bash
cmux browser surface:2 wait --load-state complete --timeout-ms 15000
cmux browser surface:2 wait --text "Welcome" --timeout-ms 10000
cmux browser surface:2 wait --selector "#dashboard" --timeout-ms 10000
```

</waiting>

<snapshots>

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `snapshot` | Capture page structure | `--interactive`, `--compact`, `--mode full` |

**Snapshot modes:**
- `snapshot` — basic page text content
- `snapshot --interactive` — assigns refs (e1, e2...) to interactive elements
- `snapshot --interactive --compact` — interactive refs with reduced output size (RECOMMENDED)
- `snapshot --mode full` — full HTML structure

**Interactive snapshots** are the primary way agents understand page content. Refs (e1, e2, e3...) are assigned to clickable/fillable elements and can be used in subsequent commands.

```bash
# Standard workflow: snapshot, read, act
cmux browser surface:2 snapshot --interactive --compact
# Output shows elements with refs like [e1] "Submit" button, [e2] "Email" input
```

See references/snapshot-refs.md for ref lifecycle and best practices.

</snapshots>

<dom_interaction>

**All mutating commands support `--snapshot-after` to auto-snapshot after the action.**

| Command | Purpose | Target | Key Flags |
|---------|---------|--------|-----------|
| `click` | Click element | ref or CSS selector | `--snapshot-after` |
| `fill` | Fill input field (clears first) | ref or CSS selector | `--value "..."`, `--snapshot-after` |
| `type` | Type text (appends) | ref or CSS selector | `--text "..."`, `--snapshot-after` |
| `press` | Press key | (global) | `--key "Enter"`, `--snapshot-after` |
| `keydown` | Key down event | (global) | `--key "Shift"` |
| `keyup` | Key up event | (global) | `--key "Shift"` |
| `check` | Check checkbox | ref or CSS selector | `--snapshot-after` |
| `uncheck` | Uncheck checkbox | ref or CSS selector | `--snapshot-after` |
| `select` | Select dropdown option | ref or CSS selector | `--value "..."`, `--snapshot-after` |
| `hover` | Hover over element | ref or CSS selector | `--snapshot-after` |
| `focus` | Focus element | ref or CSS selector | |
| `scroll` | Scroll page | (global) | `--direction up\|down\|left\|right`, `--amount N` |
| `scroll-into-view` | Scroll element into viewport | ref or CSS selector | |

**Targeting elements:** Use refs from interactive snapshot OR CSS selectors:
```bash
# Using ref from snapshot
cmux browser surface:2 click e3 --snapshot-after

# Using CSS selector
cmux browser surface:2 click "button.submit" --snapshot-after

# Fill a form field
cmux browser surface:2 fill e5 --value "user@example.com" --snapshot-after

# Press Enter to submit
cmux browser surface:2 press --key "Enter" --snapshot-after
```

</dom_interaction>

<inspection>

| Command | Purpose | Target | Key Flags |
|---------|---------|--------|-----------|
| `get text` | Get text content | ref or CSS selector | |
| `get html` | Get HTML content | ref or CSS selector | `--outer` (include element tag) |
| `get attribute` | Get attribute value | ref or CSS selector | `--name "href"` |
| `get value` | Get input value | ref or CSS selector | |
| `get box` | Get bounding box | ref or CSS selector | |
| `get styles` | Get computed styles | ref or CSS selector | `--property "color"` |
| `get count` | Count matching elements | CSS selector | |
| `is checked` | Check if checkbox is checked | ref or CSS selector | Returns boolean |
| `is visible` | Check if element is visible | ref or CSS selector | Returns boolean |

```bash
# Get element text
cmux browser surface:2 get text "#error-message"

# Check how many items in a list
cmux browser surface:2 get count ".list-item"

# Get input current value
cmux browser surface:2 get value e5
```

</inspection>

<javascript>

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `eval` | Execute JavaScript in page | `--expression "..."` |
| `addinitscript` | Inject JS that runs on every page load | `--script "..."` |
| `addscript` | Inject JS into current page | `--url "..."` or `--content "..."` |
| `addstyle` | Inject CSS into current page | `--content "..."` |

```bash
# Run JavaScript
cmux browser surface:2 eval --expression "document.title"

# Inject CSS
cmux browser surface:2 addstyle --content "body { border: 2px solid red; }"
```

</javascript>

<state_and_session>

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `state save` | Save cookies/storage to file | `<filepath>` |
| `state load` | Load cookies/storage from file | `<filepath>` |
| `cookies get` | Get cookies | `--name "..."`, `--domain "..."` |
| `cookies set` | Set a cookie | `--name`, `--value`, `--domain`, etc. |
| `cookies clear` | Clear cookies | `--domain "..."` (optional) |
| `storage local get` | Get localStorage item | `--key "..."` |
| `storage local set` | Set localStorage item | `--key "..."`, `--value "..."` |
| `storage local clear` | Clear localStorage | |
| `storage session get` | Get sessionStorage item | `--key "..."` |
| `storage session set` | Set sessionStorage item | `--key "..."`, `--value "..."` |
| `storage session clear` | Clear sessionStorage | |

**Auth reuse pattern:**
```bash
# Login in one surface, save state
cmux browser surface:2 state save /tmp/auth-state.json

# Load in another surface
cmux browser surface:5 state load /tmp/auth-state.json
```

Each browser surface has independent cookies/storage. Use state save/load to share auth.

</state_and_session>

<tabs>

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `tabs list` | List browser tabs in surface | |
| `tabs switch` | Switch to a tab | `--index N` |
| `tabs close` | Close a tab | `--index N` |

Browser tabs are WITHIN a single surface. These are separate from cmux workspace tabs.

</tabs>

<console_and_errors>

| Command | Purpose |
|---------|---------|
| `console` | Get console messages (log, warn, error) |
| `errors` | Get JavaScript errors |

Useful for debugging page issues or verifying no errors occurred.

</console_and_errors>

<dialogs>

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `dialog accept` | Accept alert/confirm/prompt | `--text "..."` (for prompts) |
| `dialog dismiss` | Dismiss dialog | |

Handle JavaScript `alert()`, `confirm()`, `prompt()` dialogs.

</dialogs>

<focus_management>

| Command | Purpose |
|---------|---------|
| `focus-webview` | Focus the browser webview |
| `is-webview-focused` | Check if webview has focus |

</focus_management>

<meta>

| Command | Purpose |
|---------|---------|
| `identify` | Discover focused surface IDs and browser metadata |

Useful when you don't know which surface is the browser.

</meta>

<unsupported_operations>

The following operations return `not_supported` — do NOT attempt them:
- Viewport/device emulation
- Geolocation setting
- Offline mode emulation
- Trace/screencast recording
- Network route interception/mocking
- Raw input injection (input_mouse, input_keyboard, input_touch)

</unsupported_operations>
