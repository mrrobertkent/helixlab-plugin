<experimental_notice>
**EXPERIMENTAL:** cmux-native team orchestration is functional but not battle-tested. The file-based inbox protocol is inherited from Claude Code's built-in team system. Use this feature with the understanding that coordination patterns may need adjustment based on real-world usage.
</experimental_notice>

<table_of_contents>

1. Architecture
2. CLI Flags
3. Inbox Protocol
4. Color Assignments
5. Coordination Patterns
6. Limitations

</table_of_contents>

<overview>
cmux-native team orchestration creates multiple Claude sessions in cmux surfaces and coordinates them using Claude Code's file-based inbox protocol. No modifications to the Claude binary are needed — it uses existing CLI flags that the built-in team system uses.
</overview>

<architecture>

```
Orchestrator (your current session)
  ├── Creates cmux surfaces (splits/tabs)
  ├── Launches `claude` in each with team flags
  ├── Monitors via inbox files
  └── Sends messages via inbox files

Member surfaces
  ├── Each runs `claude --dangerously-skip-permissions` with team flags
  ├── Receives tasks via inbox file
  ├── Reports status via inbox file
  └── Operates independently in its own surface
```

**Key principle:** All coordination is file-based. Members don't read each other's terminal output. They communicate through JSON inbox files.

</architecture>

<cli_flags>

Claude Code accepts these team-related flags:

| Flag | Purpose | Example |
|------|---------|---------|
| `--agent-id` | Unique ID for this member | `--agent-id "reviewer-1"` |
| `--agent-name` | Display name | `--agent-name "Code Reviewer"` |
| `--team-name` | Shared team identifier | `--team-name "review-team"` |
| `--agent-color` | Terminal color | `--agent-color "red"` |
| `--parent-session-id` | Links to orchestrator | `--parent-session-id "$SESSION_ID"` |

**Full launch command:**
```bash
claude --dangerously-skip-permissions \
  --agent-id "reviewer-1" \
  --agent-name "Code Reviewer" \
  --team-name "review-team" \
  --agent-color "blue" \
  --parent-session-id "$SESSION_ID"
```

</cli_flags>

<inbox_protocol>

**Inbox directory:** `~/.claude/teams/{team-name}/inboxes/`
**Member inbox:** `~/.claude/teams/{team-name}/inboxes/{agent-name}.json`

**Message format:**
```json
{
  "type": "task_assignment",
  "from": "orchestrator",
  "content": "Review all files in src/auth/ for security issues",
  "timestamp": "2026-03-09T10:30:00Z"
}
```

**Message types:**
| Type | Sender | Purpose |
|------|--------|---------|
| `task_assignment` | orchestrator → member | Assign work |
| `status_update` | member → orchestrator | Progress report |
| `completion` | member → orchestrator | Task finished with results |
| `shutdown_request` | orchestrator → member | Ask member to stop |
| `shutdown_ack` | member → orchestrator | Acknowledge shutdown |

</inbox_protocol>

<color_assignments>

Default color cycle for team members:

| Index | Color |
|-------|-------|
| 1 | red |
| 2 | blue |
| 3 | green |
| 4 | yellow |
| 5 | purple |
| 6 | orange |
| 7 | pink |
| 8 | cyan |

Colors cycle if more than 8 members.

</color_assignments>

<coordination_patterns>

**Fan-out pattern** (orchestrator assigns, members work, orchestrator collects):
1. Orchestrator creates team surfaces
2. Assigns tasks to each member via inbox
3. Members work independently
4. Members write completion messages to orchestrator's inbox
5. Orchestrator reads completions, aggregates results

**Pipeline pattern** (sequential handoff):
1. Member A completes work, writes to Member B's inbox
2. Member B picks up, completes, writes to Member C's inbox
3. Final member writes completion to orchestrator

</coordination_patterns>

<limitations>

- No real-time streaming between members — inbox is polled, not pushed
- Members cannot see each other's terminal output
- Large messages in inbox files may hit filesystem limits
- Team config is stored per-machine, not shared across machines
- Orchestrator must handle member crashes manually (check if surface is still running)

</limitations>
