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
- `src/features/<name>/` holds everything that belongs to one feature: state, components and
  their tests, side by side. `src/features/counter/` is the worked example. Files are named
  `<feature>.state.ts` (atoms), `<feature>.api.ts` (transport), `<feature>.queries.ts` (React
  Query definitions), and one `.tsx` per component with its `.test.tsx` beside it. `index.ts`
  is the feature's public surface and the only path outside code may import. See "Feature
  structure" below before adding folders inside one.
- `src/lib/` is infrastructure and app-agnostic helpers only: the singletons `main.tsx` wires
  up (`router.ts`, `query-client.ts`, `store.ts`) and generic utilities (`utils.ts`). Feature
  code does not go here. If a module names a feature, it belongs in `src/features/`.
- `src/components/` is for components shared across features. Right now that is only the
  vendored `ui/` directory.
- `src/styles/index.css` is the single stylesheet: Tailwind v4 import, theme tokens for
  `:root` and `.dark`, and `@layer base` rules.

## Feature structure

A feature folder is flat. Stay that way until it hurts, which in practice is somewhere past
15-20 source files, and is about scrolling to find things rather than anything structural.
`src/features/counter/` is six source modules, nowhere near it.

- Every feature has an `index.ts` naming what it exports, and that is the only path anything
  outside may import: `@/features/counter`, never `@/features/counter/score-list`. What a
  feature exports is its own business - one component, several, a hook, a type - so nothing
  here prescribes what the entry has to be or what it is called. `src/features/counter/`
  happens to export a single `CounterPanel` that composes `Counter`, `SaveScoreButton` and
  `ScoreList`, which keeps `src/routes/index.tsx` from owning how a feature's pieces stack, but
  a feature with one component or no component at all is just as valid.
- List the exports in `index.ts`, never `export *`. The bundling objection to barrels is about
  re-exporting a whole folder; a named list of one or two entries is not that, and moving this
  repo onto one left the route chunk byte-identical.
- When a feature really does outgrow flat, split it by sub-domain, never by technical type.
  `checkout/{cart,payment,confirmation}/` follows how the code changes; adding
  `components/`, `hooks/` and `state/` folders just recreates, one level down, the by-type
  organisation that moving the counter out of `src/lib` and `src/components` got rid of.
- Dependencies point one way: `.state.ts` <- `.queries.ts` <- components. Nothing imports back
  up the chain, and no feature imports another feature's internals. This matters more than the
  folder shape, and `.oxlintrc.jsonc` enforces it rather than leaving it to review. See "Lint
  rules worth knowing" for what the rules actually catch.

## State

Jotai owns client state; React Query stays in charge of server state. Don't reach for React
Context to share values, and don't lift state up through props just to share it.

- `src/lib/store.ts` exports an explicit `createStore()` rather than relying on Jotai's
  implicit default store, and `src/main.tsx` wraps the router in `<Provider store={store}>`.
  The explicit store is what lets tests render against a fresh one.
- Atoms live in the feature that owns them, in a `<feature>.state.ts` module alongside the
  constants and pure helpers they enforce, and are named with an `Atom` suffix.
  `src/features/counter/counter.state.ts` is the worked example of all three shapes: a
  primitive atom (`countAtom`), read-only derived atoms (`canDecrementAtom`,
  `canIncrementAtom`), and a write-only action atom (`stepAtom`) that owns the update rule.
  Only state genuinely shared across features belongs anywhere else.
- Derived atoms are the answer to the `useEffect` ban below. A value computed from other
  state is an `atom((get) => ...)`, never state you keep in sync by hand.
- Read with `useAtomValue`, write with `useSetAtom`. `useAtom` only when a component genuinely
  needs both, since it subscribes the component to the value.
- Persist with `atomWithStorage` from `jotai/utils`. Pass `{ getOnInit: true }` or the first
  render shows the initial value and corrects itself on mount.
- Deliberately not installed: `jotai-devtools` (drags in the whole Mantine UI kit) and
  `jotai-babel` (`@vitejs/plugin-react` v6 is Oxc-based and dropped its `babel` option, so it
  would cost `@rolldown/plugin-babel` plus five more packages and a second transform pass over
  every file).

## Server state

