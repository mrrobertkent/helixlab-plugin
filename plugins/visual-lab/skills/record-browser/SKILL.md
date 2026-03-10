---
name: record-browser
description: >
  Launch a headed Chrome browser with built-in recording and annotation tools.
  Record user workflows with a glassmorphism toolbar, draw annotations (lines,
  arrows, rectangles, circles, freehand, text) directly on the page using fabric.js, and
  save WebM recordings for analysis with vision-replay. Annotations are captured
  in the video automatically. Use when you need to record browser interactions,
  annotate UI elements for AI analysis, test UI flows, or capture animations.
argument-hint: "[url]"
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
---

<essential_principles>
**Browser recording pipeline:** install deps → launch browser (optional URL, defaults to welcome page) → user navigates and records → annotations via draw mode → stop → save/review dialog → ask user what to do next.

This skill works **both standalone and chained with vision-replay**. After saving a recording, use the question templates in `references/question-templates.md` to ask the user whether they want to analyze the recording or keep it as an artifact.

The browser includes a glassmorphism toolbar with recording controls and a full annotation toolset powered by fabric.js. All annotations are drawn on a canvas overlay and captured in the recording via the Chrome compositor output — no post-processing required.

**Dependency location:** Chrome for Testing is installed to `${CLAUDE_PLUGIN_ROOT}/.deps/browsers/`. No npm packages required — the recorder uses raw Chrome DevTools Protocol over WebSocket (Node 22+ built-in).

**Vendored library:** fabric.js is vendored at `${CLAUDE_PLUGIN_ROOT}/skills/record-browser/vendor/fabric.min.js`. Loaded into the page via CDP `Runtime.evaluate` — no CDN, no npm install at runtime.

**Script location:** All scripts live at `${CLAUDE_PLUGIN_ROOT}/skills/record-browser/scripts/`. Define this once:

```bash
SCRIPTS_DIR="${CLAUDE_PLUGIN_ROOT}/skills/record-browser/scripts"
```

Then run scripts as: `bash "$SCRIPTS_DIR/<script-name>.sh" <args>`
</essential_principles>

<prerequisites>
**Node.js** (v22+) must be available. No npm packages required.

**Chrome for Testing** is downloaded once by `install-browser.sh` (~150MB) to `${CLAUDE_PLUGIN_ROOT}/.deps/browsers/`. If Chrome is missing, `launch-recorder.sh` exits with a clear error — run `install-browser.sh` then retry.

**Platform support:** macOS and Linux work out of the box. Windows requires WSL2 with WSLg (Windows 11) or an X server.
</prerequisites>

<usage>
**Step 1: Launch browser with recording**

**CRITICAL:** Do NOT check for dependencies manually (no `ls`, no directory checks). Just run the launch script directly — it validates Chrome internally and exits with a clear error if missing.

**CRITICAL:** Do NOT ask the user for a URL. If the user provided a URL in the skill argument, pass it. If not, omit it — the script defaults to the bundled welcome page automatically.

```bash
SCRIPTS_DIR="${CLAUDE_PLUGIN_ROOT}/skills/record-browser/scripts"
bash "$SCRIPTS_DIR/launch-recorder.sh" "[url]"
```

If `launch-recorder.sh` fails with "Chrome for Testing not installed":
```bash
bash "$SCRIPTS_DIR/install-browser.sh"
bash "$SCRIPTS_DIR/launch-recorder.sh" "[url]"
```

**Step 2: User records and annotates**

The user interacts with the browser toolbar to record, pause, draw annotations, and stop. See `<recording_controls>`, `<annotation_tools>`, and `<keyboard_shortcuts>` for the full control reference.

**Step 3: Save via post-recording dialog**

When the user clicks Stop, a post-recording dialog appears with:
- Video playback (native controls, fullscreen and download buttons suppressed, plus an Expand button that opens a detached fullscreen overlay)
- An editable filename (auto-generated as `YYYY-MM-DD_domain-path.webm`)
- Three action buttons:
- **Save & Close** — saves the recording to disk and closes the browser. The saved WebM path is printed to stdout (`HELIX_SAVED=<path>`) so the agent can continue the workflow.
- **Start Over** — discards the recording and returns to idle for a new recording.
- **Close** — discards the recording without saving (`HELIX_NO_SAVE` is printed to stdout) and closes the browser.

