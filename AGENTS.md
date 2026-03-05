# HelixLab — Developer Tools for AI Coding Agents

HelixLab provides shell-script-based developer tools that any AI coding agent can use. Each tool is a self-contained bash script with markdown workflow guides.

## Getting Started

> This file is project-level configuration. Place it in your project root so your AI coding agent can read it.

Run the setup script to check dependencies and get integration guidance for your agent:

```bash
bash scripts/setup.sh --check
```

This detects your OS, verifies ffmpeg/ffprobe/bc are installed, identifies your AI coding agent, and provides tailored next steps.

## Prerequisites

Before using any HelixLab tools, ensure these are installed:

- **ffmpeg** and **ffprobe** (video processing)
  - macOS: Run `bash scripts/setup.sh` to auto-detect and install a fully-featured ffmpeg
  - Or download directly from https://ffmpeg.martin-riedl.de (static builds with all filters)
  - The standard `brew install ffmpeg` on macOS does NOT include drawtext (timestamp overlays)
  - Linux: `sudo apt install ffmpeg bc` (includes drawtext by default)
  - Windows: Requires WSL2 with `sudo apt install ffmpeg bc`
- **ffmpeg with drawtext support** (timestamp overlays)
  - Verify: `ffmpeg -filters 2>/dev/null | grep drawtext`
  - Required for normalize-video.sh and dedupe-video.sh timestamp overlays
  - Scripts degrade gracefully without it — timestamps are skipped
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

**Step 2: Normalize the video (downscale + timestamps)**

```bash
WORK_DIR="/tmp/claude-video-frames/$(date +%s)"
mkdir -p "$WORK_DIR"
bash skills/vision-replay/scripts/normalize-video.sh "<video-path>" "$WORK_DIR/normalized.mp4"
```

Caps the longest dimension at 1920px (desktop, mobile, tablet — all handled dynamically). Burns timestamp overlay into frames if ffmpeg has libfreetype support. Timestamps must be applied BEFORE dedup so timing gaps are visible in the final frames.

**Step 3: Remove static/unchanged frames (optional but recommended)**

Choose a threshold based on the analysis type:
- **1** for animation analysis (preserves subtle easing, fades, micro-interactions)
- **3** for page load analysis (preserves progressive rendering changes)
- **15** for workflow review (keeps only major state changes)

```bash
bash skills/vision-replay/scripts/dedupe-video.sh "$WORK_DIR/normalized.mp4" "$WORK_DIR/deduped.mp4" <threshold>
```

Removes frames with no visual change, producing a shorter video. Use the deduped video for all subsequent steps if reduction is significant (>10%). Reports original duration, deduped duration, and reduction percentage.

**Step 4: Generate contact sheet overview**

```bash
bash skills/vision-replay/scripts/contact-sheet.sh "$WORK_DIR/deduped.mp4" "$WORK_DIR/contact-sheet.png" 5 5
```

View the contact sheet to understand what's in the video.

**Step 5: Extract frames based on analysis type**

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
bash skills/vision-replay/scripts/extract-frames.sh "<video-path>" "$WORK_DIR/frames" --scene-detect
```

**Step 6: Batch frames if needed (>20 frames)**

```bash
bash skills/vision-replay/scripts/batch-frames.sh "$WORK_DIR/frames" 15
```

**Step 7: Analyze frames visually**

Read the extracted PNG frames and analyze them based on the workflow type. See workflow guides:
- `skills/vision-replay/workflows/animation-analysis.md`
- `skills/vision-replay/workflows/page-load-analysis.md`
- `skills/vision-replay/workflows/workflow-review.md`

**Step 8: Clean up**

```bash
bash skills/vision-replay/scripts/cleanup.sh "$WORK_DIR"
```

### Script Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `video-info.sh` | Video metadata | `<video-path>` |
| `normalize-video.sh` | Downscale + timestamp overlay | `<input-video> <output-video> [max-dimension]` |
| `dedupe-video.sh` | Remove static/unchanged frames | `<input-video> <output-video> [threshold]` |
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
- `skills/vision-replay/examples/page-load-report.md` — Example page load analysis report
- `skills/vision-replay/examples/workflow-report.md` — Example workflow review report
- `skills/vision-replay/examples/error-handling.md` — Common error scenarios and recovery actions

### Record Browser — Browser Recording with Annotations

Launch a headed Chrome browser with built-in recording controls and annotation tools. Record user workflows, draw annotations (lines, arrows, rectangles, circles, freehand, text) directly on the page using fabric.js, and save WebM recordings for AI analysis.

**Requirements:** Node.js 22+ (uses built-in WebSocket for raw CDP — no npm packages needed).

**Step 1: Launch recorder**

Do NOT check for dependencies manually. Just run the launch script — it validates Chrome internally and exits with a clear error if missing.

```bash
SCRIPTS_DIR="${CLAUDE_PLUGIN_ROOT}/skills/record-browser/scripts"
bash "$SCRIPTS_DIR/launch-recorder.sh" "[url]"
```

If it fails with "Chrome for Testing not installed":
```bash
bash "$SCRIPTS_DIR/install-browser.sh"
bash "$SCRIPTS_DIR/launch-recorder.sh" "[url]"
```

**Step 2: Record and annotate**

The browser opens with a glassmorphism toolbar. Use the toolbar or keyboard shortcuts:

| Action | Toolbar | Shortcut |
|--------|---------|----------|
| Start recording | Click Record | |
| Record on action | Click On Action | |
| Pause / Resume | Click pause button | Space |
| Stop | Click stop button | |
| Restart | Click restart button | |
| Toggle draw mode | Click Draw | D |
| Exit draw mode | | Escape |
| Undo annotation | Click undo | Ctrl/Cmd+Z |
| Clear annotations (draw mode) | Click clear | C |
| Switch color | Click color dot | 1-4 |
| Delete selected | Click trash | Delete/Backspace |

**Annotation tools (in draw mode):** Select, Pen, Line (with arrowhead options), Rectangle, Circle, Text. Additional controls: 4 stroke widths, fill toggle, 5 color presets (red, yellow, blue, green, white).

**Step 3: Save via post-recording dialog**

When you stop, a dialog appears with video playback, editable filename, and buttons: Save & Close, Start Over, Close.

**Step 4: Parse session outcome from stdout**

- `HELIX_SAVED=<path>` — user saved the recording. Continue to Step 5.
- `HELIX_NO_SAVE` — user closed without saving. Acknowledge and stop.
- `HELIX_SESSION_END` alone — browser was closed directly. Acknowledge and stop.

**Step 5: Ask user what to do next (MANDATORY — wait for response)**

Print the saved file path FIRST, then call AskUserQuestion using **Template 1** from `skills/record-browser/references/question-templates.md`. Do NOT auto-answer.

- "Keep as artifact" → report path and stop.
- "Analyze with Vision Replay" → ask **Template 2** (preparation method), then **Template 3** (analysis mode), then run the vision-replay pipeline.

**Step 6: Post-analysis cleanup (MANDATORY — wait for response)**

Call AskUserQuestion using **Template 4** from the same file. Only delete if user chooses "Delete recording".
