# HelixLab — Developer Tools for AI Coding Agents

HelixLab provides shell-script-based developer tools that any AI coding agent can use. Each tool is a self-contained bash script with markdown workflow guides.

## Getting Started

Run the setup script to check dependencies and get integration guidance for your agent:

```bash
bash scripts/setup.sh --check
```

This detects your OS, verifies ffmpeg/ffprobe/bc are installed, identifies your AI coding agent, and provides tailored next steps.

## Prerequisites

Before using any HelixLab tools, ensure these are installed:

- **ffmpeg** and **ffprobe** (video processing)
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg bc`
  - Windows: Requires WSL2 with `sudo apt install ffmpeg bc`
- **bash** shell
- **bc** calculator

## Available Tools

### Vision Replay — Video Frame Analysis

Extracts frames from video files using ffmpeg and analyzes them with AI vision. Three analysis modes:

1. **Animation Analysis** — Frame-by-frame timing, easing curves, smoothness, dropped frames
2. **Page Load Analysis** — Progressive rendering, FCP, LCP, layout shifts, visual completeness
3. **Workflow Review** — User journey steps, state transitions, UX observations

### How to Use

**Step 1: Get video metadata**

```bash
bash skills/vision-replay/scripts/video-info.sh "<video-path>"
```

Returns: duration, fps, resolution, codec, frame count, VFR detection.

**Step 2: Generate contact sheet overview**

```bash
WORK_DIR="/tmp/claude-video-frames/$(date +%s)"
mkdir -p "$WORK_DIR"
bash skills/vision-replay/scripts/contact-sheet.sh "<video-path>" "$WORK_DIR/contact-sheet.png" 5 5
```

View the contact sheet to understand what's in the video.

**Step 3: Extract frames based on analysis type**

For animation analysis (configurable fps):
```bash
bash skills/vision-replay/scripts/extract-frames.sh "<video-path>" "$WORK_DIR/frames" 10
```

For page load analysis (progressive intervals):
```bash
bash skills/vision-replay/scripts/extract-progressive.sh "<video-path>" "$WORK_DIR/frames"
```

For workflow review (low fps or scene detection):
```bash
bash skills/vision-replay/scripts/extract-frames.sh "<video-path>" "$WORK_DIR/frames" 2
# OR with scene detection:
bash skills/vision-replay/scripts/extract-frames.sh "<video-path>" "$WORK_DIR/frames" 0 --scene-detect
```

**Step 4: Batch frames if needed (>20 frames)**

```bash
bash skills/vision-replay/scripts/batch-frames.sh "$WORK_DIR/frames" 15
```

**Step 5: Analyze frames visually**

Read the extracted PNG frames and analyze them based on the workflow type. See workflow guides:
- `skills/vision-replay/workflows/animation-analysis.md`
- `skills/vision-replay/workflows/page-load-analysis.md`
- `skills/vision-replay/workflows/workflow-review.md`

**Step 6: Clean up**

```bash
bash skills/vision-replay/scripts/cleanup.sh "$WORK_DIR"
```

### Script Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `video-info.sh` | Video metadata | `<video-path>` |
| `extract-frames.sh` | Extract at configurable fps | `<video> <out-dir> <fps> [start] [duration] [crop] [scale]` |
| `extract-progressive.sh` | Lighthouse-style intervals | `<video> <out-dir>` |
| `contact-sheet.sh` | Grid overview image | `<video> <out-path> [fps] [cols]` |
| `batch-frames.sh` | Split into batches | `<frames-dir> [batch-size]` |
| `diff-frames.sh` | Side-by-side comparison | `<ref-dir> <impl-dir> <out-dir>` |
| `cleanup.sh` | Safe frame removal | `<frames-dir>` |

### Domain References

- `skills/vision-replay/references/fps-strategy.md` — When to use 5, 10, 30, or 60 fps
- `skills/vision-replay/references/ffmpeg-recipes.md` — Common ffmpeg filter chains
- `skills/vision-replay/examples/animation-report.md` — Example animation analysis report
- `skills/vision-replay/examples/workflow-report.md` — Example workflow review report
