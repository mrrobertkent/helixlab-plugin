---
name: vision-replay
description: >
  Extract frames from video files using ffmpeg and analyze them with Claude's
  multimodal vision. Supports animation timing analysis, page load performance
  review, and user workflow progression. Automatically detects annotations drawn
  with the record-browser skill. Use when working with video files, screen
  recordings, animation validation, or visual analysis of UI behavior.
argument-hint: "path/to/video.webm [analysis instructions]"
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
---

<essential_principles>
**Video analysis pipeline:** video file -> deduplicate static frames -> ffmpeg frame extraction -> Claude vision analysis -> structured report.

All frame extraction is handled by deterministic shell scripts. Workflows guide your analytical reasoning -- what to look for and how to structure findings. Scripts handle the mechanics.

**Frame storage:** All frames go to `/tmp/claude-video-frames/<timestamp>/`. Always clean up after analysis using `cleanup.sh`.

**Context window management:** Read at most 15-20 frames per batch. Use `batch-frames.sh` to organize large frame sets. Use `contact-sheet.sh` for quick overviews before detailed extraction.

Works seamlessly with recordings from the record-browser skill — annotations drawn during recording appear as bright colored shapes in the extracted frames and are automatically prioritized during analysis.
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

**Step 2: Normalize the video**

Downscales high-resolution recordings (retina, tablet, mobile) and burns timestamp overlays into frames. Timestamps must be applied BEFORE deduplication so the agent can see original timing gaps in deduped output.

```bash
bash "$SCRIPTS_DIR/normalize-video.sh" "<video-path>" "$WORK_DIR/normalized.mp4"
```

The script caps the longest dimension at 1920px (configurable via third argument), preserves aspect ratio, and adds timestamp text if ffmpeg has libfreetype support. Use `$WORK_DIR/normalized.mp4` for all subsequent steps.

**Step 3: Deduplicate static frames**

Skip this step if the `--pre-deduped` flag was passed in `$ARGUMENTS` (the video has already been deduped by another skill).

Choose the threshold based on the analysis type determined at intake:

| Analysis Type | Threshold | Rationale |
|---------------|-----------|-----------|
| Animation | 1 | Preserves subtle easing, fades, micro-interactions |
| Page load | 3 | Preserves progressive rendering changes |
| Workflow review | 15 | Keeps only major state changes (navigation, modals, field updates) |
| Unknown/general | 1 | Safe default — preserves all motion |

```bash
bash "$SCRIPTS_DIR/dedupe-video.sh" "$WORK_DIR/normalized.mp4" "$WORK_DIR/deduped.mp4" <threshold>
```

Review the output: if reduction is significant (>10%), use `$WORK_DIR/deduped.mp4` as the video for all subsequent steps. If reduction is minimal (<10%), the video has little static content — use the normalized video. Report the reduction and threshold used to the user.

If timestamps were burned in during normalization, the agent can see original timing in each frame (e.g., a jump from 0:01.200 to 0:02.800 means 1.6s of no visual change).

**Step 4: Generate contact sheet overview**

```bash
bash "$SCRIPTS_DIR/contact-sheet.sh" "$WORK_DIR/deduped.mp4" "$WORK_DIR/contact-sheet.png" 5 5
```

Use `$WORK_DIR/deduped.mp4` if dedup was applied, or `$WORK_DIR/normalized.mp4` if dedup was skipped.

**Step 5: Read the contact sheet**

Use the Read tool to view `$WORK_DIR/contact-sheet.png`. This gives you a quick visual overview of the entire video.

**Step 6: Route to workflow**

Based on the user's request AND what you see in the contact sheet, route to the appropriate workflow.
</universal_pipeline>

<intake>
Parse `$ARGUMENTS` for a video path, analysis instructions, and flags. Read `${CLAUDE_PLUGIN_ROOT}/skills/vision-replay/references/question-templates.md` at intake time and use its JSON structures as-is, filling in any `{placeholder}` values from runtime context (video-info.sh output, glob results, etc.).

**Recognized flags:**
- `--pre-deduped` — The video has already had static frames removed (e.g., by the record-browser skill). Skip the deduplication step in the universal pipeline.

**Structured intake gate — follow in order, stopping at the first match:**

