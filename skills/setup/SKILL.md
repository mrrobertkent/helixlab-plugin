---
name: setup
description: Check prerequisites and set up HelixLab dependencies
allowed-tools:
  - Bash
  - Read
argument-hint: "[--check]"
disable-model-invocation: true
---

<essential_principles>
The setup skill checks that HelixLab's system dependencies are installed and guides the user through installation if anything is missing. It also detects the user's AI coding agent and provides tailored integration instructions.

**Core dependencies** (required for vision-replay): ffmpeg, ffprobe, bc
**Optional dependencies** (required for record-browser): Node.js 22+, Chrome for Testing

This skill is idempotent — safe to run at any time.
</essential_principles>

<workflow>

**Step 1: Run the setup script**

Check what flags the user passed (available as `$ARGUMENTS`):
- If `--check` was passed, run in check-only mode
- Otherwise, run the full setup

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/setup.sh $ARGUMENTS
```

**Step 2: Interpret results**

Review the script output:
- If all dependencies show ✓, report that HelixLab is ready
- If any dependencies show ✗, help the user resolve them based on the script's recommendations
- Check the "Record Browser" section — if Node.js 22+ is available but Chrome for Testing is missing, offer to run `install-browser.sh`

**Step 3: Verify with tests**

After installation (or if all deps were already present), confirm everything works:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/tests/test-scripts.sh --check-ffmpeg
```

**Step 4: Report status**

Summarize for the user:
- Which dependencies are installed (with versions)
- Which AI agent was detected and how to integrate
- Any remaining action items
- For Claude Code users: remind them to enable auto-update via `/plugin` → Marketplaces tab → select the helixlab marketplace → Enable auto-update (third-party marketplaces have auto-update disabled by default)

</workflow>