**Step 4: Ask user what to do next — MANDATORY STOP**

Check stdout for the session outcome:
- `HELIX_SAVED=<path>` — user saved the recording. Continue with the options below.
- `HELIX_NO_SAVE` — user chose to close without saving. Acknowledge and stop — no further action needed.
- `HELIX_SESSION_END` without either marker — browser was closed directly (X button). Acknowledge and stop.

If the recording was saved, parse the file path from `HELIX_SAVED=<path>`. Then:

**CRITICAL:** PRINT the saved file path to the user FIRST. Then call AskUserQuestion using **Template 1** from `references/question-templates.md`. AskUserQuestion must be the ONLY tool call in this response — no Read, Bash, Glob, or any other tool alongside it. Wait for the user's actual response — do NOT auto-answer, assume defaults, or skip the question. If AskUserQuestion returns empty or no response (60-second timeout), inform the user the question timed out and re-ask.

- User chose **Keep as artifact** → report the saved file path and stop.
- User chose **Analyze with Vision Replay** → continue to Step 5.

**Step 5: Ask preparation method (only if user chose to analyze)**

Call AskUserQuestion using **Template 2** from `references/question-templates.md`. AskUserQuestion must be the ONLY tool call. WAIT for the user's response. If AskUserQuestion returns empty or no response (60-second timeout), inform the user the question timed out and re-ask.

- User chose **Full pipeline** → continue to Step 6 with full preprocessing.
- User chose **Raw video** → skip directly to vision-replay analysis (no dedupe/normalize).

**Step 6: Ask analysis mode**

Call AskUserQuestion using **Template 3** from `references/question-templates.md`. AskUserQuestion must be the ONLY tool call. WAIT for the user's response. Do NOT auto-select an analysis mode. If AskUserQuestion returns empty or no response (60-second timeout), inform the user the question timed out and re-ask.

After the user responds, run the vision-replay pipeline:

```bash
VR_SCRIPTS="${CLAUDE_PLUGIN_ROOT}/skills/vision-replay/scripts"
VIDEO_PATH="<path-from-HELIX_SAVED>"

# Get video info
bash "$VR_SCRIPTS/video-info.sh" "$VIDEO_PATH"

# If "Full pipeline" was chosen:
WORK_DIR="/tmp/claude-video-frames/$(date +%s)"
mkdir -p "$WORK_DIR"

# Normalize (downscale + timestamp overlay)
bash "$VR_SCRIPTS/normalize-video.sh" "$VIDEO_PATH" "$WORK_DIR/normalized.mp4"

# Remove static frames (threshold depends on analysis mode chosen in Template 3)
# Workflow Review → 15, Page Load → 3, Animation → 1
bash "$VR_SCRIPTS/dedupe-video.sh" "$WORK_DIR/normalized.mp4" "$WORK_DIR/deduped.mp4" <THRESHOLD>

# Generate contact sheet
bash "$VR_SCRIPTS/contact-sheet.sh" "$WORK_DIR/deduped.mp4" "$WORK_DIR/contact-sheet.png"

# Extract frames (method depends on analysis mode chosen in Template 3)
# Workflow Review → extract-frames.sh at 2fps
# Animation → extract-frames.sh at 10fps
# Page Load → extract-progressive.sh (variable fps)
bash "$VR_SCRIPTS/extract-frames.sh" "$WORK_DIR/deduped.mp4" "$WORK_DIR/frames" <FPS>
# OR for Page Load:
# bash "$VR_SCRIPTS/extract-progressive.sh" "$WORK_DIR/deduped.mp4" "$WORK_DIR/frames"
```

The vision-replay analysis workflows are annotation-aware and will prioritize annotated areas.

**Step 7: Post-analysis cleanup — MANDATORY STOP**

After vision-replay analysis is complete, call AskUserQuestion using **Template 4** from `references/question-templates.md`. AskUserQuestion must be the ONLY tool call. WAIT for the user's response before deleting anything. If AskUserQuestion returns empty or no response (60-second timeout), inform the user the question timed out and re-ask.

```bash
# Clean up extracted frames and work directory
bash "$VR_SCRIPTS/cleanup.sh" "$WORK_DIR/frames"
rm -rf "$WORK_DIR"

# Optionally delete the source recording (only if user chose "Delete recording")
# rm -f "$VIDEO_PATH"
```
</usage>

