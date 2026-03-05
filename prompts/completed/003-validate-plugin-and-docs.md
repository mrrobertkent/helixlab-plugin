<objective>
Validate the entire HelixLab plugin structure, ensure documentation is complete and accurate, and prepare for PR/merge. This runs AFTER the record-browser and vision-replay skills have been individually fixed and improved.

The plugin is on the `feat/screen-recording` branch and will be merged to `main` via PR.
</objective>

<context>
Read these files first:
- `CLAUDE.md` for project conventions (versioning, commit conventions, plugin structure)
- `.claude-plugin/plugin.json` — plugin manifest
- `.claude-plugin/marketplace.json` — marketplace catalog
- `README.md` — public-facing documentation
- `CONTRIBUTING.md` — contributor guidelines (if exists)
- `skills/record-browser/SKILL.md` — corrected skill (verify fixes applied)
- `skills/vision-replay/SKILL.md` — improved skill (verify fixes applied)
- `skills/help/SKILL.md` — help card
- `skills/setup/SKILL.md` — setup skill
- `AGENTS.md` — multi-agent configuration
- `tests/test-scripts.sh` — test suite

**Official plugin directory structure (from Anthropic docs):**
```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # Required: name field minimum
├── skills/                  # Auto-discovered skill directories
│   └── skill-name/
│       ├── SKILL.md         # Required per skill
│       ├── scripts/
│       ├── references/
│       ├── examples/
│       └── assets/
├── commands/                # Slash commands
├── agents/                  # Subagent definitions
├── hooks/                   # Hook configurations
└── scripts/                 # Plugin-level helpers
```

**Version management:**
- plugin.json and marketplace.json versions MUST be in sync
- Current version on disk: 1.2.0 (verify this is correct for the changes)

**Known issue to document:**
Chrome for Testing v146 shows a "quit unexpectedly" dialog when the browser is closed. Cosmetic only — does not affect recording, video saving, or workflow. Related to ARM64 Chrome v146 bugs.
</context>

<requirements>

1. **Validate plugin structure:**
   - Verify `.claude-plugin/plugin.json` exists and has required `name` field
   - Verify plugin.json has: name, version, description, author, repository, license, keywords
   - Verify `.claude-plugin/marketplace.json` exists and version matches plugin.json
   - Verify all skill directories have a SKILL.md
   - Verify no orphaned directories or files that don't belong

2. **Validate record-browser fixes were applied (read-only check):**
   - Confirm `AskUserQuestion` is NOT in `allowed-tools`
   - Confirm question templates have no `markdown`, `annotations`, or `notes` fields
   - Confirm `examples/error-handling.md` exists
   - Confirm SKILL.md is under 500 lines
   - If any check fails, report it — do NOT fix it here

3. **Validate vision-replay improvements were applied (read-only check):**
   - Confirm `examples/error-handling.md` exists
   - Confirm SKILL.md is under 500 lines
   - Confirm XML structure in body
   - If any check fails, report it — do NOT fix it here

4. **Update README.md:**
   - Ensure the Record Browser section accurately reflects current features:
     - 6 drawing tools (Select, Pen, Line, Rectangle, Circle, Text)
     - Lines and arrows (plain line, arrow end, arrow start, double arrow)
     - 5 color presets (red, yellow, blue, green, white)
     - Stroke and fill (4 widths, semi-transparent fill toggle)
     - Text formatting (4 sizes, BG toggle, BD toggle)
     - Keyboard shortcuts
     - Post-recording dialog with playback, rename, save/close
     - Welcome page
   - Add a "Known Issues" section at the bottom of the Record Browser details:
     ```markdown
     > [!NOTE]
     > **Known Issue:** Chrome for Testing v146 may show a "quit unexpectedly" dialog when the browser is closed. This is cosmetic and does not affect recording or video saving. See [#issue-number] for tracking.
     ```
     (Use placeholder `[#issue-number]` — the actual issue will be created after PR merge)
   - Ensure the Vision Replay section is accurate
   - Ensure installation instructions are current
   - Ensure the prerequisites section is accurate

5. **Update help skill:**
   - Read `skills/help/SKILL.md`
   - Ensure it lists both skills with accurate descriptions
   - Ensure it reflects the current feature set

6. **Update AGENTS.md:**
   - Read `AGENTS.md`
   - Ensure record-browser instructions match the corrected SKILL.md workflow
   - Ensure vision-replay instructions are current
   - If there are references to AskUserQuestion in allowed-tools, remove them

7. **Run tests:**
   - Execute `bash tests/test-scripts.sh` and report results
   - If tests fail, report which tests failed and why — do NOT fix them in this prompt

8. **Version check:**
   - Read both plugin.json and marketplace.json
   - Verify versions are in sync
   - The version should already be 1.2.0 — if not, note it but do NOT change it (version bumps are done manually before final commit)

9. **Prepare PR description draft:**
   - Create a file at `prompts/pr-description.md` with a draft PR description including:
     - Summary of all changes (record-browser skill, vision-replay improvements, docs)
     - Known issues section (Chrome closure crash)
     - Test results
     - Note that a GitHub issue for the Chrome bug should be created simultaneously with PR merge
   - Format using the PR template:
     ```markdown
     ## Summary
     - bullet points

     ## Known Issues
     - Chrome for Testing v146 "quit unexpectedly" dialog on close (cosmetic, tracked in #TBD)

     ## Test plan
     - [ ] Test items
     ```
</requirements>

<constraints>
- Do NOT modify skills/record-browser/ or skills/vision-replay/ — those are handled by separate prompts. Only READ them for validation.
- Do NOT bump the version — that's done manually before final commit
- Do NOT create git commits — just prepare the files
- Do NOT push to remote or create PRs
- Do NOT create GitHub issues yet — that happens after PR merge
- Do NOT add AI attribution or co-authored-by lines
</constraints>

<verification>
After all changes:
1. Confirm plugin.json and marketplace.json versions match
2. Confirm README.md has updated Record Browser features and Known Issues
3. Confirm help skill lists both skills accurately
4. Confirm AGENTS.md has no AskUserQuestion in allowed-tools references
5. Confirm test results are reported
6. Confirm `prompts/pr-description.md` exists with draft PR description
7. Confirm all validation checks for record-browser and vision-replay are reported
</verification>

<success_criteria>
- Plugin structure matches Anthropic's official guidelines
- README accurately reflects all current features and known issues
- Help skill is current
- AGENTS.md is consistent with skill definitions
- Tests pass (or failures are documented)
- PR description is drafted and ready
- All validation checks for both skills pass (or failures are clearly reported)
</success_criteria>
