# Control Cmux (v1.0.0)

Unified skill for controlling cmux terminal and embedded browser — opens browser surfaces, manages workspaces/panes/surfaces, spawns Claude sessions in new tabs or splits, automates web pages, and orchestrates agent teams natively in cmux.

Part of the [HelixLab marketplace](../../README.md).

---

## Prerequisites

- [cmux](https://cmux.dev) v0.62.0+ with the `cmux` CLI available in PATH
- Active cmux session (`$CMUX_WORKSPACE_ID` must be set)

---

## What It Covers

| Domain | Capabilities |
|--------|-------------|
| Browser | Open browser surfaces, snapshot pages, interact with elements, manage tabs |
| Layout | Create/switch/close workspaces, split panes, manage surfaces |
| Sessions | Spawn new Claude sessions in splits or tabs with custom prompts |
| State | Save/load auth, cookies, and storage across browser surfaces |
| Monitoring | Set status pills, progress bars, and send notifications |
| Teams | Orchestrate multi-agent teams with file-based inbox coordination (experimental) |

---

## Quick Start

Five most common operations:

```bash
# 1. Open browser
cmux browser open https://example.com

# 2. Snapshot page (get interactive element refs)
cmux browser surface:2 snapshot --interactive --compact

# 3. Click element (with automatic re-snapshot)
cmux browser surface:2 click "button#submit" --snapshot-after

# 4. New split pane
cmux new-split right

# 5. Spawn Claude session in a split
scripts/cmux-spawn.sh --type session --split --prompt "Run tests"
```

---

## Architecture

Control Cmux uses a **router pattern** — the SKILL.md acts as an intake that routes to the appropriate workflow based on what the agent needs to do.

```
skills/control-cmux/
  SKILL.md                          # Router: intake -> route to workflow
  workflows/                        # 8 step-by-step guides
    open-browser.md                 #   Open browser surface, wait, snapshot
    automate-web-page.md            #   Click, fill, type, scroll
    manage-layout.md                #   Workspaces, panes, surfaces
    spawn-session.md                #   Launch Claude sessions
    manage-state.md                 #   Auth, cookies, storage
    monitor-and-notify.md           #   Status pills, progress, notifications
    orchestrate-team.md             #   Multi-agent team coordination
    troubleshoot.md                 #   Diagnose and fix common issues
  references/                       # 6 reference docs
    cli-commands.md                 #   Full cmux CLI reference
    browser-commands.md             #   50+ browser automation commands
    snapshot-refs.md                #   How snapshot refs work
    team-protocol.md                #   Team inbox protocol spec
    environment-and-config.md       #   Env vars, socket, config
    troubleshooting.md              #   Error catalog and solutions
  scripts/                          # 5 automation scripts
    cmux-env.sh                     #   Detect cmux context, validate socket
    cmux-spawn.sh                   #   Spawn session or browser in new surface
    cmux-team-create.sh             #   Create team surfaces + launch teammates
    cmux-team-status.sh             #   Check team health via inbox files
    cmux-team-teardown.sh           #   Graceful team shutdown
  templates/                        # 4 composable script templates
    capture-workflow.sh             #   Full browser workflow: open, audit, capture
    spawn-and-handoff.sh            #   Spawn session and hand off task
    form-automation.sh              #   Fill and submit forms
    authenticated-session.sh        #   Login then perform authenticated actions
  examples/                         # 3 end-to-end examples
    website-evaluation.md           #   Browser audit across multiple pages
    multi-session-workflow.md       #   Parallel sessions for test + dev
    team-code-review.md             #   Multi-agent code review with inbox
```

**Total: 8 workflows, 6 references, 5 scripts, 4 templates, 3 examples.**

---

## Essential Principles

1. Verify cmux environment first — check `$CMUX_WORKSPACE_ID` is set or run `cmux ping`
2. Use short refs — `surface:N`, `workspace:N`, `pane:N` — never raw UUIDs
3. Re-snapshot after every navigation or DOM change — refs go stale instantly
4. Target surfaces, not workspaces — browser commands use `cmux browser surface:N <action>`
5. Use `--snapshot-after` on mutating browser actions — eliminates separate snapshot calls
6. Scripts are black boxes — run with `--help` first, don't read source

---

## Team Orchestration (Experimental)

The team workflows enable multi-agent coordination using cmux-native surfaces and file-based inbox messaging. Agents are spawned into dedicated surfaces and coordinate through inbox files.

This capability works but is not yet battle-tested. The relevant files:

- `workflows/orchestrate-team.md` — Step-by-step team creation guide
- `references/team-protocol.md` — Inbox protocol specification
- `scripts/cmux-team-create.sh` — Create team surfaces and launch teammates
- `scripts/cmux-team-status.sh` — Check team health
- `scripts/cmux-team-teardown.sh` — Graceful shutdown
- `examples/team-code-review.md` — End-to-end team example

---

## License

[MIT](../../LICENSE) — Robert Kent Jr.
