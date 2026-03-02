---
name: vision-replay
description: >
  Extract frames from video files using ffmpeg and analyze them with Claude's
  multimodal vision. Supports animation timing analysis, page load performance
  review, and user workflow progression. Use when working with video files,
  screen recordings, animation validation, or visual analysis of UI behavior.
argument-hint: <path-to-video> [analysis instructions]
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
---

<essential_principles>
**Video analysis pipeline:** video file -> ffmpeg frame extraction -> Claude vision analysis -> structured report.

All frame extraction is handled by deterministic shell scripts in `scripts/`. Workflows guide your analytical reasoning -- what to look for and how to structure findings. Scripts handle the mechanics.

**Universal first-pass:** Every analysis starts with:
1. Validate prerequisites (ffmpeg installed, file exists, valid video)
2. Run `scripts/video-info.sh` to get metadata
3. Run `scripts/contact-sheet.sh` to generate a low-fps overview grid
4. Review the contact sheet to confirm/adjust extraction strategy
5. Then route to the appropriate workflow for targeted extraction and analysis

**Frame storage:** All frames go to `/tmp/claude-video-frames/<timestamp>/`. Always clean up after analysis using `scripts/cleanup.sh`.

**Context window management:** Read at most 15-20 frames per batch. Use `scripts/batch-frames.sh` to organize large frame sets. Use `scripts/contact-sheet.sh` for quick overviews before detailed extraction.

**Script execution:** All scripts are in the skill's `scripts/` directory. Run them via Bash with the path relative to this skill's directory: `scripts/<script-name>.sh`
</essential_principles>

<prerequisites>
Before starting any analysis, verify:

1. ffmpeg is installed: `which ffmpeg`
2. The video file exists and is accessible
3. Create a timestamped working directory:

```bash
WORK_DIR="/tmp/claude-video-frames/$(date +%s)"
mkdir -p "$WORK_DIR"
```
</prerequisites>

<universal_pipeline>
**Run these steps for EVERY analysis before routing to a workflow:**

**Step 1: Get video metadata**

```bash
scripts/video-info.sh "<video-path>"
```

Review the output: duration, fps, resolution. This informs fps selection.

**Step 2: Generate contact sheet overview**

```bash
scripts/contact-sheet.sh "<video-path>" "$WORK_DIR/contact-sheet.png" 5 5
```

**Step 3: Read the contact sheet**

Use the Read tool to view `$WORK_DIR/contact-sheet.png`. This gives you a quick visual overview of the entire video.

**Step 4: Route to workflow**

Based on the user's request AND what you see in the contact sheet, route to the appropriate workflow.
</universal_pipeline>

<intake>
Detect the analysis type from the user's prompt, context, and the contact sheet overview.

The user's message after `/helixlab:vision-replay` is available as `$ARGUMENTS`. Parse it for the video path and analysis instructions.

**If the video path is ambiguous or missing, ask the user.**
</intake>

<routing>
| Keywords / Context | Workflow |
|----------------------------------------------------|--------------------------------------|
| animation, easing, timing, smoothness, transition, | workflows/animation-analysis.md |
| fps, frames, bounce, slide, fade, CSS, keyframes, | |
| cubic-bezier, dropped frames, jank, stutter | |
|----------------------------------------------------|--------------------------------------|
| page load, lighthouse, performance, render, paint, | workflows/page-load-analysis.md |
| FCP, LCP, layout shift, progressive rendering, | |
| time to interactive, visual completeness | |
|----------------------------------------------------|--------------------------------------|
| workflow, journey, user story, walkthrough, steps, | workflows/workflow-review.md |
| click-through, progression, flow, UX review, | |
| cursor, annotations, modal, navigation | |
|----------------------------------------------------|--------------------------------------|
| general / ambiguous (no clear type detected) | workflows/animation-analysis.md |

**After reading the workflow, follow it exactly.**
</routing>

<scripts_index>
All scripts in `scripts/`:

| Script | Purpose | Key Args |
|--------|---------|----------|
| video-info.sh | Get video metadata | `<video-path>` |
| extract-frames.sh | Extract frames at configurable fps | `<video> <out-dir> <fps> [start] [duration] [crop] [scale]` |
| extract-progressive.sh | Lighthouse-style progressive intervals | `<video> <out-dir>` |
| contact-sheet.sh | Grid overview image | `<video> <out-path> [fps] [cols]` |
| batch-frames.sh | Split frames into read-ready batches | `<frames-dir> [batch-size]` |
| diff-frames.sh | Side-by-side comparison composites | `<ref-dir> <impl-dir> <out-dir>` |
| cleanup.sh | Safe removal of frame directories | `<frames-dir>` |

All scripts use `set -euo pipefail` and validate inputs. Run via path relative to skill directory:
`scripts/<name>.sh`
</scripts_index>

<reference_index>
All domain knowledge in `references/`:

**Frame rates:** references/fps-strategy.md -- When to use 5, 10, 30, or 60 fps
**ffmpeg commands:** references/ffmpeg-recipes.md -- Crop, scale, timestamp overlay, scene detection
</reference_index>

<workflows_index>
| Workflow | Purpose | Typical FPS |
|----------|---------|-------------|
| animation-analysis.md | Frame-by-frame timing, easing, smoothness | 10-60 fps |
| page-load-analysis.md | Progressive rendering, paint events, LCP | Progressive intervals |
| workflow-review.md | User journey, state transitions, UX | 2-3 fps or scene-detect |
</workflows_index>

<examples_index>
Example output formats in `examples/`:

**Animation:** examples/animation-report.md -- Frame table, issues, recommendations
**Workflow:** examples/workflow-report.md -- Step map, observations, UX findings
</examples_index>

<success_criteria>
Analysis is complete when:
- Video metadata was examined
- Contact sheet overview was reviewed
- Frames were extracted at the appropriate rate for the analysis type
- Each relevant frame was examined with Claude's vision
- A structured report was provided to the user
- Extracted frames were cleaned up from /tmp
</success_criteria>
