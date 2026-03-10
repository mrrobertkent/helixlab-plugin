# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HelixLab is a Claude Code marketplace that provides multiple developer tool plugins for AI coding agents. Each plugin is a self-contained collection of bash scripts and markdown workflow guides.

**Marketplace structure:** `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` define the marketplace metadata. Plugins live in `plugins/<plugin-name>/`. Each plugin has its own `.claude-plugin/plugin.json` and skills in `plugins/<plugin-name>/skills/<skill-name>/SKILL.md`. Agent configs are in `AGENTS.md`, `GEMINI.md`, and `.cursor/rules/`.

**Plugins:**
- **visual-lab** (v2.0.0) — AI-powered visual analysis tools (vision-replay, record-browser, setup, help)
- **control-cmux** (v1.0.0) — Unified cmux terminal and browser control

## Testing

```bash
bash plugins/visual-lab/tests/test-scripts.sh              # Validate all scripts exist, are executable, and fail gracefully with no args
bash plugins/visual-lab/tests/test-scripts.sh --check-ffmpeg  # Also check ffmpeg/ffprobe/bc availability
```

There is no build step. All scripts are standalone bash.

## Architecture

```
plugins/
  visual-lab/                 # Visual analysis tools plugin (v2.0.0)
    .claude-plugin/
      plugin.json             # Plugin manifest (name: visual-lab, version: 2.0.0)
    skills/
      vision-replay/          # Main skill — video frame extraction + AI analysis
        SKILL.md              # Skill definition (YAML frontmatter + XML workflow)
        scripts/              # Deterministic bash scripts (video-info, extract-frames, contact-sheet, etc.)
        workflows/            # Analysis guides (animation, page-load, workflow-review)
        references/           # Domain knowledge (fps-strategy, ffmpeg-recipes, question-templates)
        examples/             # Example output reports
      record-browser/         # Browser recording with annotations
        SKILL.md              # Skill definition
        scripts/              # Chrome launcher, recorder, CDP client
        pages/                # Welcome and playground HTML pages
        vendor/               # Vendored fabric.js
        references/           # Question templates
        examples/             # Error handling guide
      help/SKILL.md           # Static help card (disable-model-invocation: true)
      setup/SKILL.md          # Dependency checker skill
    scripts/
      setup.sh                # OS detection, dependency install, agent detection
    tests/
      test-scripts.sh         # Script validation suite
  control-cmux/               # cmux terminal + browser control plugin (v1.0.0)
    .claude-plugin/
      plugin.json             # Plugin manifest (name: control-cmux, version: 1.0.0)
    skills/
      control-cmux/           # Unified cmux control skill
        SKILL.md              # Skill definition (router pattern)
        workflows/            # Task-specific workflow guides
        references/           # CLI commands, browser commands, env/config
        examples/             # Multi-session, team, website evaluation examples
        scripts/              # cmux helper scripts
        templates/            # Reusable shell templates
.claude-plugin/
  plugin.json                 # Marketplace manifest (name: helixlab, version: 2.0.0)
  marketplace.json            # Marketplace catalog (must list all plugins with version sync)
```

**Key pattern:** Skills have YAML frontmatter (`name`, `description`, `allowed-tools`, `argument-hint`) and XML body sections (`<intake>`, `<routing>`, `<workflows_index>`, etc.). The `allowed-tools` list restricts what tools the agent can use during skill execution.

**Multi-agent support:** The same tool instructions are maintained in three parallel formats: `AGENTS.md` (Cursor, Codex, Kiro, etc.), `GEMINI.md` (Google Gemini), and `.cursor/rules/vision-replay.mdc` (Cursor auto-activation). Changes to tool behavior must be reflected across all three.

## Versioning

This project uses **Semantic Versioning** (`MAJOR.MINOR.PATCH`). Versions must be kept in sync across these files:

- `.claude-plugin/plugin.json` — the marketplace `"version"` field
- `.claude-plugin/marketplace.json` — the `"version"` field inside each plugin entry in the `plugins` array
- `plugins/<plugin-name>/.claude-plugin/plugin.json` — each plugin's own `"version"` field

Bump rules:
- **PATCH** (0.0.x): Bug fixes, doc tweaks, wording improvements, small enhancements to existing skills
- **MINOR** (0.x.0): New skills, new scripts, new analysis modes, new user-facing capabilities
- **MAJOR** (x.0.0): Breaking changes — removed skills, renamed commands, changed script arguments

**Every push to GitHub must include a version bump in the affected files.** Always increment plugin-level and marketplace-level versions together before committing. CI will fail if versions are out of sync or missing.

## Commit Conventions

- Use conventional commit prefixes: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`
- Scope to the plugin/skill name when applicable: `feat(vision-replay): ...`, `fix(control-cmux): ...`
- Never include AI attribution or co-authored-by lines in commits

## Adding a New Skill (to an existing plugin)

1. Create `plugins/<plugin-name>/skills/<skill-name>/SKILL.md` with YAML frontmatter (`name`, `description`, `allowed-tools`, `argument-hint`)
2. Add scripts to `plugins/<plugin-name>/skills/<skill-name>/scripts/` — use `set -euo pipefail`, validate inputs, exit non-zero on bad args
3. Update `AGENTS.md`, `GEMINI.md`, and `.cursor/rules/` with the new skill's instructions
4. Add the skill to the plugin's help SKILL.md table (if applicable)
5. Add tests to `plugins/<plugin-name>/tests/`

## Adding a New Plugin

1. Create `plugins/<plugin-name>/` with `.claude-plugin/plugin.json`, `skills/`, and optionally `scripts/`, `tests/`
2. Add the plugin to `.claude-plugin/marketplace.json` in the `plugins` array
3. Update `README.md` with the new plugin section
4. Update `AGENTS.md` and `GEMINI.md` if the plugin provides instructions for non-Claude agents

## Script Conventions

All bash scripts follow these patterns:
- `set -euo pipefail` at the top
- Print usage to stderr and exit 1 when called with no/bad arguments
- Accept video paths as the first positional argument (for visual-lab scripts)
- Use `/tmp/claude-video-frames/<timestamp>/` for frame output
- Scripts must work with any ffmpeg-supported video format (mp4, webm, mov, mkv, avi, flv, etc.) — never filter by extension
