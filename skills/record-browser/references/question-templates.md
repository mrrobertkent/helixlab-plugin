# Record Browser — Question Templates

These are AskUserQuestion tool calls. You MUST use AskUserQuestion (not plain text) and WAIT for the user's response. Do NOT auto-answer or assume defaults.

## Template 1: Post-Save Handoff

Use after the recording is saved and the browser closes. The agent has the saved file path from `HELIX_SAVED=<path>` in stdout.

**IMPORTANT:** "Keep as artifact" is listed first as the safe default (no automatic analysis chain).

```json
{
  "questions": [{
    "question": "Recording saved! What would you like to do next?",
    "header": "Next step",
    "multiSelect": false,
    "options": [
      {
        "label": "Keep as artifact",
        "description": "Save the recording and stop. You can analyze it later."
      },
      {
        "label": "Analyze with Vision Replay",
        "description": "Extract frames and run AI analysis. You'll choose the analysis type next."
      }
    ]
  }]
}
```

## Template 2: Video Preparation Method

Use when the user picks "Analyze with Vision Replay" — ask how to prepare the video before analysis.

```json
{
  "questions": [{
    "question": "How should I prepare the video before analysis?",
    "header": "Preparation",
    "multiSelect": false,
    "options": [
      {
        "label": "Full pipeline (Recommended)",
        "description": "Deduplicate, normalize, extract frames, then analyze. Removes redundant frames."
      },
      {
        "label": "Raw video",
        "description": "Pass the recording directly to vision-replay without preprocessing."
      }
    ]
  }]
}
```

## Template 3: Analysis Mode Selection

Use when the user chooses to analyze with vision-replay.

```json
{
  "questions": [{
    "question": "What type of analysis should I run on this recording?",
    "header": "Analysis",
    "multiSelect": false,
    "options": [
      {
        "label": "Workflow Review (Recommended)",
        "description": "Analyze user journey steps, state transitions, and annotated areas. Pipeline: normalize, dedupe (threshold 15), extract 2fps."
      },
      {
        "label": "Animation Analysis",
        "description": "Frame-by-frame timing, easing curves, smoothness. Pipeline: normalize, dedupe (threshold 1), extract 10fps."
      },
      {
        "label": "Page Load Analysis",
        "description": "Progressive rendering, FCP, LCP, layout shifts. Pipeline: normalize, dedupe (threshold 3), progressive extract."
      }
    ]
  }]
}
```

## Template 4: Post-Analysis Cleanup

Use after vision-replay completes its analysis.

```json
{
  "questions": [{
    "question": "Analysis complete. What should I do with the recording file?",
    "header": "Cleanup",
    "multiSelect": false,
    "options": [
      {
        "label": "Keep recording",
        "description": "Leave the WebM file at the current location for future reference."
      },
      {
        "label": "Delete recording",
        "description": "Remove the WebM file and all temporary analysis files to free disk space."
      }
    ]
  }]
}
```
