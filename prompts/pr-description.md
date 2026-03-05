# PR: v1.2.0 — Record Browser + Vision Replay improvements

## Summary

- **New skill: Record Browser** — Launch a headed Chrome browser with built-in recording and annotation tools powered by fabric.js. Includes a glassmorphism toolbar with Record/On Action modes, 6 drawing tools (Select, Pen, Line, Rectangle, Circle, Text), configurable arrowheads (plain, end, start, double), 5 AI-optimized color presets, stroke/fill controls, text formatting (4 sizes, BG/BD toggles), keyboard shortcuts, and a post-recording dialog with playback, rename, and save/close. Welcome page launches when no URL is provided.
- **Vision Replay improvements** — Restructured SKILL.md with cleaner XML sections, added structured intake gate with question templates, added `examples/error-handling.md` with common error scenarios and recovery actions, improved routing table with annotation-aware workflow detection, added entry/exit point documentation.
- **Record Browser + Vision Replay integration** — Recordings from Record Browser chain seamlessly into Vision Replay for AI analysis. Annotations (colored shapes drawn during recording) are automatically prioritized during frame analysis.
- **Multi-agent support updated** — AGENTS.md updated with Record Browser instructions matching the corrected SKILL.md workflow.
- **Help skill updated** — Lists both skills with accurate descriptions and current feature set.
- **Test suite expanded** — 41 tests covering vision-replay scripts, record-browser scripts, vendored assets, and page assets.
- **Documentation updated** — README.md reflects all current features, platform support, troubleshooting, and known issues.

## Known Issues

- Chrome for Testing v146 "quit unexpectedly" dialog on close (cosmetic only — does not affect recording, video saving, or workflow). Tracked in #TBD — create a GitHub issue after merge.

## Test plan

- [x] `bash tests/test-scripts.sh` — 41/41 tests passing
- [ ] Launch Record Browser with no URL (welcome page loads)
- [ ] Launch Record Browser with a URL (page loads correctly)
- [ ] Record a workflow with annotations, save, verify HELIX_SAVED output
- [ ] Chain saved recording into Vision Replay analysis
- [ ] Run `/helixlab:setup --check` to verify dependency detection
- [ ] Run `/helixlab:help` to verify help card displays correctly
- [ ] Verify plugin.json and marketplace.json versions are 1.2.0

## Merge strategy

- **Branch pushed with 1 squashed commit** (all development commits squashed locally before push)
- **Squash merge** `feat/screen-recording` → `main` (single commit on main)
- **Commit message:** `feat: add record-browser skill with annotation tools and vision-replay improvements`
- **After merge:** Create GitHub Release `v1.2.0` tagged on main with this PR description as release notes
