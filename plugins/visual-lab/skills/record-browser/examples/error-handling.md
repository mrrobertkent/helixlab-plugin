# Record Browser — Error Handling Examples

Common error scenarios and how the agent should handle them. Each entry describes the error, what to tell the user, and the recovery action.

---

## 1. Chrome Fails to Launch

**Error indicators:**
- `install-browser.sh` exits non-zero with "download failed" or "unsupported platform"
- `launch-recorder.sh` exits with "Chrome for Testing not installed" or "Chrome binary not found"
- Node.js `spawn` error: `ENOENT`, `EACCES`, or `EPERM`
- On Linux: "no DISPLAY environment variable" or "cannot open display"

**What to tell the user:**
"Chrome for Testing failed to launch. This usually means the browser binary is missing, corrupted, or your system is missing a display server."

**Recovery actions:**
1. Re-run `install-browser.sh` to re-download Chrome for Testing.
2. If install succeeds but launch still fails, check that the binary is executable: `chmod +x <chrome-path>`.
3. On Linux without a desktop environment, confirm WSLg (Windows 11) or an X server is running.
4. If the error persists, report the full error output to the user and suggest filing an issue.

---

## 2. Recording Fails to Start

**Error indicators:**
- `getDisplayMedia` rejects with `NotAllowedError` or `NotFoundError`
- Recorder logs "Failed to acquire capture stream" or "No media stream"
- Tab capture picker appears but no stream is returned

**What to tell the user:**
"The browser recording could not start because screen/tab capture was not available. This can happen if Chrome permissions were denied or the capture API is unavailable."

**Recovery actions:**
1. Close the browser and re-launch with `launch-recorder.sh` — the capture prompt auto-accepts on retry.
2. Ensure no other application is using the tab capture API simultaneously.
3. If the error repeats, try a different URL or the default welcome page to isolate the issue.

---

## 3. Browser Closes Unexpectedly Mid-Recording

**Error indicators:**
- Node.js process exits with `SIGTERM`, `SIGKILL`, or non-zero exit code
- WebSocket connection to Chrome drops (`ECONNRESET` or `close` event)
- Recorder logs "Browser disconnected" or "CDP connection lost"
- No `HELIX_SAVED` or `HELIX_NO_SAVE` marker in stdout

**What to tell the user:**
"The browser closed unexpectedly during recording. Any in-progress recording data may be lost. This can happen if Chrome crashes, is killed by the OS, or the user closed it via the window controls."

**Recovery actions:**
1. Check if a partial WebM file exists at the expected output path — it may be playable.
2. If no file exists, inform the user the recording was lost and offer to re-launch.
3. Clean up any stale PID files: `rm -f /tmp/claude-recorder.pid`.
4. Re-run `launch-recorder.sh` to start a fresh session.

---

## 4. Save Fails

**Error indicators:**
- Recorder logs "Failed to write file" with `ENOSPC` (disk full), `EACCES` (permission denied), or `ENOENT` (directory missing)
- `HELIX_SAVED` marker is not printed but `HELIX_SESSION_END` appears
- File exists but is 0 bytes

**What to tell the user:**
"The recording could not be saved to disk. This is usually caused by insufficient disk space, a permissions issue, or a missing output directory."

**Recovery actions:**
1. Check available disk space: `df -h /tmp`.
2. Verify the output directory exists and is writable.
3. Try saving to a different location by re-launching with an explicit output path: `launch-recorder.sh <url> /path/to/output.webm`.
4. If the recording is still in the browser dialog, the user can try "Save & Close" again or use the download button in the video preview.

---

## 5. AskUserQuestion Times Out or Returns Empty

**Error indicators:**
- AskUserQuestion returns with no selected options (empty response)
- The tool returns after the 60-second timeout with default/empty values
- User did not see the prompt (window was not focused, notification was missed)

**What to tell the user:**
"The question timed out or no response was received. Let me ask again."

**Recovery actions:**
1. Inform the user that the previous question timed out.
2. Re-ask the same question using the same template from `references/question-templates.md`.
3. Do NOT auto-proceed with a default option or assume the user's intent.
4. If the question times out repeatedly (3+ times), tell the user the question is not getting through and ask them to respond in plain text instead.

---

## 6. Vision-Replay Scripts Fail

**Error indicators:**
- `video-info.sh` exits with "ffprobe: command not found" or "not a valid video file"
- `normalize-video.sh` or `dedupe-video.sh` exits with ffmpeg errors
- `contact-sheet.sh` produces a 0-byte output
- `extract-frames.sh` exits with "bc: command not found" or "no frames extracted"

**What to tell the user:**
"The video analysis pipeline encountered an error. This usually means ffmpeg is not installed or the recording file is corrupted."

**Recovery actions:**
1. Verify ffmpeg and ffprobe are installed: `which ffmpeg ffprobe`.
2. If missing, run the setup skill or install ffmpeg manually.
3. Verify the recording file is valid: `bash "$VR_SCRIPTS/video-info.sh" "$VIDEO_PATH"`.
4. If the file is corrupted (0 bytes, truncated), the recording was likely interrupted — offer to re-record.
5. If ffmpeg is installed but a specific script fails, check that `bc` is available (required by some scripts).
6. Try the "Raw video" preparation method to bypass preprocessing steps that may be failing.