1. **If video path is missing:** Use Template 1 (Missing video path) to help the user locate their file.
2. **If path is a directory or glob with multiple matches:** Use Template 5 (Multiple videos found) — populate options dynamically from found files.
3. **If video path is found:** Run `$SCRIPTS_DIR/video-info.sh` to get metadata, then:
   - **If no analysis prompt was provided:** Use Template 2 (Video confirmed — missing analysis prompt). Fill in metadata placeholders before presenting.
   - **If prompt is ambiguous** (keywords don't clearly match the routing table): Use Template 3 (Analysis type selection).
4. **If video is >30s:** Use Template 6 (Long video scope) to ask about trimming.
5. **If animation analysis is selected and video >3s or no fps hint:** Use Template 4 (FPS selection).
6. **If workflow review is selected:** Use Template 8 (Animation sensitivity) to determine dedup threshold, then Template 7 (Extraction strategy).
7. **If all arguments are present and clear:** Proceed directly to the universal pipeline.

**AskUserQuestion timeout handling:** If the user does not respond to a question within a reasonable time, do not auto-answer or assume defaults. Wait for the user's explicit response before proceeding. If the AskUserQuestion call fails or returns an error, fall back to using the most conservative default (e.g., animation analysis at 10fps, full video scope) and inform the user which defaults were applied.
</intake>

<entry_points>
**Standalone invocation:** User runs `/helixlab:vision-replay <video-path> [analysis instructions]`. Parse `$ARGUMENTS` for the video path and any analysis prompt, then proceed through the intake gate above.

**Chained entry from record-browser:** When the record-browser skill saves a recording, it prints `HELIX_SAVED=<path>` to stdout. The record-browser skill may then invoke vision-replay with that path and a `--pre-deduped` flag. In this case, skip the deduplication step in the universal pipeline and proceed directly with the provided path.

**Exit points:**
- **Analysis complete:** The structured report has been delivered and frames cleaned up. This is the normal exit.
- **User cancels:** The user decides not to proceed at any intake gate question. Acknowledge and stop.
- **Error occurs:** A prerequisite is missing (ffmpeg not installed), the video file is invalid, or a script fails. Report the error clearly and suggest recovery steps. See `examples/error-handling.md` for common error scenarios and recovery actions.
</entry_points>

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
| cursor, annotations, modal, navigation, annotated, | |
| record-browser, circled, highlighted, drawn | |
|----------------------------------------------------|--------------------------------------|
| general / ambiguous (no clear type detected) | workflows/animation-analysis.md |

**Annotated recordings:** If the video was recorded with the record-browser skill and contains annotations (bright colored circles, arrows, rectangles, or text), default to **workflow review** mode. The annotation colors (red, yellow, blue, green) are highly visible in extracted frames and all analysis workflows are annotation-aware.

**After reading the workflow, follow it exactly.**
</routing>

<scripts_index>
All scripts in `$SCRIPTS_DIR` (`${CLAUDE_PLUGIN_ROOT}/skills/vision-replay/scripts/`):

| Script | Purpose | Key Args |
|--------|---------|----------|
| video-info.sh | Get video metadata | `<video-path>` |
| normalize-video.sh | Downscale + timestamp overlay | `<input-video> <output-video> [max-dimension]` |
| dedupe-video.sh | Remove static/unchanged frames from video | `<input-video> <output-video> [threshold]` |
| extract-frames.sh | Extract frames at configurable fps | `<video> <out-dir> <fps> [start] [duration] [crop] [scale]` |
| extract-progressive.sh | Lighthouse-style progressive intervals | `<video> <out-dir>` |
| contact-sheet.sh | Grid overview image | `<video> <out-path> [fps] [cols]` |
| batch-frames.sh | Split frames into read-ready batches | `<frames-dir> [batch-size]` |
| diff-frames.sh | Side-by-side comparison composites | `<ref-dir> <impl-dir> <out-dir>` |
| cleanup.sh | Safe removal of frame directories | `<frames-dir>` |

**Config:** `config/fonts.conf` is set via `FONTCONFIG_FILE` by scripts that use ffmpeg drawtext. It provides font paths for static ffmpeg builds on macOS/Linux. No action needed — scripts handle this automatically.

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
**Page load:** examples/page-load-report.md -- Timeline, key metrics, layout shifts, recommendations
**Workflow:** examples/workflow-report.md -- Step map, observations, UX findings
**Error handling:** examples/error-handling.md -- Common error scenarios, user messaging, and recovery actions
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