React Query owns anything that came from a server. The rule that matters: server data never
gets copied into an atom, and ephemeral UI state never gets parked in the query cache. When a
mutation changes server data, invalidate the key and let the query refetch; do not hand the
response to `setState` or to a `set(...)`.

- `src/features/counter/save-score-button.tsx` is where the two layers meet, and is the
  clearest thing to read first: the value being saved comes from `countAtom`, the saved list
  comes from the query cache, and nothing copies one into the other.
- Define queries with `queryOptions` in `<feature>.queries.ts`, exporting the key separately
  (`scoresKey`) so the definition and every `invalidateQueries` call cannot drift apart. Pass
  the whole object to `useQuery(scoresQuery)`.
- Mutations get a custom hook in the same file (`useSaveScore`), never an inline `useMutation`
  in a component. What a mutation invalidates is a fact about the data, not about the widget
  that triggered it, so a component should never name a query key. Keep `onSuccess` on the hook
  options rather than on the `mutate()` call: callbacks passed to `mutate()` are dropped if the
  caller unmounts before the request settles, so navigating away mid-save would skip the
  invalidation. One `useMutation` per call site is deliberate, since that is what gives each
  caller its own `isPending`; sharing it would need a `mutationKey` and `useMutationState`.
- Keep the transport in `<feature>.api.ts` with no React Query import. Tests
  `vi.mock('./counter.api')` to control it while the real `queryOptions` still runs, so what is
  under test is the production query wiring. Merging the two files would mean mocking the query
  config too.
- Wrap the call: `queryFn: () => fetchScores()`, not `queryFn: fetchScores`. React Query passes
  a context object into query and mutation functions, and a bare reference means the transport
  silently receives it.
- `src/lib/query-client.ts` is left on the library defaults on purpose, including `staleTime: 0`,
  so refetch-on-focus is visible in the devtools rather than a mystery later.
- `jotai-tanstack-query` is deliberately not installed. Plain `useQuery`/`useMutation` next to
  plain atoms is what keeps the boundary above legible. The thing that would justify adopting it
  is a derived atom that has to read server data; until an atom needs that, it buys nothing.

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

Run `bun run check` before claiming anything is done. It is `format:check`, `lint`,
`typecheck` and the tests in one command, and it is what CI runs. `bun run lint` on its own
passes while types or tests are broken.

`.oxlintrc.jsonc` errors on the `correctness`, `suspicious`, `pedantic` and `perf` categories,
and adds the following. Every rule below was checked against a file written to violate it
before being turned on; do the same when adding one, since a rule that fires on nothing is not
a guardrail.

**Type-aware.** `"typeAware": true` runs `oxlint-tsgolint` against the real TypeScript
program, which is the only tier that sees across a call boundary. It needs TypeScript 7, so
do not downgrade TypeScript without removing this first. It costs about 0.1s here. The rules
are `no-floating-promises`, `no-misused-promises` (an `async` function passed to `onClick`),
`await-thenable`, `require-await`, `no-unnecessary-condition`, `switch-exhaustiveness-check`,
`no-unnecessary-type-assertion`, `no-array-delete`, `prefer-promise-reject-errors`, and the
`no-unsafe-*` set that stops `any` spreading out of an untyped edge.

**Escape hatches.** `no-explicit-any`, `no-non-null-assertion` (`!`), `no-console`, and
`ban-ts-comment`: `@ts-ignore` is banned outright, `@ts-expect-error` needs a description and
starts failing once the underlying problem is fixed.

**Contracts.** `explicit-module-boundary-types` means exported functions declare their return
type, components included (`import type { JSX } from 'react'`, then `: JSX.Element`). An
inferred type that is subtly wrong becomes an error at the boundary rather than downstream.

- `useEffect` is banned from `react` imports. Derive state or use event handlers. If genuinely
  unavoidable, add `// oxlint-disable-next-line no-restricted-imports` with a justification.
- `max-lines` 400, `max-lines-per-function` 40, `complexity` 15. Test files are exempt.
- `@/features/*/*` is restricted, so a feature is reachable only through its `index.ts` and its
  internals stay internal. Inside a feature you import relatively, which the same rule pushes
  you towards. There is no exemption for particular filenames, deliberately: the rule should not
  care what a feature chooses to call its parts.
