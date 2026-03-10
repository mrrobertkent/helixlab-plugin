---
name: control-cmux
description: >-
  Controls cmux terminal — opens browser surfaces, manages workspaces/panes/surfaces,
  spawns Claude sessions in new tabs or splits, automates the cmux embedded browser,
  and orchestrates agent teams natively in cmux. TRIGGER when: user mentions cmux,
  browser testing in cmux, opening browser, spawning sessions, split panes, workspace
  management, or agent teams in terminal. DO NOT TRIGGER when: general terminal
  commands, tmux operations, or browser automation outside cmux (Playwright, Puppeteer).
---

<essential_principles>

1. **Verify cmux environment first** — check `$CMUX_WORKSPACE_ID` is set or run `cmux ping`
2. **Use short refs** — `surface:N`, `workspace:N`, `pane:N` — never raw UUIDs
3. **Re-snapshot after every navigation or DOM change** — refs go stale instantly
4. **Target surfaces, not workspaces** — browser commands use `cmux browser surface:N <action>`
5. **Workspace-relative by default** — commands target caller's workspace via `$CMUX_WORKSPACE_ID`
6. **Isolated surfaces** — each browser surface has independent cookies/storage; use `state save`/`state load` to share auth
7. **Scripts are black boxes** — run with `--help` first, don't read source
8. **Use `--snapshot-after` on mutating browser actions** — eliminates separate snapshot calls
9. **Team orchestration is experimental** — file-based inbox works but is not battle-tested in cmux

</essential_principles>

<objective>
Unified skill for controlling cmux terminal and embedded browser. Teaches agents how to
open browser surfaces, manage workspaces/panes/surfaces, spawn Claude sessions, automate
web pages, and orchestrate agent teams — all using cmux's native CLI and socket API.
Composable with domain-specific skills that define WHAT to do (testing, evaluation, etc.).
</objective>

<quick_start>

Five most common operations:

1. **Open browser:**       `cmux browser open https://example.com`
2. **Snapshot page:**      `cmux browser surface:2 snapshot --interactive --compact`
3. **Click element:**      `cmux browser surface:2 click "button#submit" --snapshot-after`
4. **New split pane:**     `cmux new-split right`
5. **Spawn session:**      `scripts/cmux-spawn.sh --type session --split --prompt "Run tests"`

</quick_start>

<intake>

What are you trying to do?

1. Open or use the browser
2. Interact with a web page (click, fill, inspect)
3. Manage layout (splits, tabs, workspaces)
4. Spawn a Claude session
5. Orchestrate agent teams (experimental)
6. Handle auth, cookies, or session state
7. Monitor progress or send notifications
8. Something's not working

Wait for response or infer from context before proceeding.

</intake>

<routing>

| Response                          | Workflow                          |
|-----------------------------------|-----------------------------------|
| 1, "browser", "open"             | workflows/open-browser.md         |
| 2, "click", "fill", "snapshot"   | workflows/automate-web-page.md    |
| 3, "split", "tab", "workspace"   | workflows/manage-layout.md        |
| 4, "spawn", "session", "launch"  | workflows/spawn-session.md        |
| 5, "team", "orchestrate"         | workflows/orchestrate-team.md     |
| 6, "auth", "cookies", "state"    | workflows/manage-state.md         |
| 7, "notify", "progress", "log"   | workflows/monitor-and-notify.md   |
| 8, "error", "not working"        | references/troubleshooting.md     |

After reading the workflow, follow it exactly.

</routing>

<script_index>

| Script                       | Purpose                                              |
|------------------------------|------------------------------------------------------|
| scripts/cmux-env.sh          | Detect cmux context, validate socket, report status  |
| scripts/cmux-spawn.sh        | Spawn session or browser in new surface/split        |
| scripts/cmux-team-create.sh  | Create team surfaces + launch teammates with flags   |
| scripts/cmux-team-status.sh  | Check team health via inbox files                    |
| scripts/cmux-team-teardown.sh| Graceful team shutdown with inbox messages            |

Run any script with `--help` for usage details.

</script_index>

<reference_index>

**CLI & Commands:** references/cli-commands.md, references/browser-commands.md
**Browser Patterns:** references/snapshot-refs.md
**Teams:** references/team-protocol.md
**Environment:** references/environment-and-config.md
**Help:** references/troubleshooting.md

</reference_index>

<workflows_index>

| Workflow | Purpose |
|----------|---------|
| workflows/open-browser.md | Open browser surface, wait for load, take initial snapshot |
| workflows/automate-web-page.md | Click, fill, type, scroll — interact with page elements |
| workflows/manage-layout.md | Create/switch/close workspaces, panes, surfaces |
| workflows/spawn-session.md | Launch a new Claude session in a split or tab |
| workflows/manage-state.md | Save/load auth, cookies, storage across surfaces |
| workflows/monitor-and-notify.md | Set status pills, progress bars, notifications |
| workflows/orchestrate-team.md | Create multi-agent team with inbox coordination (experimental) |

</workflows_index>

<examples_index>

| Example | Scenario |
|---------|----------|
| examples/website-evaluation.md | Full browser workflow: open site, audit pages, capture screenshots |
| examples/multi-session-workflow.md | Spawn parallel sessions for test + dev server coordination |
| examples/team-code-review.md | Multi-agent team reviewing code across files with inbox coordination |

</examples_index>

<success_criteria>

- Agent successfully performed the intended cmux operation
- Browser surfaces are targeted correctly (surface:N refs)
- Spawned sessions are running and responsive
- No stale ref errors (re-snapshotted after DOM changes)
- Team members (if used) are coordinating via inbox files

</success_criteria>
