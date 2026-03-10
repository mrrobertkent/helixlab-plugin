---
name: help
description: Show Visual Lab plugin info, available skills, prerequisites, and version
disable-model-invocation: true
---

# Visual Lab — AI-Powered Visual Analysis Tools

**Plugin:** visual-lab (part of the HelixLab marketplace)
**Version:** 2.0.0
**License:** MIT
**Author:** Robert Kent Jr.
**Homepage:** https://github.com/mrrobertkent/helixlab-marketplace

## Available Skills

| Skill | Invoke | Description |
|-------|--------|-------------|
| Vision Replay | `/helixlab:vision-replay <video-path> [instructions]` | Extract frames from video files using ffmpeg and analyze them with AI vision. Supports animation timing analysis, page load performance review, and user workflow progression. |
| Record Browser | `/helixlab:record-browser [url]` | Launch a headed Chrome browser with recording controls and annotation tools. Draw annotations (lines, arrows, rectangles, circles, text) on the page — captured in the WebM recording for AI analysis with vision-replay. |
| Setup | `/helixlab:setup [--check]` | Check prerequisites and install dependencies (ffmpeg, ffprobe, bc). Detects your OS and AI coding agent for tailored setup guidance. |

## Prerequisites

- **ffmpeg** and **ffprobe** must be installed
  - macOS: Run `bash scripts/setup.sh` (downloads static build with drawtext support)
  - Linux (Debian/Ubuntu): `sudo apt install ffmpeg bc`
  - Linux (RHEL/Fedora): `sudo dnf install ffmpeg bc`
  - Windows: Requires WSL2 with `sudo apt install ffmpeg bc`
- **bash** shell (available on macOS, Linux, Windows WSL)
- **bc** calculator (installed by default on macOS, may need install on minimal Linux)

Run `/helixlab:setup --check` to verify all prerequisites are met.

## Quick Start

```
/helixlab:vision-replay /path/to/recording.webm analyze the page load animation
```

The skill will:
1. Validate prerequisites (ffmpeg installed, file exists)
2. Extract video metadata
3. Generate a contact sheet overview
4. Route to the appropriate analysis workflow
5. Analyze frames with AI vision
6. Produce a structured report
7. Clean up temporary files
