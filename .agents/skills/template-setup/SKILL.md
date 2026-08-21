---
name: template-setup
description: One-time setup when starting a real project from this template, plus the repo's own plumbing. Use when stripping the worked example, replacing the placeholder metadata in index.html, rewriting README.md, adding favicons, wiring the git pre-commit hook, or installing and updating the vendored agent skills in .agents/skills and .claude/skills.
---

# Template setup

## Starting a new project

1. Delete `src/features/todos/` and replace the body of `src/routes/index.tsx`. It is a
   worked example, not a dependency; nothing else imports it.
2. In `index.html`, replace the `https://example.com/` placeholders on `og:url` and `og:image`
   with real absolute URLs. Scrapers discard relative OG URLs, and an empty `content=""` is
   worse than an absent tag.
3. Keep the `theme-color` meta in `index.html` in step with the light `--background` in
   `src/styles/index.css`. It is hand-mirrored hex and drifts silently.
4. Rewrite `README.md`. Add real `favicon.ico` and `apple-touch-icon.png` to `public/`.
5. Add each config value to `envSchema` in `src/lib/env.ts` **and** to `.env.example`.

## Git hooks

`bun install` points `core.hooksPath` at `.githooks/`. The pre-commit hook formats and lint-fixes
staged JS/TS/CSS files, re-stages the fixes, then runs `tsc -b`. It aborts on unfixable lint
errors, type errors, or a partially staged file. Bypass with `git commit --no-verify`.

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