- `src/features/*/*.state.ts` additionally cannot import `./*.queries` or `./*.api`. That is the
  dependency direction from "Feature structure" made enforceable: client state never reaches up
  into the server-state layer.
- `import/no-cycle` is on. It is the backstop for direction mistakes the two patterns above
  cannot name, since most of them close a loop.
- oxlint has no `import/no-restricted-paths`; the above is built from `no-restricted-imports`
  patterns plus `overrides`. Two things to know before editing them. An override **replaces**
  this rule rather than merging, so the `*.state.ts` override repeats the `useEffect` entry and
  the feature-entry pattern verbatim; change one and you must change both. And a `group` glob
  matches path segments, so `@/features/*` does not match `@/features/counter/counter` - that
  needs `@/features/*/*`. Both are easy to get wrong silently, so verify a rule change by
  writing a file that should fail and confirming it does.

Relaxed on purpose, so nobody re-enables them expecting an improvement:
`react/react-in-jsx-scope` is wrong under the automatic JSX runtime and is 44 of the 47
findings `suspicious` reports; `import/no-unassigned-import` would flag the CSS and jest-dom
side-effect imports, which are correct; `prefer-readonly-parameter-types` wants `readonly` on
every object parameter including React props, 13 findings and no bugs;
`no-confusing-void-expression` keeps `ignoreArrowShorthand` so `onClick={() => step(-1)}`
stays legal. Not enabled at all: the `style` category (oxfmt's job), `restriction` as a
category (it bans `async`/`await`), and the `react-perf` plugin (its remedy is `useCallback`
around children that are not memoised).

`tsconfig.json` runs `strict` plus `exactOptionalPropertyTypes`, `noImplicitReturns`,
`noPropertyAccessFromIndexSignature`, `noUncheckedSideEffectImports`, `erasableSyntaxOnly`,
`noUncheckedIndexedAccess`, and `allowUnreachableCode`/`allowUnusedLabels` off. All were
measured at zero errors before being turned on. `isolatedDeclarations` is skipped: it needs
declaration emit, which fights `noEmit` on the app project, and
`explicit-module-boundary-types` covers the same ground.

## Testing

Vitest with jsdom and Testing Library. Prefer it over `bun test`: the app code imports
`.tsx`, CSS, and the `@/*` alias, which need the Vite transform pipeline that Vitest shares
with the dev server.

- `bun run test` (watch), `bun run test:ui` (`@vitest/ui` dashboard), `bun run test:coverage`
  (v8 provider, report in `coverage/`). CI should call `bun run check`.
- Coverage thresholds are set to 90 across the board. The suite is at 100% once wiring is
  excluded from `coverage.include` (the mount call, the three `src/lib` singletons, the route
  files, feature `index.ts` barrels: all exercised only by a real browser). Treat this as a
  floor against a feature landing with no tests at all, not as a quality bar, since an
  assertion-free test satisfies it just as well. Raise it, never quietly lower it, and if
  something genuinely untestable drags it down, exclude that file with a reason rather than
  dropping the number.
- Tests are colocated: `src/**/*.test.{ts,tsx}`, next to the file under test inside the
  feature. `src/features/counter/` is the worked example of both layers: atom logic is driven
  through a bare `createStore()` with no React, component behaviour through Testing Library.
- Within a feature, import relatively (`./counter.state`); reach for the `@/*` alias only when
  crossing out of it. That way a feature folder can be renamed or moved without editing its
  own internals. The state module is `<feature>.state.ts` rather than `<feature>.ts` so that
  `./counter` never has to be disambiguated from `counter.tsx` by extension-resolution order.
- `src/test/render.tsx` exports `renderWithProviders`, which mirrors `main.tsx`: a
  `QueryClientProvider` and a Jotai `Provider`, each over an instance created per call, both
  overridable. To start from a specific state, build the store yourself, seed it with
  `store.set(...)`, and pass it in - that is the same write path production code uses, so
  `useHydrateAtoms` is not needed here.
- The test `QueryClient` sets `retry: false`. Without it, any test of an error branch waits out
  three retries with exponential backoff and fails as a timeout rather than an assertion.
- Mock the feature's `.api.ts` with `vi.mock`, never the query definitions. `vi` has to be
  imported explicitly, like `describe`/`it`/`expect`, since globals are off.
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
