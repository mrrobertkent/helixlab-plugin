<objective>
Review and improve the vision-replay skill to ensure it follows the same quality standards as the corrected record-browser skill. Add self-healing error handling examples, verify AskUserQuestion usage (if any), and ensure the skill works both standalone and when chained from record-browser.

This skill is part of the HelixLab Claude Code plugin. It extracts frames from video files using ffmpeg and analyzes them with AI vision capabilities.
</objective>

<context>
Read these files to understand the current state:
- `CLAUDE.md` for project conventions
- `skills/vision-replay/SKILL.md` — the skill definition to review and improve
- All files in `skills/vision-replay/scripts/` — the bash scripts
- All files in `skills/vision-replay/workflows/` — the analysis workflow guides
- All files in `skills/vision-replay/references/` — reference material
- `skills/record-browser/SKILL.md` — reference for the corrected patterns (read-only, do not modify)
- `skills/record-browser/examples/error-handling.md` — reference for error handling pattern (read-only, do not modify)

**AskUserQuestion confirmed schema (apply if vision-replay uses it):**
```
questions: array (1-4 questions, required)
  question: string (required)
  header: string (max 12 characters, required)
  multiSelect: boolean (must be explicit, required)
  options: array (2-4 options, required)
    label: string (1-5 words, required)
    description: string (required)
```
- "Other" option added automatically — do NOT include manually
- No `annotations`, `notes`, or `markdown` fields exist
- If `AskUserQuestion` is in the `allowed-tools` frontmatter, REMOVE it (causes auto-resolve bug)
- 60-second timeout: if user doesn't respond, inform them and re-ask

**SKILL.md conventions:**
- Keep under 500 lines
- YAML frontmatter with `name` and `description`
- XML tags in the body (project convention — retain or add)
- References, templates, examples in subdirectories
</context>

<requirements>

1. **Audit SKILL.md frontmatter:**
   - If `AskUserQuestion` is in `allowed-tools`, remove it
   - Verify `name` and `description` are present and descriptive
   - Verify `description` includes when to use the skill

2. **Audit SKILL.md body:**
   - Verify the workflow is clear and has defined entry/exit points
   - Verify the skill works when invoked standalone (user provides a video path)
   - Verify the skill works when chained from record-browser (receiving a path from HELIX_SAVED)
   - If there are AskUserQuestion calls, add timeout handling: "If AskUserQuestion returns empty or no response, inform the user and re-ask"
   - Verify SKILL.md is under 500 lines
   - Ensure XML tags are used in the body (add if missing, following the same pattern as record-browser)

3. **Audit question templates (if any exist in references/):**
   - Apply the same schema fixes as record-browser: no `markdown`, `annotations`, or `notes` fields
   - Ensure `header` values max 12 chars, `multiSelect` explicit, 2-4 options per question

4. **Audit scripts for robustness:**
   - Read each script in `skills/vision-replay/scripts/`
   - Verify they all use `set -euo pipefail`
   - Verify they validate inputs and print usage on bad args
   - Verify they handle missing ffmpeg/ffprobe/bc gracefully
   - Do NOT modify scripts unless there are clear bugs — note any issues for the agent to report

5. **Create `examples/error-handling.md`:**
   - Create at `skills/vision-replay/examples/error-handling.md`
   - Include examples of common error scenarios and recovery:
     a. ffmpeg not installed or not in PATH
     b. ffprobe returns unexpected output
     c. Input video file doesn't exist or is corrupted
     d. Disk full during frame extraction
     e. Unsupported video codec
     f. Dedupe threshold too aggressive (removes all frames)
     g. Contact sheet generation fails (too many/few frames)
     h. Video is too short (< 1 second) or too long (> 30 minutes)
   - For each: describe the error, what to tell the user, and recovery action
   - Reference this file in SKILL.md

6. **Verify workflow files:**
   - Read all files in `skills/vision-replay/workflows/`
   - Ensure they are consistent with SKILL.md instructions
   - Ensure they reference the correct scripts and arguments
   - Note any discrepancies but do NOT modify workflow files unless there are clear errors

7. **Verify entry/exit points:**
   - Standalone entry: user invokes `/helixlab:vision-replay <video-path>`
   - Chained entry: record-browser passes path via HELIX_SAVED
   - Exit points: analysis complete (with cleanup options), user cancels, error occurs
   - Ensure each exit point is handled gracefully in SKILL.md
</requirements>

<constraints>
- Do NOT modify any files in `skills/record-browser/` — that skill is handled by a separate prompt
- Do NOT modify scripts unless there are clear bugs (prefer noting issues over changing)
- Do NOT remove XML tags — retain or add XML structure
- Do NOT add AI attribution or co-authored-by lines
- Prefer minimal changes — improve, don't rewrite
</constraints>

<verification>
After all changes:
1. Confirm `AskUserQuestion` is NOT in `allowed-tools` (if it was there)
2. Confirm SKILL.md is under 500 lines (run `wc -l`)
3. Confirm SKILL.md uses XML tags in the body
4. Confirm `examples/error-handling.md` exists with all 8 scenarios
5. Confirm error-handling.md is referenced in SKILL.md
6. Confirm all scripts have `set -euo pipefail` and input validation
7. Confirm entry/exit points are documented in SKILL.md
8. Confirm any question templates match the AskUserQuestion schema
9. List any script issues found (without modifying them)
</verification>

<success_criteria>
- Vision-replay skill follows same quality standards as corrected record-browser
- Self-healing error handling examples exist and are referenced
- AskUserQuestion integration is correct (if used)
- Skill works both standalone and chained from record-browser
- SKILL.md is clean, under 500 lines, with XML structure
</success_criteria>
