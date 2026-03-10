<overview>
Frame rate selection guide for video frame analysis. The right extraction rate depends on what you're analyzing and how fast content changes.
</overview>

<fps_table>
| Use Case | Recommended FPS | Rationale |
|----------|-----------------|-----------|
| Slow CSS transitions (opacity, color, transform over 500ms+) | 5 fps | 200ms intervals capture all meaningful states |
| Standard UI transitions (slide-in, fade, modal, 200-400ms) | 10 fps | 100ms intervals catch start, midpoint, end |
| Fast micro-animations (button press, ripple, hover, <200ms) | 30 fps | 33ms intervals needed for brief intermediate states |
| 60fps smoothness validation (jank detection, frame drops) | 60 fps | Must examine every frame to detect single-frame drops |
| Easing curve analysis (verifying cubic-bezier accuracy) | 30-60 fps | Enough temporal resolution to plot position/opacity curves |
| Scroll-linked animations (parallax, sticky headers) | 10-15 fps | Scroll speed varies; 10fps captures enough for review |
| Loading spinners / looping animations | 10 fps | One full cycle at 10fps is sufficient |
| Page transitions (route changes, view swaps) | 5-10 fps | Content changes are discrete, not continuous |
| User workflow progression (clicking through UI) | 2-3 fps | Only state transitions matter, not animation frames |
| Page load performance (Lighthouse-style) | Progressive | Use extract-progressive.sh for burst-then-taper intervals |
</fps_table>

<rules_of_thumb>
**Choosing fps:**
- Extract at 2x the "meaningful change frequency" of the animation
- If the animation has visible changes every 100ms, extract at 20fps (every 50ms)
- If you need to verify easing math precisely, extract every frame
- If you just need to confirm "it looks right," 10fps is almost always sufficient

**Context window limits:**
- Claude can comfortably analyze 15-20 images per Read tool batch
- At 30+ images, batch across multiple reads using batch-frames.sh
- A 1920x1080 PNG is roughly 5-10MB raw but gets compressed in context
- Scale down to 960px width (via scale_width arg) to fit more frames per batch

**Duration math:**

| FPS | 1s of Video | 3s of Video | 5s of Video |
|-----|-------------|-------------|-------------|
| 5   | 5 frames    | 15 frames   | 25 frames   |
| 10  | 10 frames   | 30 frames   | 50 frames   |
| 30  | 30 frames   | 90 frames   | 150 frames  |
| 60  | 60 frames   | 180 frames  | 300 frames  |
</rules_of_thumb>

<adaptive_strategy>
**When the agent knows the animation:**
The agent should use its knowledge of the animation's duration and complexity to select the fps. A 300ms ease-out sidebar slide needs 10-15fps. A 2-second page transition needs 5fps.

**When the agent doesn't know the animation:**
Start with the contact sheet at 5fps to see the overview, then adjust fps for targeted extraction based on what the contact sheet reveals.

**For page load analysis:**
Always use extract-progressive.sh. The burst-then-taper pattern matches how rendering works: most visual changes happen in the first 500ms.
</adaptive_strategy>
