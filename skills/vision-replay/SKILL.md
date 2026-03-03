---
name: vision-replay
description: >
  Extract frames from video files using ffmpeg and analyze them with Claude's
  multimodal vision. Supports animation timing analysis, page load performance
  review, and user workflow progression. Use when working with video files,
  screen recordings, animation validation, or visual analysis of UI behavior.
argument-hint: "path/to/video.mp4 [analysis instructions]"
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - AskUserQuestion
---

<essential_principles>
**Video analysis pipeline:** video file -> ffmpeg frame extraction -> Claude vision analysis -> structured report.

All frame extraction is handled by deterministic shell scripts. Workflows guide your analytical reasoning -- what to look for and how to structure findings. Scripts handle the mechanics.

**Script location:** All scripts live at `${CLAUDE_PLUGIN_ROOT}/skills/vision-replay/scripts/`. Define this once at the start of every analysis:

```bash
SCRIPTS_DIR="${CLAUDE_PLUGIN_ROOT}/skills/vision-replay/scripts"
```

Then run scripts as: `bash "$SCRIPTS_DIR/<script-name>.sh" <args>`

**Universal first-pass:** Every analysis starts with:
1. Validate prerequisites (ffmpeg installed, file exists, valid video)
2. Run `$SCRIPTS_DIR/video-info.sh` to get metadata
3. Run `$SCRIPTS_DIR/contact-sheet.sh` to generate a low-fps overview grid
4. Review the contact sheet to confirm/adjust extraction strategy
5. Then route to the appropriate workflow for targeted extraction and analysis

**Frame storage:** All frames go to `/tmp/claude-video-frames/<timestamp>/`. Always clean up after analysis using `$SCRIPTS_DIR/cleanup.sh`.

**Context window management:** Read at most 15-20 frames per batch. Use `$SCRIPTS_DIR/batch-frames.sh` to organize large frame sets. Use `$SCRIPTS_DIR/contact-sheet.sh` for quick overviews before detailed extraction.
</essential_principles>

<prerequisites>
Before starting any analysis, verify:

1. ffmpeg is installed: `which ffmpeg`
2. The video file exists and is accessible
3. Set up working directories:

```bash
SCRIPTS_DIR="${CLAUDE_PLUGIN_ROOT}/skills/vision-replay/scripts"
WORK_DIR="/tmp/claude-video-frames/$(date +%s)"
mkdir -p "$WORK_DIR"
```
</prerequisites>

<universal_pipeline>
**Run these steps for EVERY analysis before routing to a workflow:**

**Step 1: Get video metadata**

```bash
bash "$SCRIPTS_DIR/video-info.sh" "<video-path>"
```

Review the output: duration, fps, resolution. This informs fps selection.

**Step 2: Generate contact sheet overview**

```bash
bash "$SCRIPTS_DIR/contact-sheet.sh" "<video-path>" "$WORK_DIR/contact-sheet.png" 5 5
```

**Step 3: Read the contact sheet**

Use the Read tool to view `$WORK_DIR/contact-sheet.png`. This gives you a quick visual overview of the entire video.

**Step 4: Route to workflow**

Based on the user's request AND what you see in the contact sheet, route to the appropriate workflow.
</universal_pipeline>

<intake>
Parse `$ARGUMENTS` for a video path and analysis instructions. Read `references/question-templates.md` at intake time and use its JSON structures as-is, filling in any `{placeholder}` values from runtime context (video-info.sh output, glob results, etc.).

**Structured intake gate — follow in order, stopping at the first match:**

1. **If video path is missing:** Use Template 1 (Missing video path) to help the user locate their file.
2. **If path is a directory or glob with multiple matches:** Use Template 5 (Multiple videos found) — populate options dynamically from found files.
3. **If video path is found:** Run `$SCRIPTS_DIR/video-info.sh` to get metadata, then:
   - **If no analysis prompt was provided:** Use Template 2 (Video confirmed — missing analysis prompt). Fill in metadata placeholders before presenting.
   - **If prompt is ambiguous** (keywords don't clearly match the routing table): Use Template 3 (Analysis type selection).
4. **If video is >30s:** Use Template 6 (Long video scope) to ask about trimming.
5. **If animation analysis is selected and video >3s or no fps hint:** Use Template 4 (FPS selection).
6. **If workflow review is selected:** Use Template 7 (Extraction strategy).
7. **If all arguments are present and clear:** Proceed directly to the universal pipeline.
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
All scripts in `$SCRIPTS_DIR` (`${CLAUDE_PLUGIN_ROOT}/skills/vision-replay/scripts/`):

| Script | Purpose | Key Args |
|--------|---------|----------|
| video-info.sh | Get video metadata | `<video-path>` |
| extract-frames.sh | Extract frames at configurable fps | `<video> <out-dir> <fps> [start] [duration] [crop] [scale]` |
| extract-progressive.sh | Lighthouse-style progressive intervals | `<video> <out-dir>` |
| contact-sheet.sh | Grid overview image | `<video> <out-path> [fps] [cols]` |
| batch-frames.sh | Split frames into read-ready batches | `<frames-dir> [batch-size]` |
| diff-frames.sh | Side-by-side comparison composites | `<ref-dir> <impl-dir> <out-dir>` |
| cleanup.sh | Safe removal of frame directories | `<frames-dir>` |

All scripts use `set -euo pipefail` and validate inputs. Run via: `bash "$SCRIPTS_DIR/<name>.sh"`
</scripts_index>

<reference_index>
All domain knowledge in `references/`:

**Frame rates:** references/fps-strategy.md -- When to use 5, 10, 30, or 60 fps
**ffmpeg commands:** references/ffmpeg-recipes.md -- Crop, scale, timestamp overlay, scene detection
**Question templates:** references/question-templates.md -- AskUserQuestion templates for intake flow
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
