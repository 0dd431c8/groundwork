---
description: Vite + React + TanStack Router boilerplate. Bun is the package manager and script runner.
globs: '*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json'
alwaysApply: false
---

Vite + React 19 + TanStack Router single-page app. Bun is the package manager and script
runner; it is not the server or the bundler.

## Bun

- `bun install` instead of `npm install` / `yarn install` / `pnpm install`
- `bun run <script>` instead of `npm run <script>`
- `bunx <package>` instead of `npx <package>`
- `bun <file>` instead of `node <file>` or `ts-node <file>` for one-off scripts
- Bun loads `.env` automatically, so don't add `dotenv`
- Vite only exposes env vars prefixed `VITE_`, via `import.meta.env`

## Layout

- `index.html` is the Vite entry. It hard-codes `class="dark"` on `<html>`.
- `src/main.tsx` mounts React and wires the router and the React Query client.
- `src/routes/` holds TanStack Router file-based routes. `src/routeTree.gen.ts` is generated
  by `@tanstack/router-plugin` and committed; never edit it by hand.
- `src/lib/` holds hand-written app modules (`router.ts`, `query-client.ts`, `utils.ts`).
- `src/styles/index.css` is the single stylesheet: Tailwind v4 import, theme tokens for
  `:root` and `.dark`, and `@layer base` rules.

## Build and tooling

- `bun run dev` starts Vite. `bun run build` runs `tsc` then `vite build`.
- Tailwind v4 is configured through `@tailwindcss/vite`, not a `tailwind.config.js`. Theme
  tokens live in `@theme inline` in `src/styles/index.css`.
- Vendor chunking is set in `vite.config.ts` under `build.rolldownOptions.output.codeSplitting`.
  Groups match in order and the last one is a `node_modules` catch-all, so new packages land
  in a long-lived vendor chunk rather than in route chunks.
- Path alias `@/*` maps to `src/*`, declared in both `tsconfig.json` and `vite.config.ts`.

## shadcn components

`src/components/ui/` is shadcn CLI output (`base-sera` style, `taupe` base color, config in
`components.json`). Treat it as vendored:

- Add components with `bunx shadcn@latest add <name>`; it installs any missing deps itself.
- Don't hand-edit files there. `bunx shadcn add` overwrites them, and upstream formatting
  differs from this repo's on purpose.
- `.oxfmtrc.jsonc` skips the directory for formatting. `.oxlintrc.jsonc` still lints it, with
  only the `useEffect` import ban lifted.

## Git hooks

`bun install` points `core.hooksPath` at `.githooks/`. The pre-commit hook formats (`oxfmt`)
and lint-fixes (`oxlint --fix`) staged JS/TS/CSS files, re-stages the fixes, then runs
`tsc --noEmit`. It aborts on unfixable lint errors, type errors, or a partially staged file.
Bypass with `git commit --no-verify`.

## Lint rules worth knowing

`.oxlintrc.jsonc` sets `correctness` to error and adds:

- `useEffect` is banned from `react` imports. Derive state or use event handlers. If genuinely
  unavoidable, add `// oxlint-disable-next-line no-restricted-imports` with a justification.
- `max-lines` 400, `max-lines-per-function` 40, `complexity` 15. Test files are exempt.

## Testing

`package.json` declares `"test": "vitest"` and `"e2e": "playwright test"`, but neither
`vitest` nor `@playwright/test` is installed yet, so both scripts currently fail. Install the
one you need before writing tests, and prefer it over `bun test`: the app code imports
`.tsx`, CSS, and the `@/*` alias, which need the Vite transform pipeline that Vitest shares
with the dev server.
