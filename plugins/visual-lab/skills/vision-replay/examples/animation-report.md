<example_report type="animation-analysis">
<metadata>
**Video:** sidebar-slide-in.mp4
**Duration:** 0.4s | **Source FPS:** 60 | **Extraction FPS:** 30
**Resolution:** 1920x1080 | **Frames analyzed:** 12
</metadata>

<summary>
The sidebar slide-in animation has correct easing (ease-out matches spec) but exhibits a 1-frame stutter at the 200ms mark where the sidebar position jumps ~8px. The opacity fade-in is not synchronized with the slide -- opacity reaches 1.0 approximately 50ms before the slide completes.
</summary>

<frame_analysis>
| Frame | Time | Observation |
|-------|------|-------------|
| 1 | 0ms | Sidebar off-screen (x: -300px), opacity: 0 |
| 3 | 67ms | Slide begins, x: -240px, opacity: 0.15. Easing curve looks correct (slow start). |
| 5 | 133ms | x: -150px, opacity: 0.45. Acceleration matches ease-out. |
| 6 | 167ms | x: -100px, opacity: 0.6. Smooth progression. |
| 7 | 200ms | **ISSUE:** x: -58px (expected ~-65px). Position jump of ~8px vs previous frame delta. Possible dropped frame or timing glitch. |
| 8 | 233ms | x: -30px, opacity: 0.85. Back to smooth progression. |
| 10 | 300ms | x: -8px, opacity: 1.0. **NOTE:** Opacity reached 1.0 but slide not yet complete. |
| 12 | 367ms | x: 0px (final position), opacity: 1.0. Animation complete. |
</frame_analysis>

<issues>
1. **Position stutter at 200ms (frame 7):** The sidebar x-position jumps ~8px more than expected. This could indicate a dropped frame in the browser, a JavaScript main-thread block, or an incorrect keyframe in the animation definition. Recommend checking for layout thrashing near this timestamp.

2. **Opacity/slide desynchronization:** Opacity reaches 1.0 at ~300ms while the slide completes at ~367ms. If these are separate CSS properties, check that both use the same duration and easing. If they're a single transform, this suggests the opacity animation is shorter (300ms vs 400ms).
</issues>

<recommendations>
- Add `will-change: transform, opacity` to the sidebar element to promote to compositor layer
- Verify both transform and opacity use identical `transition` duration values
- Check for expensive layout operations (DOM reads) during the animation window
</recommendations>
</example_report>
