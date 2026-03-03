# Question Templates

Reusable AskUserQuestion templates for the vision-replay intake flow. Use the JSON structures as-is, filling in `{placeholder}` values from runtime context (video-info.sh output, glob results, etc.).

The "Other" option is automatically provided by AskUserQuestion — users can always type custom input.

---

## Template 1: Missing Video Path

Use when `$ARGUMENTS` contains no video path.

```json
{
  "questions": [
    {
      "question": "No video file was provided. Where is the video you'd like me to analyze?",
      "header": "Video",
      "options": [
        {
          "label": "Search current directory",
          "description": "Look for video files in the current working directory"
        },
        {
          "label": "Search project recursively",
          "description": "Search the entire project tree for video files (mp4, webm, mov, mkv, avi, flv)"
        }
      ],
      "multiSelect": false
    }
  ]
}
```

After the user responds, use `Glob` to find matching video files. If multiple matches are found, proceed to Template 5.

---

## Template 2: Video Confirmed — Missing Analysis Prompt

Use when a valid video path was provided but no analysis instructions were given. Fill in `{filename}`, `{duration}`, `{resolution}`, and `{codec}` from `video-info.sh` output.

```json
{
  "questions": [
    {
      "question": "I found `{filename}` ({duration}s, {resolution}, {codec}). What would you like me to do with it?",
      "header": "Goal",
      "options": [
        {
          "label": "Analyze animations",
          "description": "Frame-by-frame timing, easing curves, smoothness, and dropped frame detection"
        },
        {
          "label": "Analyze page load",
          "description": "Progressive rendering, FCP, LCP, layout shifts, and visual completeness"
        },
        {
          "label": "Review user workflow",
          "description": "User journey progression, state transitions, and UX observations"
        }
      ],
      "multiSelect": false
    }
  ]
}
```

---

## Template 3: Analysis Type Selection

Use when the user's prompt is ambiguous — keywords don't clearly match the routing table.

```json
{
  "questions": [
    {
      "question": "What type of analysis should I perform?",
      "header": "Analysis",
      "options": [
        {
          "label": "Animation Analysis",
          "description": "Frame-by-frame timing, easing, smoothness, dropped frames (10-60 fps extraction)"
        },
        {
          "label": "Page Load",
          "description": "Progressive rendering, FCP, LCP, layout shifts (Lighthouse-style intervals)"
        },
        {
          "label": "Workflow Review",
          "description": "User journeys, state transitions, UX observations (2-3 fps or scene detection)"
        }
      ],
      "multiSelect": false
    }
  ]
}
```

---

## Template 4: FPS Selection

Use for animation analysis when the video is longer than 3 seconds or no fps hint was given.

```json
{
  "questions": [
    {
      "question": "What frame rate should I use for extraction?",
      "header": "Frame rate",
      "options": [
        {
          "label": "10 fps (Recommended)",
          "description": "Standard transitions, slides, fades — good balance of detail and frame count"
        },
        {
          "label": "30 fps",
          "description": "Fast micro-animations, hover effects, ripples — higher frame density"
        },
        {
          "label": "60 fps",
          "description": "Smoothness validation, jank detection — maximum detail for short clips"
        },
        {
          "label": "5 fps",
          "description": "Slow transitions, page changes — minimal frames for longer videos"
        }
      ],
      "multiSelect": false
    }
  ]
}
```

---

## Template 5: Multiple Videos Found

Use when the user gave a directory or glob pattern and multiple video files were found. Populate options dynamically from the found files (up to 4). Include file size and duration when available.

```json
{
  "questions": [
    {
      "question": "I found multiple video files. Which one should I analyze?",
      "header": "Which video",
      "options": [
        {
          "label": "{filename_1}",
          "description": "{size_1}, {duration_1}s"
        },
        {
          "label": "{filename_2}",
          "description": "{size_2}, {duration_2}s"
        },
        {
          "label": "{filename_3}",
          "description": "{size_3}, {duration_3}s"
        },
        {
          "label": "{filename_4}",
          "description": "{size_4}, {duration_4}s"
        }
      ],
      "multiSelect": false
    }
  ]
}
```

Populate only as many options as there are files (minimum 2, maximum 4). The automatic "Other" option covers additional files beyond the first 4.

---

## Template 6: Long Video Scope

Use when the video duration exceeds 30 seconds. Fill in `{duration}` from `video-info.sh` output.

```json
{
  "questions": [
    {
      "question": "This video is {duration}s long. Want me to analyze the full video or focus on a specific section?",
      "header": "Scope",
      "options": [
        {
          "label": "Full video",
          "description": "Analyze the entire recording — may produce a large number of frames"
        },
        {
          "label": "First 10 seconds",
          "description": "Focus on the beginning — good for page loads and initial animations"
        },
        {
          "label": "Last 10 seconds",
          "description": "Focus on the end — good for completion states and final transitions"
        }
      ],
      "multiSelect": false
    }
  ]
}
```

The automatic "Other" option lets the user specify a custom time range (e.g., "2:30 to 2:45").

---

## Template 7: Extraction Strategy for Workflow Review

Use when workflow review is selected to choose between scene detection and fixed fps.

```json
{
  "questions": [
    {
      "question": "How should I extract frames for this workflow review?",
      "header": "Strategy",
      "options": [
        {
          "label": "Scene detection (Recommended)",
          "description": "Captures state changes automatically, skips idle frames — best for varied-pace interactions"
        },
        {
          "label": "Fixed 2 fps",
          "description": "Uniform sampling at 2 frames/second — good for steady-pace interactions"
        },
        {
          "label": "Fixed 3 fps",
          "description": "Higher density at 3 frames/second — catches rapid click sequences"
        }
      ],
      "multiSelect": false
    }
  ]
}
```

---

## Template 8: Workflow Review — Animation Sensitivity

Use when workflow review is selected to determine dedup sensitivity. This controls whether subtle animations (fades, slides, easing) are preserved or only major state changes (navigation, modals, field updates) are kept.

```json
{
  "questions": [
    {
      "question": "Does this workflow include animations you want to analyze, or are you focused on state changes like navigation, form updates, and modals?",
      "header": "Detail level",
      "options": [
        {
          "label": "State changes only (Recommended)",
          "description": "Keep major visual changes — page navigation, modal opens, form submissions, content updates. Drops subtle animations."
        },
        {
          "label": "Include animations",
          "description": "Also preserve subtle transitions — fades, slides, loading spinners, hover effects. More frames to review."
        }
      ],
      "multiSelect": false
    }
  ]
}
```

If the user selects "State changes only", use dedup threshold 15 (coarse). If "Include animations", use threshold 1 (sensitive).
