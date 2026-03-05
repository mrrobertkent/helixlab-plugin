# Error Handling Guide

Common error scenarios during vision-replay analysis, what to tell the user, and how to recover.

---

## 1. ffmpeg not installed or not in PATH

**Error signal:** `which ffmpeg` returns nothing, or scripts exit with "command not found: ffmpeg".

**What to tell the user:**
> ffmpeg is required for video analysis but isn't installed or isn't in your PATH. Run the setup skill (`/helixlab:setup`) to install it, or install manually via your package manager (`brew install ffmpeg` on macOS, `apt install ffmpeg` on Ubuntu).

**Recovery:**
- Run `/helixlab:setup` to detect OS and install dependencies.
- If ffmpeg is installed but not in PATH, check `~/.local/bin/`, `/usr/local/bin/`, or the location printed by `which ffmpeg` and add it to `$PATH`.
- Re-run the analysis after ffmpeg is available.

---

## 2. ffprobe returns unexpected output

**Error signal:** `video-info.sh` exits with "Not a valid video file" or fields like duration/fps/resolution come back as "unknown".

**What to tell the user:**
> I was able to find the file, but ffprobe couldn't extract valid metadata from it. The file may be corrupted, partially downloaded, or in a container format that this build of ffmpeg doesn't support.

**Recovery:**
- Verify the file is a complete download (check file size, try playing in a media player).
- Try running `ffprobe -v error -show_format -show_streams <video-path>` manually to see detailed error output.
- If the file uses an uncommon codec, try transcoding it first: `ffmpeg -i input.webm -c:v libx264 output.mp4`.
- If metadata fields are "unknown" but the file plays correctly, proceed with manual fps/duration estimates.

---

## 3. Input video file doesn't exist or is corrupted

**Error signal:** Scripts exit with "File not found: <path>" or ffmpeg exits with "Invalid data found when processing input".

**What to tell the user:**
> The video file at `<path>` doesn't exist or can't be read. Please double-check the file path and ensure the file hasn't been moved or deleted.

**Recovery:**
- Use `ls -la <path>` to verify the file exists and has a non-zero size.
- If the file was recorded recently, check that the recording completed successfully (no crash during save).
- If the file exists but is 0 bytes, the recording failed -- re-record.
- If the path contains spaces or special characters, ensure it's properly quoted.
- Use Template 1 (Missing video path) to help the user locate their file.

---

## 4. Disk full during frame extraction

**Error signal:** ffmpeg exits with an I/O error, or `extract-frames.sh` produces fewer frames than expected. The system may report "No space left on device".

**What to tell the user:**
> Frame extraction failed because the disk is full. Extracted frames are stored in `/tmp/claude-video-frames/` and can use significant space, especially at high fps or for long videos.

**Recovery:**
- Clean up old frame directories: `rm -rf /tmp/claude-video-frames/`
- Check available disk space: `df -h /tmp`
- Re-run with a lower fps to reduce frame count.
- Use time range arguments (`start`, `duration`) to extract only the relevant section.
- Use `--scene-detect` instead of fixed fps to extract fewer frames.

---

## 5. Unsupported video codec

**Error signal:** ffmpeg exits with "Decoder not found" or "Unknown decoder" errors. `video-info.sh` may report the codec but ffmpeg can't process it.

**What to tell the user:**
> The video uses the `<codec>` codec which isn't supported by this ffmpeg build. This usually happens with proprietary codecs (e.g., HEVC without license, AV1 on older builds).

**Recovery:**
- Check the codec: `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 <video-path>`
- Install a more complete ffmpeg build (e.g., `brew install ffmpeg` with all codecs on macOS).
- Transcode the video with a different tool that supports the codec, then re-analyze.
- For screen recordings, re-record using a widely supported codec (VP8, VP9, H.264).

---

## 6. Dedupe threshold too aggressive (removes all frames)

**Error signal:** `dedupe-video.sh` produces a very short output (< 0.1s) or the deduped video has 0 extractable frames. The reduction percentage is very high (>95%).

**What to tell the user:**
> The deduplication threshold of `<threshold>` was too aggressive for this video -- it removed nearly all frames. This usually means the video has subtle, continuous visual changes (animations, scrolling) that the threshold treated as "static."

**Recovery:**
- Re-run with a lower threshold: use 1 (most sensitive) to preserve all visual changes.
- Skip deduplication entirely by using the normalized video directly.
- If the video was already pre-deduped (from record-browser), pass `--pre-deduped` to skip the step.
- Check the contact sheet of the original (non-deduped) video to verify content is present.

---

## 7. Contact sheet generation fails (too many/few frames)

**Error signal:** `contact-sheet.sh` exits with an ffmpeg error, produces a blank image, or produces an extremely large image file.

**What to tell the user:**
> The contact sheet generation failed. This can happen when the video is too short to produce enough frames at the requested fps, or too long and produces an image that's too large to render.

**Recovery for too few frames:**
- Increase the fps parameter: `bash "$SCRIPTS_DIR/contact-sheet.sh" <video> <output> 10 5`
- For very short videos (< 1s), extract individual frames instead of a contact sheet.
- Verify the video has actual content (not a 0-duration container).

**Recovery for too many frames:**
- Decrease the fps: `bash "$SCRIPTS_DIR/contact-sheet.sh" <video> <output> 2 5`
- Reduce tile columns: use 3 instead of 5 for a narrower grid.
- Trim the video to the relevant section before generating the contact sheet.
- Use `dedupe-video.sh` first to remove static frames, then generate the contact sheet from the deduped output.

---

## 8. Video is too short (< 1 second) or too long (> 30 minutes)

### Too short (< 1 second)

**Error signal:** `video-info.sh` reports a duration under 1 second. Frame extraction may produce 0 frames at low fps settings.

**What to tell the user:**
> This video is very short (`<duration>`s). Standard fps-based extraction may not capture enough frames. I'll extract all available frames instead.

**Recovery:**
- Use a high fps (30 or 60) to capture as many frames as possible from the short clip.
- Skip deduplication (short videos rarely have static frames worth removing).
- Skip the contact sheet and go directly to frame extraction.
- If 0 frames are extracted, try `ffmpeg -i <video> -frames:v 1 frame.png` to grab at least one frame.

### Too long (> 30 minutes)

**Error signal:** `video-info.sh` reports a duration over 1800 seconds.

**What to tell the user:**
> This video is `<duration>` long. Full analysis would produce a very large number of frames and take significant processing time. I recommend focusing on a specific section.

**Recovery:**
- Use Template 6 (Long video scope) to ask the user which section to analyze.
- Use time range arguments with `extract-frames.sh` (`start` and `duration` parameters).
- Use `--scene-detect` to extract only frames with visual changes.
- Use a very low fps (1-2 fps) for a broad overview, then re-extract specific sections at higher fps.
- Consider running `dedupe-video.sh` first to eliminate idle periods.
