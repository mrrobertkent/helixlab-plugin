# HelixLab

> Open-source developer tools and skills for AI coding agents

HelixLab is a growing collection of developer tools that work with any AI coding agent. Each tool is a self-contained set of bash scripts and markdown workflow guides — no dependencies beyond standard Unix tools and ffmpeg.

---

## Prerequisites

> [!IMPORTANT]
> ffmpeg must be installed before using any HelixLab tools. Without it, video analysis scripts will fail immediately.

| Platform | Install Command |
|----------|----------------|
| macOS | `brew install ffmpeg` |
| Debian / Ubuntu | `sudo apt install ffmpeg bc` |
| RHEL / Fedora | `sudo dnf install ffmpeg bc` |
| Arch Linux | `sudo pacman -S ffmpeg bc` |
| Windows | Requires WSL2: `sudo apt install ffmpeg bc` |

Verify installation:
```bash
bash tests/test-scripts.sh --check-ffmpeg
```

---

## Installation

### Claude Code (Plugin)

Add the marketplace and install:
```
/plugin marketplace add https://github.com/mrrobertkent/helixlab-plugin
/plugin install helixlab
```

Then invoke skills directly:
```
/helixlab:vision-replay <video-path> <analysis-prompt>
/helixlab:help
```

> Any ffmpeg-supported format works: mp4, webm, mov, mkv, avi, flv, etc.

> [!TIP]
> Use `--scope project` when installing to share the plugin configuration with teammates via Git:
> ```
> /plugin install helixlab --scope project
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

# Generate contact sheet overview
bash skills/vision-replay/scripts/contact-sheet.sh recording.webm /tmp/sheet.png

# Extract frames at 10fps
bash skills/vision-replay/scripts/extract-frames.sh recording.webm /tmp/frames 10

# Extract with Lighthouse-style progressive intervals
bash skills/vision-replay/scripts/extract-progressive.sh recording.webm /tmp/frames

# Clean up
bash skills/vision-replay/scripts/cleanup.sh /tmp/claude-video-frames/1234567890
```

</details>

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines on:

- Reporting bugs and suggesting features
- Submitting pull requests
- Script conventions and skill structure requirements
- Commit message format and versioning

## License

[MIT](LICENSE) — Robert Kent Jr.
