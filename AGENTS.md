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
- `src/lib/` holds hand-written app modules (`router.ts`, `query-client.ts`, `store.ts`,
  `utils.ts`).
- `src/styles/index.css` is the single stylesheet: Tailwind v4 import, theme tokens for
  `:root` and `.dark`, and `@layer base` rules.

## State

Jotai owns client state; React Query stays in charge of server state. Don't reach for React
Context to share values, and don't lift state up through props just to share it.

- `src/lib/store.ts` exports an explicit `createStore()` rather than relying on Jotai's
  implicit default store, and `src/main.tsx` wraps the router in `<Provider store={store}>`.
  The explicit store is what lets tests render against a fresh one.
- Atoms live in `src/lib/`, in the same module as the pure helpers they use, and are named
  with an `Atom` suffix. `src/lib/counter.ts` is the worked example of all three shapes:
  a primitive atom (`countAtom`), read-only derived atoms (`canDecrementAtom`,
  `canIncrementAtom`), and a write-only action atom (`stepAtom`) that owns the update rule.
- Derived atoms are the answer to the `useEffect` ban below. A value computed from other
  state is an `atom((get) => ...)`, never state you keep in sync by hand.
- Read with `useAtomValue`, write with `useSetAtom`. `useAtom` only when a component genuinely
  needs both, since it subscribes the component to the value.
- Persist with `atomWithStorage` from `jotai/utils`. Pass `{ getOnInit: true }` or the first
  render shows the initial value and corrects itself on mount.
- Deliberately not installed: `jotai-devtools` (drags in the whole Mantine UI kit),
  `jotai-babel` (`@vitejs/plugin-react` v6 is Oxc-based and dropped its `babel` option, so it
  would cost `@rolldown/plugin-babel` plus five more packages and a second transform pass over
  every file), and `jotai-tanstack-query` (React Query is already wired directly).

## Build and tooling

- `bun run dev` starts Vite. `bun run build` runs `tsc -b` then `vite build`.
- Two TypeScript projects: `tsconfig.json` covers `src`, and `tsconfig.node.json` (which
  extends it) covers `*.config.ts` and `.githooks/`. Build mode is what checks both, so use
  `tsc -b`; plain `tsc` silently skips the referenced project. `tsconfig.node.json` must
  emit (TS7 forbids `noEmit` on a referenced project), so it emits declarations only, into
  `node_modules/.tmp/`. Tooling files can't import from `src`: a composite project has to
  list every input file, so `@/...` there fails with TS6307.
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

## Agent skills

The `jotai` skill from `jotaijs/jotai-skills` is committed so every contributor gets the same
Jotai guidance regardless of which agent they run. Treat it as vendored, like
`src/components/ui`:

- `.agents/skills/jotai/` is the shared copy most agents read, including Claude Code, Codex,
  Cursor, OpenCode and Warp. Windsurf and Roo insist on their own directories, so
  `.windsurf/skills/` and `.roo/skills/` hold identical copies, as does `.claude/skills/`.
- Install for another agent with
  `bunx skills add jotaijs/jotai-skills --copy -y --skill jotai --agent <name> ...`. The flag
  is variadic, so separate names with spaces, not commas. `bunx skills add --help` lists all 71
  valid agent names.
- Add any new agent directory to `ignorePatterns` in `.oxfmtrc.jsonc`. Upstream formatting
  differs from this repo's, and the pre-commit hook would otherwise rewrite the files.
- `skills-lock.json` pins the resolved skill. `bunx skills update` upgrades it; don't hand-edit
  the skill files, since a reinstall overwrites them.

## Git hooks

`bun install` points `core.hooksPath` at `.githooks/`. The pre-commit hook formats (`oxfmt`)
and lint-fixes (`oxlint --fix`) staged JS/TS/CSS files, re-stages the fixes, then runs
`tsc -b`. It aborts on unfixable lint errors, type errors, or a partially staged file.
Bypass with `git commit --no-verify`.

## Lint rules worth knowing

`.oxlintrc.jsonc` sets `correctness` to error and adds:

- `useEffect` is banned from `react` imports. Derive state or use event handlers. If genuinely
  unavoidable, add `// oxlint-disable-next-line no-restricted-imports` with a justification.
- `max-lines` 400, `max-lines-per-function` 40, `complexity` 15. Test files are exempt.

## Testing

Vitest with jsdom and Testing Library. Prefer it over `bun test`: the app code imports
`.tsx`, CSS, and the `@/*` alias, which need the Vite transform pipeline that Vitest shares
with the dev server.

- `bun run test` (watch), `bun run test:ui` (`@vitest/ui` dashboard), `bun run test:coverage`
  (v8 provider, report in `coverage/`). CI should call `bunx vitest run`.
- Tests are colocated: `src/**/*.test.{ts,tsx}`. `src/lib/counter.ts` +
  `src/components/counter.tsx` and their tests are the worked example of both layers: atom
  logic is driven through a bare `createStore()` with no React, component behaviour through
  Testing Library.
- `src/test/render.tsx` exports `renderWithStore`, which wraps the tree in a `Provider` over a
  store created per call. To start from a specific state, build the store yourself, seed it
  with `store.set(...)`, and pass it in - that is the same write path production code uses, so
  `useHydrateAtoms` is not needed here.
- `src/test/setup.ts` also clears `localStorage` after each test. A fresh store alone does not
  isolate `atomWithStorage` atoms, because they re-read storage in `onMount`.
- `test.execArgv` in `vitest.config.ts` passes `--no-webstorage`. Node 25 defines a global
  `localStorage` whose methods are missing unless you pass `--localstorage-file`, and Vitest's
  jsdom environment skips any window key the Node global already has, so without this jsdom's
  `Storage` never gets installed (vitest-dev/vitest#8757).
- `vitest.config.ts` is standalone and does not merge `vite.config.ts`: that config constructs
  the tanstackRouter plugin, which rewrites the committed `src/routeTree.gen.ts` as a side
  effect. It duplicates the `@` alias instead, so keep the two in sync.
- Globals are off. Import `describe`/`it`/`expect` from `vitest` in every test file. This
  avoids adding `vitest/globals` to the `types` array in `tsconfig.json`.
- `src/test/setup.ts` loads the `@testing-library/jest-dom` matchers and calls `cleanup` in an
  `afterEach`, which Testing Library would otherwise register itself only under globals.
- `.oxlintrc.jsonc` exempts `src/**/*.test.{ts,tsx}` and `src/test/**` from `max-lines` and
  `max-lines-per-function`.
- `"e2e": "playwright test"` is still declared without `@playwright/test` installed, so that
  script fails until someone adds it.
