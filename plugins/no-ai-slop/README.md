# No AI Slop

> Removes 20+ patterns of AI slop from any piece of writing while preserving the writer's voice

A Claude Code plugin that turns Claude into a sharp human editor. It cuts the phrasing that makes text read as machine-generated, and it leaves the parts that make the writing sound like a person.

Part of the [HelixLab](https://github.com/mrrobertkent/helixlab-plugin) marketplace.

---

## Attribution

This plugin packages the `no-ai-slop` skill by [Peter Yang](https://creatoreconomy.so), originally published at [petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop) under the MIT License.

The skill content in `skills/no-ai-slop/` is unmodified. HelixLab repackages it as a Claude Code plugin so it can be installed and version-tracked through the HelixLab marketplace. Copyright remains with Peter Yang; see [LICENSE](LICENSE).

If you find it useful, star the [original repository](https://github.com/petergyang/no-ai-slop).

---

## Installation

Add the HelixLab marketplace and install the plugin:

```
/plugin marketplace add https://github.com/mrrobertkent/helixlab-plugin
/plugin install no-ai-slop@helixlab
```

> [!TIP]
> Use `--scope project` to share the plugin with teammates through your repository's Git history:
> ```
> /plugin install no-ai-slop@helixlab --scope project
> ```

No dependencies. The plugin is a single skill file plus its evaluation checklist.

---

## Usage

Invoke the skill directly, or just paste a draft and ask Claude to clean it up:

```
/no-ai-slop:no-ai-slop
```

The skill has two modes.

| Mode | Trigger | Output |
|------|---------|--------|
| Edit (default) | "Clean this up", "make this less AI-sounding", or a pasted draft | The edited draft plus a **What changed** section |
| Detect | "Is this AI slop?", "audit this", "flag the patterns" | Each pattern found, the quoted line, and a short fix. No rewrite. |

### Examples

Edit a draft:

```
/no-ai-slop:no-ai-slop

Here's the thing: our new dashboard doesn't just show data. It empowers
teams to delve into their metrics. The best part: it learns. This is huge.
```

Audit without rewriting:

```
Is this slop? Scan it and name the patterns, don't rewrite it.

[paste draft]
```

Chain it after your own writing:

```
Draft a release note for v2.1, then run it through /no-ai-slop:no-ai-slop
```

---

## What it removes

**Banned words.** delve, foster, leverage, utilize, facilitate, empower, streamline, robust, cutting-edge, paradigm shift, game changer, tapestry, realm, beacon, multifaceted, meticulous, intricate, paramount, transformative, elevate, embark, supercharge, harness, ever-evolving.

**Patterns**, with the fix applied in each case:

| Pattern | Example | Fix |
|---------|---------|-----|
| Binary contrasts | "It's not X. It's Y." | State Y directly |
| Throat-clearing openers | "Here's the thing," "Let me be clear" | Cut, state the point |
| Faux-insight setups | "What nobody tells you," "The part everyone misses" | Make the claim stand alone |
| Colon reveals | "The best part: it learns." | Rewrite as a plain sentence |
| Superficial analysis | "...highlighting the team's commitment" | Replace with the actual consequence |
| Importance puffery | "marks a pivotal moment" | State the fact, let the reader judge |
| Interpretive metadiscourse | "That last part matters more than it sounds" | Delete, or replace with support |
| Weasel attribution | "Experts agree," "studies show" | Name the source or cut the claim |
| Synonym cycling | agent → assistant → tool for one thing | Repeat the clear word |
| Negative listing | "Not a X. Not a Y. A Z." | Say Z |
| Dramatic fragmentation | "That's it. That's the whole thing." | Complete sentences |
| Rhetorical setups | "What if I told you...", "Plot twist:" | Drop and make the point |
| Fake-profound kickers | "The future isn't coming. It's already here." | Delete, end on the last concrete line |
| Summary-recap endings | "In conclusion," "Ultimately," | End on a takeaway or next action |
| Formatting slop | Emoji headings, decorative bold, bullets that should be prose | Format follows content |
| Em dash overuse | Dashes as a rhythm crutch | None in short copy, 1-2 in long drafts |

Full list, with the editing principles and the portability test, is in [`skills/no-ai-slop/SKILL.md`](skills/no-ai-slop/SKILL.md).

---

## What it protects

The skill makes the minimum effective edit. It is built to keep:

- Your vocabulary, cadence, bluntness, humor, and digressions
- Strong opinions, profanity, self-interruptions, and honest admissions
- "I think," "maybe," and "to be honest" when they carry real uncertainty
- Specific facts, numbers, names, dates, and mechanisms
- Your structure, unless the structure is hurting the piece

It will not invent claims, examples, statistics, or opinions. If a source is missing, it asks instead of filling one in.

---

## How the quality check works

After every edit the skill runs itself against [`skills/no-ai-slop/eval.md`](skills/no-ai-slop/eval.md), a 27-point checklist covering editing principles, banned words, patterns, and a final read. Any failed check sends the draft back for another pass before you see it. No second agent is required.

---

## Components

| Path | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin manifest |
| `skills/no-ai-slop/SKILL.md` | Skill definition: principles, banned words, patterns, workflow |
| `skills/no-ai-slop/eval.md` | Self-check the skill runs before returning a draft |

---

## Versioning

This plugin follows [Semantic Versioning](https://semver.org/). The version is declared once, in `.claude-plugin/plugin.json`, and each release is tagged `no-ai-slop--v{version}`.

| Change | Bump |
|--------|------|
| Wording fixes, doc tweaks | PATCH |
| New patterns, new eval checks, new modes | MINOR |
| Renamed skill or removed capability | MAJOR |

---

## License

[MIT](LICENSE). Copyright (c) 2026 Peter Yang.

Packaging and documentation by Robert Kent Jr. for HelixLab.
