<required_reading>
**Read these reference files NOW:**
1. references/fps-strategy.md
2. references/ffmpeg-recipes.md
</required_reading>

<context>
This workflow analyzes CSS/JS animations frame-by-frame for timing accuracy, easing fidelity, smoothness, and visual correctness. Use when the user's request involves animation validation, timing verification, easing curve analysis, frame drop detection, or visual comparison between a reference and implementation.
</context>

<process>
**Step 1: Review the contact sheet overview**

The universal pipeline has already generated a contact sheet. Review it to understand:
- What animation is playing (what moves, what changes)
- Approximate duration and speed
- Whether the initial fps estimate needs adjustment

**Step 2: Determine extraction fps**

Based on the contact sheet and the user's analysis request:
- If you know the animation's duration, use the fps-strategy.md table
- If the animation is fast (<200ms), use 30-60fps
- If the animation is standard (200-500ms), use 10-15fps
- If the animation is slow (>500ms), use 5-10fps
- When in doubt, start at 10fps -- you can re-extract at higher fps if needed

**Step 3: Extract targeted frames**

Run: `scripts/extract-frames.sh <video> <output-dir> <fps> [start] [duration] [crop]`

Consider using:
- Time range args to focus on the animation portion only
- Crop args to isolate the animated element (reduces noise)
- Scale width to 960 if analyzing many frames

**Step 4: Batch if needed**

If more than 20 frames were extracted:
Run: `scripts/batch-frames.sh <frames-dir> 15`

Read batches sequentially. Maintain analysis continuity across batches.

**Step 5: Frame-by-frame analysis**

For each frame (or batch of frames), examine:
- **Position**: Element x/y coordinates relative to expected path
- **Opacity**: Transparency values at each frame vs expected
- **Color**: Background, foreground, border colors at each frame
- **Transform**: Scale, rotation, skew values
- **Timing**: Frame spacing (are frame-to-frame deltas consistent with the easing curve?)
- **Drops**: Are any frames identical to the previous? (indicates dropped frame)

**Step 6: Comparison mode (if two videos)**

If the user provided a reference video and an implementation video:
1. Extract frames from both at the same fps
2. Run: `scripts/diff-frames.sh <ref-dir> <impl-dir> <diff-dir>`
3. Read the diff frames -- each shows reference on left, implementation on right
4. Note per-frame differences in timing, position, easing, color

**Step 7: Write the report**

Follow the structure in examples/animation-report.md:
- Metadata (video info, extraction params)
- Summary (1-2 paragraph overview of findings)
- Frame analysis table (key frames with observations)
- Issues found (with frame references)
- Recommendations

**Step 8: Clean up**

Run: `scripts/cleanup.sh <frames-dir>`
</process>

<success_criteria>
This workflow is complete when:
- [ ] Contact sheet was reviewed and fps was determined
- [ ] Frames were extracted at the appropriate rate
- [ ] Each frame was examined for the relevant visual properties
- [ ] Issues were identified with specific frame references
- [ ] A structured report was provided to the user
- [ ] Extracted frames were cleaned up
</success_criteria>
