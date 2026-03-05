<example_report type="page-load-analysis">
<metadata>
**Video:** homepage-load.webm
**Duration:** 4.2s | **Source FPS:** 30 | **Extraction:** Progressive intervals
**Resolution:** 1440x900 | **Frames analyzed:** 14
</metadata>

<summary>
The homepage loads to visual completeness in ~3.5s. First Paint occurs at 150ms (background color), FCP at 350ms (navigation + heading text), and LCP at 1.2s (hero image). Two layout shifts detected: a minor shift at 800ms when the font swap completes, and a significant shift at 1.5s when a banner ad inserts above the fold.
</summary>

<timeline>
| Time | Event | Frame | Observation |
|------|-------|-------|-------------|
| 0ms | White screen | 1 | Blank — no render activity |
| 150ms | First Paint | 2 | Background color (#f5f5f5) rendered, no content |
| 200ms | Skeleton | 3 | Navigation bar skeleton visible, hero area placeholder |
| 350ms | FCP | 4 | Heading text "Welcome to Acme" visible, navigation links rendered |
| 500ms | Font swap | 5 | System font replaced by custom web font — minor layout shift (heading height changes by 4px) |
| 750ms | Hero partial | 6 | Hero image loading progressively (top 30% visible) |
| 1000ms | Hero loaded | 7 | Hero image fully rendered |
| 1200ms | LCP | 8 | Hero image is the largest contentful element — LCP timestamp |
| 1500ms | Layout shift | 9 | **ISSUE:** Banner ad container inserted above hero, pushes all content down ~60px |
| 2000ms | Below fold | 10 | Feature cards section visible on scroll |
| 2500ms | Lazy images | 11-12 | Product thumbnails loading in feature cards |
| 3000ms | Third-party | 13 | Chat widget loaded in bottom-right corner |
| 3500ms | Complete | 14 | Visual completeness — all above-fold content stable |
</timeline>

<key_metrics>
| Metric | Timestamp | Assessment |
|--------|-----------|------------|
| First Paint (FP) | 150ms | Good (<200ms) |
| First Contentful Paint (FCP) | 350ms | Good (<500ms) |
| Largest Contentful Paint (LCP) | 1200ms | Good (<2500ms) |
| Visual Completeness | 3500ms | Acceptable |
| Layout Shifts | 2 detected | Needs improvement |
</key_metrics>

<layout_shifts>
1. **Font swap shift (500ms):** Heading text reflows when custom font loads. Magnitude: ~4px vertical. Impact: minor — barely perceptible.
2. **Ad insertion shift (1500ms):** Banner ad container inserted above the hero section, pushing all content down ~60px. Magnitude: significant. Impact: high — user may lose scroll position or click the wrong element.
</layout_shifts>

<recommendations>
- Reserve space for the banner ad with a fixed-height container (`min-height`) to prevent the layout shift at 1500ms
- Add `font-display: optional` or `font-display: swap` with `size-adjust` to minimize the font swap shift at 500ms
- Preload the hero image with `<link rel="preload" as="image">` to bring LCP below 1000ms
- Defer the chat widget script to avoid blocking the critical rendering path
</recommendations>
</example_report>
