# HelixLab

> Open-source developer tools and skills for AI coding agents

HelixLab is an open-source marketplace of developer tool plugins for AI coding agents. Each plugin is self-contained with its own skills, scripts, and workflow guides — install only what you need.

More plugins are actively in development. Watch the repo or check back for new additions.

---

## Plugins

### Visual Lab (v2.0.0)

AI-powered visual analysis tools — extract video frames, record browser sessions, and analyze animations, loading performance, visual artifacts, and UX workflows.

**Skills:**

| Skill | Description |
|-------|-------------|
| Vision Replay | Extract frames from video files using ffmpeg and analyze them with AI vision. Supports animation timing, page load performance, and workflow progression. |
| Record Browser | Launch a headed Chrome browser with recording controls and annotation tools. Capture WebM recordings for AI analysis. |
| Setup | Check prerequisites and install dependencies (ffmpeg, ffprobe, bc). |
| Help | Show plugin info, available skills, and version. |

### Control Cmux (v1.0.0)

Unified skill for controlling cmux terminal and embedded browser — opens browser surfaces, manages workspaces/panes/surfaces, spawns Claude sessions, automates web pages, and orchestrates agent teams.

**Skills:**

| Skill | Description |
|-------|-------------|
| Control Cmux | Full cmux terminal and browser control — layout management, session spawning, web automation, and team orchestration. |

---

## Prerequisites

### Visual Lab

> [!IMPORTANT]
> ffmpeg must be installed before using Visual Lab tools. Without it, video analysis scripts will fail immediately.
>
> The setup skill can detect your OS and handle installation automatically:
> ```
> /helixlab:setup
> ```
> Or run manually: `bash plugins/visual-lab/scripts/setup.sh`

| Platform | Install Command |
|----------|----------------|
| macOS | Run `bash plugins/visual-lab/scripts/setup.sh` (downloads static build with all filters) |
| Debian / Ubuntu | `sudo apt install ffmpeg bc` |
| RHEL / Fedora | `sudo dnf install ffmpeg bc` |
| Arch Linux | `sudo pacman -S ffmpeg bc` |
| Windows | Requires WSL2: `sudo apt install ffmpeg bc` |