<scripts_index>
| Script | Purpose | Key Args |
|--------|---------|----------|
| install-browser.sh | One-time setup: downloads Chrome for Testing | None |
| launch-recorder.sh | Opens headed Chrome with recording toolbar | `[url] [output-path] [viewport]` |
| stop-recorder.sh | Sends SIGTERM to the recorder — triggers graceful Chrome shutdown (bypasses save dialog, emergency exit only) | None |
| recorder.js | Node.js controller (raw CDP, getDisplayMedia capture, annotations) | `<url> <output-path> <chrome-path> [viewport]` |
| cdp.js | Raw Chrome DevTools Protocol WebSocket client (zero deps) | Used by recorder.js |

**Bundled pages:** `pages/welcome.html` is the default landing page (shown when no URL is provided). `pages/playground.html` is a built-in test page with interactive elements for verifying annotation tools.

All scripts use `set -euo pipefail` and validate inputs. Run via: `bash "$SCRIPTS_DIR/<name>.sh"`
</scripts_index>

<recording_controls>
The browser toolbar provides these controls, organized by recording state:

**Pre-recording (idle state):**

| Control | Action |
|---------|--------|
| Record | Begin recording with a 3-second countdown |
| On Action | Arm the action interceptor — recording starts on the user's next click |

**During recording:**

| Control | Action |
|---------|--------|
| Timer | Shows elapsed recording time with pulsing red dot |
| Pause | Pause the recording |
| Stop | Stop recording, open post-recording dialog |
| Restart | Discard current recording, reset to idle state |

**Draw mode (toggle via Draw button while recording):**

| Control | Action |
|---------|--------|
| Select | Click to select, move, resize, or delete existing annotations |
| Pen | Freehand drawing tool |
| Line | Click-drag line with configurable arrowheads |
| Rectangle | Click-drag rectangle outline |
| Circle | Click-drag ellipse outline |
| Text | Click to place editable text |

**Colors:**

| Button | Color | Hex |
|--------|-------|-----|
| Red | Red | `#ff3b30` |
| Yellow | Yellow | `#ffd60a` |
| Blue | Blue | `#007aff` |
| Green | Green | `#30d158` |
| White | White | `#ffffff` |

**Stroke width (visible in draw mode):**

| Button | Width |
|--------|-------|
| 1 | 1px thin stroke |
| 2 | 2px light stroke |
| 3 | 3px default stroke |
| 5 | 5px bold stroke |

**Fill toggle (visible for shapes and text):**

| Control | Action |
|---------|--------|
| Fill | For shapes: toggle 25%-opacity fill using the current stroke color. For text: toggle dark semi-transparent background (same as BG). |

**Arrowhead options (visible for Line tool or selected lines):**

| Control | Action |
|---------|--------|
| Line | No arrowheads (plain line) |
| Arrow → | Arrowhead at end only |
| ← Arrow | Arrowhead at start only |
| ← → | Arrowheads at both ends |

**Actions:**

| Control | Action |
|---------|--------|
| Undo | Remove last drawn annotation |
| Delete | Delete the currently selected annotation |
| Clear | Remove all annotations |

**Text formatting (visible when Text tool is active or text is selected):**

| Control | Action |
|---------|--------|
| S / M / L / XL | Font size: 14px / 18px / 28px / 40px |
| BG | Toggle semi-transparent dark background behind text |
| BD | Toggle box border around the textbox (mirrors font color, drawn via canvas overlay) |

Controls are injected via CDP `Page.addScriptToEvaluateOnNewDocument` and communicate with the Node.js controller via CDP `Runtime.addBinding`. fabric.js is re-injected on every `Page.frameNavigated` event via `Runtime.evaluate`.
</recording_controls>

<keyboard_shortcuts>
All shortcuts are suppressed when the user is focused on `<input>`, `<textarea>`, `contenteditable`, or fabric.js `IText` editing mode.

