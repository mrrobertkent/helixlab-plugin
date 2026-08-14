# HelixLab

> Open-source developer tools and skills for AI coding agents

HelixLab is a growing collection of developer tools that work with any AI coding agent. Each tool is a self-contained set of bash scripts and markdown workflow guides, with no dependencies beyond standard Unix tools and ffmpeg.

This repository is also a **Claude Code marketplace**. Add it once and install any plugin below.

## Plugins

| Plugin | Version | What it does | Install |
|--------|---------|--------------|---------|
| [`helixlab`](#available-skills) | 1.2.1 | Video and browser tooling for AI agents: vision replay, record browser, setup, help | `/plugin install helixlab@helixlab` |
| [`no-ai-slop`](plugins/no-ai-slop/) | 1.0.0 | Removes 20+ patterns of AI slop from writing while preserving the writer's voice | `/plugin install no-ai-slop@helixlab` |

Add the marketplace first:

```
/plugin marketplace add https://github.com/mrrobertkent/helixlab-plugin
```

> [!TIP]
> Already have the marketplace? Run `/plugin marketplace update helixlab` to pick up new plugins and version bumps.

---

## Prerequisites

> [!IMPORTANT]
> ffmpeg is required by the **`helixlab`** plugin only. Without it, the video analysis scripts fail immediately. The `no-ai-slop` plugin has no dependencies.
>
> The setup skill can detect your OS and handle installation automatically:
> ```
> /helixlab:setup
> ```
> Or run manually: `bash scripts/setup.sh`

| Platform | Install Command |
|----------|----------------|
| macOS | Run `bash scripts/setup.sh` (downloads static build with all filters) |
| Debian / Ubuntu | `sudo apt install ffmpeg bc` |
| RHEL / Fedora | `sudo dnf install ffmpeg bc` |
| Arch Linux | `sudo pacman -S ffmpeg bc` |
| Windows | Requires WSL2: `sudo apt install ffmpeg bc` |

> [!NOTE]
> HelixLab requires ffmpeg with drawtext filter support for timestamp overlays.
> The standard `brew install ffmpeg` on macOS does **not** include this.
> The setup script downloads a [static build](https://ffmpeg.martin-riedl.de)
> with all required filters included.

Verify installation:
```bash
bash tests/test-scripts.sh --check-ffmpeg
```

---

## Installation

### Claude Code (Plugins)

Add the marketplace once, then install the plugins you want:
```
/plugin marketplace add https://github.com/mrrobertkent/helixlab-plugin
/plugin install helixlab@helixlab
/plugin install no-ai-slop@helixlab
```

Then invoke skills directly:
```
/helixlab:vision-replay <video-path> <analysis-prompt>
/helixlab:record-browser
/helixlab:help
/no-ai-slop:no-ai-slop
```

> Any ffmpeg-supported format works: mp4, webm, mov, mkv, avi, flv, etc.

> [!TIP]
> Use `--scope project` when installing to share the plugin configuration with teammates via Git:
> ```
> /plugin install helixlab@helixlab --scope project
> ```

<details>
<summary><strong>Other AI Agents</strong></summary>

> [!NOTE]
> All of the agents below use file-based configuration (AGENTS.md, GEMINI.md, `.cursor/rules/`). Placing these files in your project root makes them project-scoped automatically.

#### Cursor

HelixLab ships `.cursor/rules/` for automatic context injection. Clone the repo and Cursor will detect the rules when video files are in context.

Alternatively, copy `AGENTS.md` to your project root. Cursor reads `AGENTS.md` natively.

#### OpenAI Codex

Codex reads `AGENTS.md` automatically. Clone or copy `AGENTS.md` to your project root.

#### Google Gemini (Code Assist / CLI / Jules)

Gemini reads `GEMINI.md` automatically. Clone or copy `GEMINI.md` to your project root.

> [!TIP]
> Gemini supports hierarchical config: a global `~/.gemini/GEMINI.md` plus a project-level `GEMINI.md`. You can also configure Gemini CLI to read `AGENTS.md`:
> ```json
> // ~/.gemini/settings.json
> { "context": { "fileName": ["AGENTS.md", "GEMINI.md"] } }
> ```

#### Amazon Kiro

Kiro reads `AGENTS.md` from the project root. Clone or copy `AGENTS.md` to your project.

#### OpenCode / Amp / Goose / Devin / Warp / Zed / RooCode

All of these agents support the `AGENTS.md` standard. Clone or copy `AGENTS.md` to your project root.

</details>

<details>
<summary><strong>Manual (Any Agent)</strong></summary>

All scripts work standalone. No plugin system required:

```bash
git clone https://github.com/mrrobertkent/helixlab-plugin.git
bash helixlab-plugin/skills/vision-replay/scripts/video-info.sh /path/to/video.mp4
```

</details>

---

## Quick Setup

> [!TIP]
> The setup script detects your OS and AI agent, checks dependencies, and provides tailored next steps.

```bash
bash scripts/setup.sh
```

| Flag | Behavior |
|------|----------|
| `--check` | Report dependency status only (no install prompts) |
| `--yes` | Skip prompts and auto-install missing dependencies |

Or use the skill in Claude Code:
```
/helixlab:setup
/helixlab:setup --check
```

---

## Available Skills

Skills below ship in the **`helixlab`** plugin. The `no-ai-slop` plugin is documented separately in [`plugins/no-ai-slop/README.md`](plugins/no-ai-slop/README.md).

### Vision Replay

Extract frames from video files using ffmpeg and analyze them with AI vision capabilities.

**Three analysis modes:**

| Mode | Use Case | Extraction |
|------|----------|------------|
| Animation Analysis | Timing, easing, smoothness, dropped frames | 10-60 fps |
| Page Load Analysis | Progressive rendering, FCP, LCP, layout shifts | Lighthouse-style intervals |
| Workflow Review | User journeys, state transitions, UX | 2-3 fps or scene detection |

<details>
<summary><strong>Script quick start</strong></summary>

```bash
# Get video info
bash skills/vision-replay/scripts/video-info.sh recording.webm

# Normalize (downscale + timestamp overlay)
bash skills/vision-replay/scripts/normalize-video.sh recording.webm /tmp/normalized.mp4

# Remove static/unchanged frames (threshold: 1=animation, 3=page-load, 15=workflow)
bash skills/vision-replay/scripts/dedupe-video.sh /tmp/normalized.mp4 /tmp/deduped.mp4 5

# Generate contact sheet overview
bash skills/vision-replay/scripts/contact-sheet.sh /tmp/deduped.mp4 /tmp/sheet.png

# Extract frames at 10fps
bash skills/vision-replay/scripts/extract-frames.sh /tmp/deduped.mp4 /tmp/frames 10

# Clean up
bash skills/vision-replay/scripts/cleanup.sh /tmp/frames
```

</details>

### Record Browser

Launch a headed Chrome browser with built-in recording and annotation tools. Navigate manually while recording, draw annotations directly on the page, and save WebM recordings for AI analysis.

> [!NOTE]
> Record Browser requires **Node.js 22+**. The install script downloads a self-contained Chrome for Testing binary, so no npm packages or global browser install are needed.

**Features:**

| Feature | Description |
|---------|-------------|
| Glassmorphism toolbar | Record, On Action, pause/stop, restart |
| 6 drawing tools | Select, Pen, Line, Rectangle, Circle, Text (via fabric.js) |
| Lines & arrows | Plain line, arrow at end, arrow at start, double arrow |
| 5 color presets | Red, yellow, blue, green, white, optimized for AI vision |
| Stroke & fill | 4 stroke widths (1/2/3/5px), semi-transparent fill toggle for shapes |
| Text formatting | 4 sizes (S/M/L/XL), background toggle (BG), border toggle (BD) |
| Keyboard shortcuts | Space, D, Esc, Ctrl+Z, C, 1-4, Delete, Shift (constrain), ⌘/Ctrl+Click (multi-select) |
| Post-recording dialog | Video playback, expand overlay, rename, save & close |
| Welcome page | Launches when no URL is provided. Includes full tool reference |

**How it works with Vision Replay:**

Record Browser captures annotated recordings. Vision Replay analyzes them. The two skills chain together:

1. **Record:** `/helixlab:record-browser` → navigate, annotate, save & close
2. **Analyze:** `/helixlab:vision-replay <saved-recording.webm>` → the agent sees your annotations as bright colored shapes in the extracted frames and focuses analysis on those areas

<details>
<summary><strong>Quick start</strong></summary>

```bash
# Install browser dependencies (one-time, downloads Chrome for Testing)
bash skills/record-browser/scripts/install-browser.sh

# Launch recorder (opens welcome page, navigate via address bar)
bash skills/record-browser/scripts/launch-recorder.sh

# Or launch directly at a URL
bash skills/record-browser/scripts/launch-recorder.sh "https://example.com"

# Use the in-browser toolbar to record, draw annotations, and save
# HELIX_SAVED=<path> is printed to stdout when the user saves a recording
```

</details>

<details>
<summary><strong>Platform support</strong></summary>

| Platform | Status | Notes |
|----------|--------|-------|
| macOS | Supported | Works out of the box |
| Linux (X11/Wayland) | Supported | Requires a display server |
| Windows (WSL2 + WSLg) | Supported | Windows 11 with WSLg provides GUI support automatically |
| Windows (WSL2, older) | Requires setup | Install an X server (VcXsrv, X410) and set `DISPLAY` |

Record Browser launches a **headed** (visible) Chrome window. It cannot run headless because the user needs to interact with the browser to navigate and annotate.

</details>

<details>
<summary><strong>Troubleshooting</strong></summary>

| Issue | Solution |
|-------|----------|
| `Chrome binary not found` | Run `bash skills/record-browser/scripts/install-browser.sh` |
| `Node.js 22+ is required` | Install Node.js 22+ from [nodejs.org](https://nodejs.org) |
| Chrome window doesn't appear (WSL2) | Install WSLg (Windows 11) or an X server and set `DISPLAY=:0` |
| Blank recording | Ensure you clicked Record or On Action before interacting |
| Annotations not visible in recording | Annotations are captured automatically. Ensure Draw mode was active when drawing |

</details>

> [!NOTE]
> **Known Issue:** Chrome for Testing v146 may show a "quit unexpectedly" dialog when the browser is closed. This is cosmetic and does not affect recording or video saving.

---

## No AI Slop

A separate plugin in this marketplace. It edits drafts into sharper, more human writing by cutting 20+ AI-slop patterns, and it keeps the writer's voice intact.

```
/plugin install no-ai-slop@helixlab
/no-ai-slop:no-ai-slop
```

| Mode | Trigger | Output |
|------|---------|--------|
| Edit (default) | "Clean this up", "make this less AI-sounding", or a pasted draft | Edited draft plus a **What changed** section |
| Detect | "Is this AI slop?", "audit this", "flag the patterns" | Each pattern named with a quoted line and a short fix. No rewrite. |

It removes binary contrasts ("It's not X. It's Y."), throat-clearing openers, faux-insight setups, colon reveals, importance puffery, weasel attribution, fake-profound kickers, summary-recap endings, formatting slop, em dash overuse, and a banned word list including delve, leverage, robust, and transformative.

> [!NOTE]
> The `no-ai-slop` skill is by [Peter Yang](https://github.com/petergyang/no-ai-slop), MIT licensed and included unmodified. HelixLab repackages it as an installable, version-tracked Claude Code plugin. See [`plugins/no-ai-slop/README.md`](plugins/no-ai-slop/README.md) for the full pattern list and attribution.

---

## Repository Layout

```
.claude-plugin/
  marketplace.json      # Marketplace manifest, lists every plugin
  plugin.json           # Manifest for the root `helixlab` plugin
skills/                 # `helixlab` plugin skills
scripts/                # `helixlab` setup script
tests/                  # `helixlab` script tests
plugins/
  no-ai-slop/           # `no-ai-slop` plugin (self-contained)
    .claude-plugin/plugin.json
    skills/no-ai-slop/
    README.md
    LICENSE
```

> [!IMPORTANT]
> A plugin's version lives in its own `.claude-plugin/plugin.json` and nowhere else. Claude Code always prefers that value over a `version` in the marketplace entry, so a copy left in `marketplace.json` is dead text that can silently contradict the real one. Releases are tagged `{plugin-name}--v{version}` with `claude plugin tag --push`. See [CONTRIBUTING.md](CONTRIBUTING.md#versioning).

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines on:

- Reporting bugs and suggesting features
- Submitting pull requests
- Script conventions and skill structure requirements
- Commit message format and versioning

## License

[MIT](LICENSE). Copyright (c) 2026 Robert Kent Jr.