> [!NOTE]
> Visual Lab requires ffmpeg with drawtext filter support for timestamp overlays.
> The standard `brew install ffmpeg` on macOS does **not** include this.
> The setup script downloads a [static build](https://ffmpeg.martin-riedl.de)
> with all required filters included.

Verify installation:
```bash
bash plugins/visual-lab/tests/test-scripts.sh --check-ffmpeg
```

### Control Cmux

Requires [cmux](https://cmux.dev) v0.62.0+ with the cmux CLI available in PATH.

---

## Installation

### Claude Code (Plugin)

Add the marketplace and install individual plugins:
```
/plugin marketplace add https://github.com/mrrobertkent/helixlab-marketplace
/plugin install visual-lab
/plugin install control-cmux
```

Then invoke skills directly:
```
/helixlab:vision-replay <video-path> <analysis-prompt>
/helixlab:record-browser [url]
/helixlab:setup
/helixlab:help
/helixlab:control-cmux <instruction>
```

> Any ffmpeg-supported format works: mp4, webm, mov, mkv, avi, flv, etc.

> [!TIP]
> Use `--scope project` when installing to share the plugin configuration with teammates via Git:
> ```
> /plugin install visual-lab --scope project
> ```

<details>
<summary><strong>Other AI Agents</strong></summary>

> [!NOTE]
> All of the agents below use file-based configuration (AGENTS.md, GEMINI.md, `.cursor/rules/`). Placing these files in your project root makes them project-scoped automatically.

#### Cursor

HelixLab ships `.cursor/rules/` for automatic context injection. Clone the repo and Cursor will detect the rules when video files are in context.

Alternatively, copy `AGENTS.md` to your project root — Cursor reads `AGENTS.md` natively.

#### OpenAI Codex

Codex reads `AGENTS.md` automatically. Clone or copy `AGENTS.md` to your project root.

#### Google Gemini (Code Assist / CLI / Jules)

Gemini reads `GEMINI.md` automatically. Clone or copy `GEMINI.md` to your project root.

> [!TIP]
> Gemini supports hierarchical config — a global `~/.gemini/GEMINI.md` plus a project-level `GEMINI.md`. You can also configure Gemini CLI to read `AGENTS.md`:
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

All scripts work standalone — no plugin system required:

```bash
git clone https://github.com/mrrobertkent/helixlab-marketplace.git
bash helixlab-marketplace/plugins/visual-lab/skills/vision-replay/scripts/video-info.sh /path/to/video.mp4
```

</details>

---

## Quick Setup (Visual Lab)

> [!TIP]
> The setup script detects your OS and AI agent, checks dependencies, and provides tailored next steps.

```bash
bash plugins/visual-lab/scripts/setup.sh
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
bash plugins/visual-lab/skills/vision-replay/scripts/video-info.sh recording.webm

# Normalize (downscale + timestamp overlay)
bash plugins/visual-lab/skills/vision-replay/scripts/normalize-video.sh recording.webm /tmp/normalized.mp4

# Remove static/unchanged frames (threshold: 1=animation, 3=page-load, 15=workflow)
bash plugins/visual-lab/skills/vision-replay/scripts/dedupe-video.sh /tmp/normalized.mp4 /tmp/deduped.mp4 5

# Generate contact sheet overview
bash plugins/visual-lab/skills/vision-replay/scripts/contact-sheet.sh /tmp/deduped.mp4 /tmp/sheet.png

# Extract frames at 10fps
bash plugins/visual-lab/skills/vision-replay/scripts/extract-frames.sh /tmp/deduped.mp4 /tmp/frames 10

# Clean up
bash plugins/visual-lab/skills/vision-replay/scripts/cleanup.sh /tmp/frames
```

</details>

### Record Browser

Launch a headed Chrome browser with built-in recording and annotation tools. Navigate manually while recording, draw annotations directly on the page, and save WebM recordings for AI analysis.

> [!NOTE]
> Record Browser requires **Node.js 22+**. The install script downloads a self-contained Chrome for Testing binary — no npm packages or global browser install needed.

**Features:**

| Feature | Description |
|---------|-------------|
| Glassmorphism toolbar | Record, On Action, pause/stop, restart |
| 6 drawing tools | Select, Pen, Line, Rectangle, Circle, Text (via fabric.js) |
| Lines & arrows | Plain line, arrow at end, arrow at start, double arrow |
| 5 color presets | Red, yellow, blue, green, white — optimized for AI vision |
| Stroke & fill | 4 stroke widths (1/2/3/5px), semi-transparent fill toggle for shapes |
| Text formatting | 4 sizes (S/M/L/XL), background toggle (BG), border toggle (BD) |
| Keyboard shortcuts | Space, D, Esc, Ctrl+Z, C, 1-4, Delete, Shift (constrain), Cmd/Ctrl+Click (multi-select) |
| Post-recording dialog | Video playback, expand overlay, rename, save & close |
| Welcome page | Launches when no URL provided — includes full tool reference |

**How it works with Vision Replay:**

Record Browser captures annotated recordings. Vision Replay analyzes them. The two skills chain together:

1. **Record:** `/helixlab:record-browser` -> navigate, annotate, save & close
2. **Analyze:** `/helixlab:vision-replay <saved-recording.webm>` -> the agent sees your annotations as bright colored shapes in the extracted frames and focuses analysis on those areas

<details>
<summary><strong>Quick start</strong></summary>

```bash
# Install browser dependencies (one-time — downloads Chrome for Testing)
bash plugins/visual-lab/skills/record-browser/scripts/install-browser.sh

# Launch recorder (opens welcome page — navigate via address bar)
bash plugins/visual-lab/skills/record-browser/scripts/launch-recorder.sh

# Or launch directly at a URL
bash plugins/visual-lab/skills/record-browser/scripts/launch-recorder.sh "https://example.com"

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

Record Browser launches a **headed** (visible) Chrome window — it cannot run headless since the user needs to interact with the browser to navigate and annotate.

</details>

<details>
<summary><strong>Troubleshooting</strong></summary>

| Issue | Solution |
|-------|----------|
| `Chrome binary not found` | Run `bash plugins/visual-lab/skills/record-browser/scripts/install-browser.sh` |
| `Node.js 22+ is required` | Install Node.js 22+ from [nodejs.org](https://nodejs.org) |
| Chrome window doesn't appear (WSL2) | Install WSLg (Windows 11) or an X server and set `DISPLAY=:0` |
| Blank recording | Ensure you clicked Record or On Action before interacting |
| Annotations not visible in recording | Annotations are captured automatically — ensure Draw mode was active when drawing |

</details>

> [!NOTE]
> **Known Issue:** Chrome for Testing v146 may show a "quit unexpectedly" dialog when the browser is closed. This is cosmetic and does not affect recording or video saving.

### Control Cmux

Unified skill for controlling cmux terminal and browser. See the [control-cmux plugin](plugins/control-cmux/) for full documentation.

---

## Project Structure

```
helixlab-marketplace/
  .claude-plugin/
    plugin.json              # Marketplace manifest
    marketplace.json         # Plugin catalog
  plugins/
    visual-lab/              # Visual analysis tools (v2.0.0)
      .claude-plugin/
        plugin.json          # Plugin manifest
      skills/
        vision-replay/       # Video frame extraction + AI analysis
        record-browser/      # Chrome recording with annotations
        setup/               # Dependency checker
        help/                # Plugin info card
      scripts/
        setup.sh             # OS detection + dependency install
      tests/
        test-scripts.sh      # Script validation suite
    control-cmux/            # cmux terminal + browser control (v1.0.0)
      .claude-plugin/
        plugin.json          # Plugin manifest
      skills/
        control-cmux/        # Unified cmux control skill
  AGENTS.md                  # Multi-agent instructions (Cursor, Codex, Kiro, etc.)
  GEMINI.md                  # Google Gemini instructions
  .cursor/rules/             # Cursor auto-activation rules
  LICENSE                    # MIT
  whats-next.md              # In-progress work notes
```

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines on:

- Reporting bugs and suggesting features
- Submitting pull requests
- Script conventions and skill structure requirements
- Adding new plugins
- Commit message format and versioning

## License

[MIT](LICENSE) — Robert Kent Jr.