| Shortcut | Action |
|----------|--------|
| Space | Pause / Resume recording |
| Escape | Exit draw mode (return to page interaction) |
| D | Toggle draw mode on/off |
| Ctrl/Cmd+Z | Undo last annotation |
| C | Clear all annotations (draw mode only) |
| 1 | Quick-switch color: Red |
| 2 | Quick-switch color: Yellow |
| 3 | Quick-switch color: Blue |
| 4 | Quick-switch color: Green |
| Delete/Backspace | Delete selected annotation |
| Shift / ⌘ / Ctrl | Constrain shape to 1:1 ratio (hold while drawing or resizing rect/circle) |
| ⌘/Ctrl+Click | Multi-select annotations (select mode only) |
</keyboard_shortcuts>

<annotation_tools>
Annotations are powered by fabric.js on a full-viewport canvas overlay.

**Canvas overlay:**
- `position: fixed`, covers the full viewport
- `z-index: 2147483646` (one below the toolbar at `2147483647`)
- Default: `pointer-events: none` — clicks pass through to the page
- Draw mode: `pointer-events: auto` — canvas intercepts mouse events for drawing
- Annotations persist until the user clicks Undo or Clear
- **Page-pinned: annotations scroll with the page content** (synced via viewportTransform)
- SPA navigation clears annotations automatically (URL change detection via polling)
- Full page navigation resets the canvas (evaluateOnNewDocument re-runs)

**Tool behaviors:**

| Tool | Behavior |
|------|----------|
| Select | Switch to selection mode — click annotations to select, drag to move, resize via handles. Right-click for context menu with Delete option. Selecting an object syncs stroke width, fill, and arrowhead state to the toolbar. |
| Pen | Freehand drawing via `canvas.isDrawingMode` with `PencilBrush`. Respects current stroke width. |
| Line | Click-drag creates a line with configurable arrowheads (none, start, end, both). Arrowhead options appear contextually. |
| Rectangle | Click-drag creates a `fabric.Rect` with configurable fill and stroke. `strokeUniform: true`. |
| Circle | Click-drag creates a `fabric.Ellipse` with configurable fill and stroke. `strokeUniform: true`. |
| Text | Click to place a `fabric.IText` — type to enter text, double-click to re-edit. Supports BG fill and BD border. |

**Object manipulation:**

| Action | How |
|--------|-----|
| Select | Switch to Select tool, then click an annotation (blue handles appear) |
| Move | Drag a selected annotation to reposition |
| Resize | Drag corner/edge handles |
| Delete | Press Delete/Backspace, click trash button, or right-click → Delete |
| Undo | Remove the last-added object from the canvas |
| Clear | Remove all objects |

Annotations are captured in the recording automatically because `getDisplayMedia` captures the Chrome compositor output — everything rendered on screen, including injected DOM elements and the fabric.js canvas.
</annotation_tools>

<recording_modes>
**Manual Record:**

1. User clicks **Record**
2. Tab capture stream is acquired (brief auto-accepted picker flash)
3. Full-screen countdown overlay (3... 2... 1...) — shown before recording starts, not captured
4. MediaRecorder starts, timer ticks, red dot pulses
5. Brief "Recording" HUD overlay
6. User navigates, interacts, and annotates freely
7. User clicks **Stop** to end

**Record on Action:**

1. User clicks **On Action**
2. Toolbar shows "Ready..." with amber indicator — recording has NOT started yet
3. A transparent click-interceptor overlay is placed over the page
4. User clicks anywhere on the page (a button, link, etc.)
5. The interceptor captures the click coordinates and target element
6. Interceptor is removed
7. Tab capture + MediaRecorder starts immediately
8. The original click is replayed programmatically via `dispatchEvent` to the underlying element
9. The action and its result are captured from the very first frame
10. Recording continues — user can navigate, interact, and annotate

Record on Action ensures the first recorded frame is the actual user action — no static pre-recording frames to waste compute or tokens during analysis. For navigation triggers (page refresh, link click), the click-and-replay approach ensures recording is rolling before the new page loads.
</recording_modes>

<known_issues>
**Chrome closure crash dialog:** Chrome for Testing v146 may show a "quit unexpectedly" dialog when the browser is closed. This is cosmetic — it does not affect recording, video saving, or the workflow. A fix is planned.
</known_issues>

<error_handling>
For error recovery patterns (Chrome launch failures, recording errors, save failures, AskUserQuestion timeouts, vision-replay script failures), consult `examples/error-handling.md`.
</error_handling>
