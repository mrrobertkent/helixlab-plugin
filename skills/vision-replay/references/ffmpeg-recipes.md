<overview>
Common ffmpeg filter chains and commands for video frame analysis. These can be composed as arguments to extract-frames.sh or used directly via Bash when the scripts don't cover a specific need.
</overview>

<recipes>
<recipe name="timestamp_overlay">
Burn timecodes into frames for reference:

```bash
ffmpeg -i video.mp4 -vf "fps=10,drawtext=text='%{pts\:hms}':x=10:y=10:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.5" /tmp/frames/frame_%04d.png
```

Useful when: You need to reference specific timestamps in your analysis report.
</recipe>

<recipe name="crop_region">
Focus on a specific UI region:

```bash
# crop=width:height:x:y (pixels from top-left)
ffmpeg -i video.mp4 -vf "fps=10,crop=400:300:100:50" /tmp/frames/frame_%04d.png
```

Useful when: The animation is in a small region of a full-screen recording. Reduces noise and file size.
</recipe>

<recipe name="scale_down">
Reduce frame dimensions (fit more frames per batch):

```bash
ffmpeg -i video.mp4 -vf "fps=10,scale=960:-1" /tmp/frames/frame_%04d.png
```

Useful when: Source is 4K or 1080p and you need to analyze many frames. 960px width retains enough detail for most analysis.
</recipe>

<recipe name="scene_detection">
Extract only frames where content changes significantly:

```bash
ffmpeg -i video.mp4 -vf "select='gt(scene,0.01)',showinfo" -vsync vfr /tmp/frames/frame_%04d.png
```

Useful when: Analyzing a workflow recording where the user pauses between actions. Avoids extracting identical frames.

Threshold tuning: 0.01 is sensitive (catches small changes). Use 0.1 for major scene changes only.
</recipe>

<recipe name="side_by_side_comparison">
Compare two videos side by side in one output:

```bash
ffmpeg -i reference.mp4 -i implementation.mp4 \
  -filter_complex "[0:v]fps=10,scale=480:-1[left];[1:v]fps=10,scale=480:-1[right];[left][right]hstack" \
  /tmp/frames/compare_%04d.png
```

Useful when: Comparing reference animation to implementation. Each frame shows both videos at the same timestamp.
</recipe>

<recipe name="contact_sheet_custom">
Generate a contact sheet with custom grid:

```bash
# 4 columns, auto rows, 320px per frame
ffmpeg -i video.mp4 -vf "fps=5,scale=320:-1,tile=4x0" /tmp/contact_sheet.png
```

Note: `tile=4x0` auto-calculates row count. The contact-sheet.sh script handles this automatically.
</recipe>

<recipe name="get_metadata">
Get video metadata quickly:

```bash
# Quick summary
ffmpeg -i video.mp4 2>&1 | grep -E "(Duration|Stream)"

# Detailed JSON (used by video-info.sh)
ffprobe -v quiet -print_format json -show_format -show_streams video.mp4
```
</recipe>

<recipe name="frame_at_timestamp">
Extract a single frame at an exact timestamp:

```bash
ffmpeg -ss 1.5 -i video.mp4 -frames:v 1 /tmp/frame_at_1500ms.png
```

Useful when: You need to examine one specific moment without extracting all frames.
</recipe>
</recipes>
