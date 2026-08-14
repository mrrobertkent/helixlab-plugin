# Contributing to HelixLab

Thank you for your interest in contributing to HelixLab! This guide covers everything you need to know to submit a contribution.

## Code of Conduct

By participating in this project, you agree to treat all contributors with respect and maintain a welcoming, inclusive environment. Harassment, discrimination, and disrespectful behavior will not be tolerated.

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/mrrobertkent/helixlab-plugin/issues) to avoid duplicates
2. Open a new issue with:
   - A clear, descriptive title
   - Steps to reproduce the problem
   - Expected vs actual behavior
   - Your OS, ffmpeg version (`ffmpeg -version`), and AI agent (Claude Code, Cursor, etc.)

### Suggesting Features

Open an issue with the `enhancement` label describing:
- The problem your feature would solve
- Your proposed solution
- Any alternatives you've considered

### Submitting Changes

1. **Fork** the repository
2. **Create a branch** from `main` (`git checkout -b feat/my-feature`)
3. **Make your changes** following the conventions below
4. **Run the tests** to verify nothing is broken:
   ```bash
   bash tests/test-scripts.sh --check-ffmpeg
   ```
5. **Commit** using [conventional commits](#commit-messages)
6. **Push** your branch and open a **Pull Request** against `main`

## Conventions

### Commit Messages

Use conventional commit prefixes:

```
feat(vision-replay): add scene detection extraction mode
fix(setup): handle missing bc on minimal Ubuntu installs
docs: update README installation instructions
test: add video-info.sh output validation
chore: bump version to 1.0.2
refactor(vision-replay): simplify fps selection logic
```

Scope to the skill name when the change is skill-specific.

### Bash Scripts

All scripts must:

- Start with `#!/bin/bash` and `set -euo pipefail`
- Print usage to stderr and exit 1 when called with no or invalid arguments
- Be executable (`chmod +x`)
- Accept any ffmpeg-supported video format. Never filter by file extension
- Use `/tmp/claude-video-frames/<timestamp>/` for frame output directories
- Include a header comment with script name, purpose, and usage

### Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md` with YAML frontmatter:
   ```yaml
   ---
   name: your-skill-name
   description: >
     What this skill does. When to use it.
   argument-hint: <required-arg> [optional-arg]
   allowed-tools:
     - Bash
     - Read
   ---
   ```
2. Add any scripts to `skills/<skill-name>/scripts/`
3. Add workflow guides to `skills/<skill-name>/workflows/` if applicable
4. Update these files with your skill's instructions:
   - `AGENTS.md` for Cursor, Codex, Kiro, and most agents
   - `GEMINI.md` for Google Gemini
   - `.cursor/rules/`, add a `.mdc` file for automatic Cursor context injection
5. Add your skill to the table in `skills/help/SKILL.md`
6. Add tests to `tests/`
7. Update `README.md` with a section under "Available Skills"

### Skill Structure

```
skills/<skill-name>/
  SKILL.md              # Skill definition (required)
  scripts/              # Bash scripts (if applicable)
  workflows/            # Step-by-step analysis guides (if applicable)
  references/           # Domain knowledge files (if applicable)
  examples/             # Example output reports (if applicable)
```

### Adding a New Plugin

This repository is a marketplace. The root directory is the `helixlab` plugin; every other plugin lives in its own folder under `plugins/`.

1. Create the plugin folder:
   ```
   plugins/<plugin-name>/
     .claude-plugin/plugin.json   # name, version, description, author, license
     skills/<skill-name>/SKILL.md
     README.md                    # what it does, install, usage, versioning
     LICENSE                      # if the plugin carries a different copyright
   ```
2. Add an entry to `.claude-plugin/marketplace.json` with a relative source:
   ```json
   {
     "name": "<plugin-name>",
     "description": "...",
     "version": "1.0.0",
     "source": "./plugins/<plugin-name>",
     "category": "..."
   }
   ```
   Set the version in the plugin's `plugin.json` only, never in the marketplace entry. See [Versioning](#versioning).
3. Bump `metadata.version` in `.claude-plugin/marketplace.json` (MINOR for a new plugin)
4. Add the plugin to the **Plugins** table and the **Repository Layout** block in `README.md`
5. Add it to the marketplace table in `skills/help/SKILL.md`
6. Validate:
   ```bash
   claude plugin validate . --strict
   ```

> [!IMPORTANT]
> When a plugin repackages third-party work, keep the original `LICENSE` and credit the author in the plugin `README.md`.

### Versioning

We use [Semantic Versioning](https://semver.org/) in each plugin's `plugin.json`:

| Change Type | Bump | Example |
|------------|------|---------|
| Bug fixes, doc tweaks | PATCH (0.0.x) | `1.0.0` → `1.0.1` |
| New skills, new scripts, new capabilities | MINOR (0.x.0) | `1.0.1` → `1.1.0` |
| Breaking changes (removed/renamed commands) | MAJOR (x.0.0) | `1.1.0` → `2.0.0` |

A version belongs in **one** place: the plugin's own `.claude-plugin/plugin.json`.

Do not repeat it in the plugin's `marketplace.json` entry. Claude Code resolves a plugin's version from the first source that is set, in this order:

1. `version` in the plugin's `plugin.json`
2. `version` in the plugin's marketplace entry
3. The git commit SHA of the plugin's source

Because `plugin.json` always wins, a version left behind in `marketplace.json` is dead text that can silently contradict the real one. The Claude Code docs state this directly:

> Avoid setting `version` in both `plugin.json` and the marketplace entry. Claude Code always uses the `plugin.json` value without warning, so a stale manifest version can mask a version you set in `marketplace.json`.

Bumping `plugin.json` is what reaches installed users. Note that auto-update is off by default for non-Anthropic marketplaces, so users pick up a release either by enabling auto-update for the marketplace in `/plugin`, or by running `claude plugin update <plugin>`.

Maintainers handle version bumps. Contributors do not need to update the version number in PRs.

### Tagging a release

Tag each release as `{plugin-name}--v{version}`. This is the naming convention Claude Code uses to resolve plugin dependency version constraints, and it lets one marketplace repository host several plugins with independent version lines.

From the plugin directory:

```bash
claude plugin tag --dry-run    # preview
claude plugin tag --push       # create and push
```

The command derives the tag from the manifest, validates the plugin, and refuses on a dirty working tree or an existing tag.

## Pull Request Guidelines

- Keep PRs focused on one feature or fix per PR
- Include a clear description of what changed and why
- Link any related issues
- Ensure all tests pass before requesting review
- Add tests for new scripts

## Testing

Run the full test suite:
```bash
bash tests/test-scripts.sh --check-ffmpeg
```

This validates:
- All scripts exist and are executable
- Scripts exit non-zero when called with no arguments (input validation)
- ffmpeg, ffprobe, and bc are available (with `--check-ffmpeg` flag)

When adding new scripts, ensure they follow the same pattern: exist, are executable, and fail gracefully with no args.

## Questions?

Open an issue or start a discussion on the [repository](https://github.com/mrrobertkent/helixlab-plugin).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
