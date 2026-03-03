<required_reading>
**Read these reference files NOW:**
1. references/fps-strategy.md
</required_reading>

<context>
This workflow analyzes page load recordings using Lighthouse-style progressive frame capture. Use when the user's request involves page load performance, render timing, first contentful paint, layout shifts, or progressive rendering analysis.
</context>

<process>
**Step 1: Review the contact sheet overview**

The universal pipeline has already generated a contact sheet. Review it to understand:
- What page is loading
- Approximate time to visual completeness
- Whether there are obvious layout shifts or blank periods

**Step 2: Extract progressive frames**

Run: `bash "$SCRIPTS_DIR/extract-progressive.sh" <video> <output-dir>`

This captures at Lighthouse-style intervals:
- 0-500ms: every 100ms (catches first paint, FCP)
- 500ms-2s: every 250ms (catches LCP, layout shifts)
- 2s-5s: every 500ms (catches late-loading content)
- 5s+: every 1s (catches lazy-loaded elements)

**Step 3: Sequential frame analysis**

Read frames in chronological order. For each frame, identify:
- **Blank/white screen**: Page hasn't rendered yet
- **First paint**: First non-white pixels appear (background color, navigation skeleton)
- **First contentful paint (FCP)**: First meaningful content visible (text, image, logo)
- **Largest contentful paint (LCP)**: The largest content element becomes visible (hero image, main heading)
- **Layout shifts**: Content moves position between frames (elements pushing each other around)
- **Visual completeness**: All above-fold content is rendered
- **Late-loading elements**: Content that appears after the initial render (lazy images, below-fold content, third-party widgets)

**Step 4: Timeline construction**

Build a timeline from the frame observations:

```
0ms     - White screen
100ms   - Background color rendered
200ms   - Navigation skeleton visible (FP)
300ms   - Hero text visible (FCP)
500ms   - Hero image starts loading (partial)
750ms   - Hero image complete (LCP)
1000ms  - Layout shift: sidebar pushes content right
2000ms  - Below-fold content visible
3000ms  - All lazy images loaded (visual completeness)
```

**Step 5: Write the report**

Report structure:
- Metadata (video info, extraction intervals)
- Timeline (chronological rendering events)
- Key metrics (estimated FP, FCP, LCP, visual completeness timestamps)
- Layout shift events (which elements, magnitude, timing)
- Recommendations (what to optimize, critical rendering path suggestions)

**Step 6: Clean up**

Run: `bash "$SCRIPTS_DIR/cleanup.sh" <frames-dir>`
</process>

<success_criteria>
This workflow is complete when:
- [ ] Progressive frames were extracted
- [ ] Each rendering phase was identified (FP, FCP, LCP)
- [ ] Layout shifts were cataloged with timestamps
- [ ] A timeline was constructed
- [ ] Performance recommendations were provided
- [ ] Extracted frames were cleaned up
</success_criteria>
