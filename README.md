# HelixLab

> Open-source developer tools and skills for AI coding agents

HelixLab is an open-source marketplace of developer tool plugins for AI coding agents. Each plugin is self-contained with its own skills, scripts, and workflow guides — install only what you need.

More plugins are actively in development. Watch the repo or check back for new additions.

---

## Plugins

| Plugin | Version | Description |
|--------|---------|-------------|
| [Visual Lab](plugins/visual-lab/README.md) | v2.0.0 | AI-powered visual analysis — video frame extraction, browser recording, and annotation tools |
| [Control Cmux](plugins/control-cmux/README.md) | v1.0.0 | Unified cmux terminal and browser control — layout, sessions, web automation, and team orchestration |

See each plugin's README for prerequisites, quick start guides, and full documentation.

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

## Project Structure

```
helixlab-marketplace/
  .claude-plugin/
    plugin.json              # Marketplace manifest
    marketplace.json         # Plugin catalog
  plugins/
    visual-lab/              # Visual analysis tools (v2.0.0)
      README.md              # Full plugin documentation
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
      README.md              # Full plugin documentation
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
