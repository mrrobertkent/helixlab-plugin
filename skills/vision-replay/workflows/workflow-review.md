<required_reading>
**Read these reference files NOW:**
1. references/fps-strategy.md
</required_reading>

<context>
This workflow reviews screen recordings of user journeys -- clicking through modals, navigating pages, filling forms, and interacting with UI elements. Use when the user's request involves workflow analysis, user story validation, click-through review, or UI state verification. This is NOT for animation analysis -- fps should be low (2-3fps or scene-detect).
</context>

<process>
**Step 1: Review the contact sheet overview**

The universal pipeline has already generated a contact sheet. Review it to understand:
- What application/page is being recorded
- How many distinct UI states/pages are visible
- Whether the recording shows a single flow or multiple interactions

**Step 2: Extract frames at low fps or with scene detection**

Choose the extraction strategy:

**For linear workflows (form filling, wizard steps):**
Run: `bash "$SCRIPTS_DIR/extract-frames.sh" <video> <output-dir> 2`

**For mixed interactions (some pauses, some rapid clicks):**
Run: `bash "$SCRIPTS_DIR/extract-frames.sh" <video> <output-dir> --scene-detect`

Scene detection avoids extracting identical frames during pauses and captures state transitions automatically.

**Step 3: Sequential state analysis**

Read frames in order. For each frame, identify:
- **Current page/view**: What screen is the user on?
- **UI state**: What is the state of interactive elements (buttons, forms, modals)?
- **Cursor position**: Where is the cursor? What is the user about to interact with?
- **Annotations**: Look for bright colored overlays — red, yellow, blue, or green circles, arrows, rectangles, freehand lines, or text drawn by the user during recording. These indicate areas the user wants you to focus on
- **State transition**: What changed from the previous frame? What action caused it?

**Step 4: Build the step map**

Construct a numbered list of steps the user took:

```
Step 1 (0s): Landing page -- user sees hero section
Step 2 (2s): Clicked "Sign Up" button in navigation
Step 3 (3s): Registration form displayed -- email, password fields
Step 4 (6s): Form filled, cursor on "Create Account" button
Step 5 (7s): Loading spinner after form submission
Step 6 (9s): Dashboard displayed -- onboarding checklist visible
```

**Step 5: Identify issues and observations**

Look for:
- **Confusing navigation**: Cursor wandering, looking for buttons
- **Unexpected states**: Error messages, broken layouts, missing content
- **Long waits**: Multiple frames with a loading spinner (time the gap)
- **Annotated areas**: If the user drew annotations (bright colored shapes or text), prioritize analysis of those regions and explain what you observe at each annotated location
- **Missing states**: Steps that should exist but aren't captured (e.g., no confirmation before destructive action)

**Step 6: Write the report**

Follow the structure in examples/workflow-report.md:
- Metadata (video info, extraction params)
- Summary (brief overview of the workflow)
- Steps identified (numbered table with frame refs, timestamps, descriptions)
- Observations (UX issues, cursor patterns, delays)
- Recommendations (if applicable)

**Step 7: Clean up**

Run: `bash "$SCRIPTS_DIR/cleanup.sh" <frames-dir>`
</process>

<success_criteria>
This workflow is complete when:
- [ ] Frames were extracted at low fps or via scene detection
- [ ] All distinct UI states were identified
- [ ] A step map was constructed with timestamps
- [ ] UX issues or observations were noted
- [ ] A structured report was provided
- [ ] Extracted frames were cleaned up
</success_criteria>
