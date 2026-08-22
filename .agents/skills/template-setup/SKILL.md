---
name: template-setup
description: One-time setup when starting a real project from this template, plus the repo's own plumbing. Use when stripping the worked example, replacing the placeholder metadata in index.html, rewriting README.md, adding favicons, wiring the git pre-commit hook, changing the CI workflow or the pinned Bun version, configuring Renovate, or installing and updating the vendored agent skills in .agents/skills and .claude/skills.
---

# Template setup

## Starting a new project

1. Delete `src/features/todos/` and `src/routes/todos/`, and point `src/routes/index.tsx` at your
   own page instead of redirecting to `/todos`. The feature is a worked example, not a dependency;
   nothing else imports it.
2. In `index.html`, replace the `https://example.com/` placeholders on `og:url` and `og:image`
   with real absolute URLs. Scrapers discard relative OG URLs, and an empty `content=""` is
   worse than an absent tag.
3. Keep the `theme-color` meta in `index.html` in step with the light `--background` in
   `src/styles/index.css`. It is hand-mirrored hex and drifts silently.
4. Rewrite `README.md`. Replace `public/icon.svg` with your own mark, and add real
   `favicon.ico` and `apple-touch-icon.png` beside it.
5. Add each config value to `envSchema` in `src/lib/env.ts` **and** to `.env.example`.
6. Install the Renovate GitHub App if you want `renovate.json` to do anything; until then it is
   inert. Check `.bun-version` matches the Bun you actually run.

## Git hooks

`bun install` points `core.hooksPath` at `.githooks/`. The pre-commit hook formats and lint-fixes
staged files, re-stages the fixes, then runs `tsc -b`. It aborts on unfixable lint errors, type
errors, or a partially staged file. Bypass with `git commit --no-verify`.

Its filter covers everything oxfmt reads, YAML and JSON included, not just what oxlint reads:
`bun run check` fails on a badly formatted `ci.yml` exactly as it fails on a badly formatted
component, so the hook has to reach the same files the gate does.

## CI and the toolchain

`.github/workflows/ci.yml` runs `bun run check` then `bun run build` on every push to `main` and
every pull request. It deliberately runs the same command a person runs, so a green local run is
the answer rather than a rehearsal, and a red run reproduces in one line. Adding a step that CI
runs and a laptop cannot is how the two drift.

Bun's version lives in `.bun-version`, which `oven-sh/setup-bun` reads and `package.json`'s
`engines` field repeats. There is no `.nvmrc`: Node is not the runtime here. There is no
`packageManager` field either, because corepack does not manage Bun and the claim in the README
that the repo is package-manager agnostic should stay true.

`renovate.json` groups what has to move together - the TanStack packages, and oxlint with its
formatter and type-aware binary - and automerges devDependency minors once CI is green. That last
part is only safe because CI exists.

## Agent skills

`.agents/skills/` is the shared skills directory most agents read, and `.claude/skills/` is what
Claude Code reads. Two kinds of skill live there and they are maintained differently.

**First-party.** `feature-development`, `forms`, `styling-and-ui`, `testing`, `configuration`,
`lint-rules` and this one are written for this repo. Each is a real directory under
`.agents/skills/`, and `.claude/skills/<name>` is a symlink to it, so there is one file to edit
and no copy to drift. Editing one is editing both. A new one is a directory plus a symlink:

```sh
mkdir -p .agents/skills/<name>
ln -s ../../.agents/skills/<name> .claude/skills/<name>
```

Keep the frontmatter to `name` and `description`, the fields the
[Agent Skills](https://agentskills.io) spec defines. Claude Code accepts more, but anything extra
is Claude-only, and the point of the shared directory is that the guidance does not fork per tool.
Write the `description` around the work, not the topic: it is the only part loaded before the
skill is invoked, so it has to say enough for an agent to know the skill applies. Then add a row
to the guides table in `AGENTS.md`, which is how agents without skill support find the file.

**Vendored.** The `jotai` skill from `jotaijs/jotai-skills` is committed so every contributor gets
the same guidance regardless of which agent they run. It is a real copy in both directories rather
than a symlink, because that is what the installer writes, and `skills-lock.json` pins the
version. Treat it as generated: a reinstall overwrites hand edits. Install for another agent with
`bunx skills add jotaijs/jotai-skills --copy -y --skill jotai --agent <name>`, and add any new
agent directory to `ignorePatterns` in `.oxfmtrc.jsonc`.
