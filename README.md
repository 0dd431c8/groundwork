# react-boilerplate

A React 19 and TypeScript starter template built on Vite 8, TanStack Router, TanStack Query,
TanStack Form, Jotai, Tailwind CSS v4, shadcn and zod. The architecture rules are lint rules, so
breaking one fails the build instead of failing review.

![React 19](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white) ![Vite 8](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite&logoColor=white) ![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178c6?style=flat-square&logo=typescript&logoColor=white) ![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white) ![Bun 1.3](https://img.shields.io/badge/Bun-1.3-fbf0df?style=flat-square&logo=bun&logoColor=black) ![MIT license](https://img.shields.io/badge/License-MIT-green?style=flat-square)

Most starters describe a structure and then hope you keep to it. This one checks. The dependency
direction between feature layers, the split between client and server state, and imports of
`useEffect` or React Context are all things `bun run check` fails on, and each failure says what to
write instead. A convention nobody can verify is a convention that lasts about a month.

|              |                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| Build        | [Vite 8](https://vite.dev) (Rolldown), TypeScript 7                                                          |
| UI           | React 19, [Tailwind v4](https://tailwindcss.com), [shadcn](https://ui.shadcn.com) on Base UI                 |
| Routing      | [TanStack Router](https://tanstack.com/router), file-based with auto code splitting                          |
| Server state | [TanStack Query](https://tanstack.com/query)                                                                 |
| Client state | [Jotai](https://jotai.org)                                                                                   |
| Forms        | [TanStack Form](https://tanstack.com/form) with [zod](https://zod.dev)                                       |
| Quality      | [oxlint](https://oxc.rs) (type-aware, React Compiler), oxfmt, [Vitest](https://vitest.dev) + Testing Library |
| Tooling      | [Bun](https://bun.com) 1.3 as package manager and script runner                                              |

Also included: environment variables validated by zod at startup, brotli precompression and image
re-encoding at build time, a bundle size report, and a pre-commit hook that formats, lint-fixes and
typechecks.

## Contents

- [Quick start](#quick-start)
- [Why this starter](#why-this-starter)
- [Built for coding agents](#built-for-coding-agents)
- [Architecture](#architecture)
- [Scripts](#scripts)
- [Testing](#testing)
- [Quality gates](#quality-gates)
- [Build output](#build-output)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Starting your own project](#starting-your-own-project)
- [FAQ](#faq)
- [License](#license)

## Quick start

Requires [Bun](https://bun.com) 1.3 or newer. Bun is the package manager and script runner; the dev
server and bundler are still Vite.

```sh
bun install
bun run dev
```

Then open the URL Vite prints. `bun install` also points `core.hooksPath` at `.githooks/`, so the
pre-commit hook is live from the first commit.

Before pushing anything:

```sh
bun run check
```

That is format check, lint, typecheck and the app test suite in one command. No CI is configured,
so this is the gate.

## Why this starter

- Importing `./counter.queries` from a `.state.ts` file, or `@/features/counter/count-list` instead
  of `@/features/counter`, is a lint error carrying an explanation. A style guide can drift away
  from the code it describes. `.oxlintrc.jsonc` cannot.
- oxlint runs its type-aware rules against the real TypeScript program, so a floating promise or a
  React API that upstream deprecated last week fails the build. You find out on the version bump,
  not in a changelog nobody read.
- `react/react-compiler` runs the React Compiler's own analysis in lint mode. It catches setState
  during render, reading a ref during render, mutating props, and components defined inside other
  components, which the Rules of Hooks lint tier never sees.
- Jotai owns client state and TanStack Query owns server state, with no overlap: server data is
  never copied into an atom. `useEffect`, `createContext` and `useContext` are banned imports, and
  the escape hatch wants a written reason.
- Text assets come out brotli-precompressed, images are re-encoded through sharp and svgo, and the
  build prints a table of what it all weighs.
- `src/features/counter/` shows every layer doing its job: a schema, atoms, a transport, a query, a
  mutation, a validated form, and a list with real loading and error states. Every file has a test
  beside it. Nothing else imports the folder, so deleting it is one line.

## Built for coding agents

An agent turned loose on an unfamiliar repo writes plausible code that ignores the architecture,
and nobody notices until the fourth feature. A contributing guide does not help, because there is
no way for the agent to check itself against prose. There is a way for it to check itself against a
linter.

- [`AGENTS.md`](AGENTS.md) holds the conventions and `CLAUDE.md` is a symlink to it. Claude Code,
  Codex, Cursor, opencode and anything else that follows the [AGENTS.md](https://agents.md)
  convention read the same document, so the guidance cannot fork per tool.
- The linter does not say "unexpected import". It says:

  > A mutation gets a named hook in `<feature>.queries.ts` (`useSaveCount`), because what it
  > invalidates is a fact about the data, not about the widget that triggered it - a component
  > should never name a query key. `useQuery(countsQuery)` stays fine here.

  An agent that reads its own tool output takes the correction in the same turn, rather than in a
  review comment three days later.

- `bun run check` covers formatting, lint, types and tests in one deterministic command that
  finishes in seconds. An agent loop wants one signal, and that is the one.
- A constant goes in `<feature>.schema.ts`, an atom in `.state.ts`, a fetch in `.api.ts`, a
  mutation in `.queries.ts`. The layer decides the file, so nobody has to invent a structure per
  task.
- Tests sit next to the code they cover. The file to change and the file that proves it still
  works turn up in the same directory listing.
- `.mcp.json` and `opencode.json` register the [shadcn MCP server](https://ui.shadcn.com), so an
  agent can search the registry for a component instead of guessing at one.
- `.agents/skills/jotai/` and `.claude/skills/jotai/` carry the
  [Jotai skill](https://github.com/jotaijs/jotai-skills), pinned by `skills-lock.json`. Everyone's
  agent gets the same Jotai guidance regardless of what they have installed globally.

Nothing here is agent-specific. A new engineer gets the same feedback on their first afternoon.

## Architecture

```
src/
  routes/            file-based routes; routeTree.gen.ts is generated and committed
  features/<name>/   one folder per feature: schema, state, api, queries, components, tests
  lib/               router, query client, jotai store, validated env, utils
  components/ui/     vendored shadcn output
  styles/index.css   Tailwind import, theme tokens, base layer
  test/              renderWithProviders and the Vitest setup file
build/               Vite plugins: brotli, image optimisation, size tables
lint/                local oxlint plugin for Jotai
.githooks/           pre-commit hook, written in TypeScript and run by Bun
public/              copied to dist/ verbatim, for files needing an exact name at a known URL
AGENTS.md            the conventions, symlinked as CLAUDE.md
```

### One folder per feature

Everything belonging to one feature lives in one folder, flat, until it reaches roughly 15 to 20
source files. After that it splits by sub-domain, so `checkout/{cart,payment}/` rather than
`checkout/{components,hooks,state}/`. Splitting by technical type inside a feature just recreates
one level down the layout this structure exists to avoid.

Inside a feature, imports are relative (`./counter.state`). Rename the folder and its internals
keep working. Crossing out of one, use the `@/...` alias.

### The layer chain

Dependencies point one way, and the linter enforces every arrow:

```
<feature>.schema.ts <- <feature>.state.ts <- <feature>.api.ts <- <feature>.queries.ts <- *.tsx <- index.ts
```

| Layer         | Holds                                               | Cannot import                                          |
| ------------- | --------------------------------------------------- | ------------------------------------------------------ |
| `.schema.ts`  | constants, zod schemas, pure helpers                | React, Jotai, React Query, React Form, any layer above |
| `.state.ts`   | Jotai atoms, derived atoms, write-only action atoms | React, React Query, the transport                      |
| `.api.ts`     | fetch and its types                                 | React, Jotai, React Query                              |
| `.queries.ts` | `queryOptions`, named mutation hooks                | anything above it                                      |
| `*.tsx`       | components                                          | `useEffect`, Context, `useMutation`, `useQueryClient`  |
| `index.ts`    | the feature's public surface                        | nothing new                                            |

`@/features/counter` is a legal import. `@/features/counter/count-list` is a lint error. What a
feature exposes therefore stays that feature's own decision.

### Client state and server state

Jotai owns client state. TanStack Query owns anything that came from a server. One rule keeps them
from merging into a single confused blob: server data is never copied into an atom, and ephemeral
UI state is never parked in the query cache. When a mutation changes server data, invalidate the
key and let the query refetch, rather than handing the response to a `set(...)`.

Anything computed from other state is a derived atom, never state kept in sync by hand. That is
what makes the `useEffect` ban affordable, since the common reason to reach for an effect is gone.

```ts
// counter.state.ts
export const countAtom = atomWithStorage('counter:count', MIN_COUNT, undefined, {
  getOnInit: true,
});
export const canIncrementAtom = atom((get) => get(countAtom) < MAX_COUNT);
export const stepAtom = atom(null, (get, set, delta: number) => {
  set(countAtom, clamp(get(countAtom) + delta, MIN_COUNT, MAX_COUNT));
});
```

An atom is a plain value with no React in it, which is what lets a test drive it through a bare
`createStore()` with nothing rendered.

### Routing

Routes are files in `src/routes/`, with `__root.tsx` as the shell. `src/routeTree.gen.ts` is
generated by the TanStack Router plugin, committed, and regenerated on `dev` and `build`. Never
edit it by hand. A route imports a feature through its barrel and composes it; routes do not decide
how a feature's own pieces stack.

Per-route titles go through the `head` route option. Site-level metadata stays static in
`index.html`, because social scrapers do not run JavaScript.

### Providers

`src/main.tsx` composes the QueryClient, an explicit Jotai store from `src/lib/store.ts`, and the
router. `src/test/render.tsx` mirrors that stack, so a test that seeds a store and renders is
exercising the same write path production uses. Jotai's implicit default store is a banned import
for the same reason.

## Scripts

| Command                 | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `bun run dev`           | Vite dev server                                                 |
| `bun run build`         | `tsc -b`, then `vite build` into `dist/`                        |
| `bun run check`         | Format check, lint, typecheck and app tests. Run before pushing |
| `bun run test`          | Vitest in watch mode, `app` project only                        |
| `bun run test:infra`    | Vitest in watch mode, the `build` and `lint` projects           |
| `bun run test:ui`       | Vitest dashboard                                                |
| `bun run test:coverage` | All three projects, v8 report in `coverage/`                    |
| `bun run lint`          | oxlint                                                          |
| `bun run lint:fix`      | oxlint with `--fix`                                             |
| `bun run format`        | oxfmt                                                           |
| `bun run format:check`  | oxfmt in check mode                                             |
| `bun run typecheck`     | `tsc -b`                                                        |

`bun run lint` on its own passes while types or tests are broken, which is why `check` exists.

## Testing

Vitest with jsdom and Testing Library, in three projects that share nothing but the runner: `app`
for `src/`, `build` for the Vite plugins, `lint` for the local oxlint plugin. Tests are colocated
next to the file under test.

- Globals are off. Import `describe`, `it`, `expect` and `vi` from `vitest` in every file.
- Render with `renderWithProviders` from `@/test/render`. To start from specific state, build a
  store, seed it, and pass it in.

  ```tsx
  const store = createStore();
  store.set(countAtom, 3);
  renderWithProviders(<SaveCountForm />, { store });
  ```

- Mock the feature's `.api.ts` and leave the query definitions alone. That keeps the real
  `queryOptions` wiring under test instead of a stub of it, and it is the whole reason the
  transport layer is kept free of React Query.
- Query by role and accessible name. `jsx-a11y` is on and the tests query the way a screen reader
  reads, so an accessibility regression fails the suite rather than shipping.
- Coverage thresholds are 90 across statements, branches, functions and lines. That is a floor
  against a feature landing untested. Raise it, never quietly lower it.

## Quality gates

[`.oxlintrc.jsonc`](.oxlintrc.jsonc) errors on the `correctness`, `suspicious`, `pedantic` and
`perf` categories, and runs type-aware rules against the real TypeScript program. The full list is
in that file and in [`AGENTS.md`](AGENTS.md); the ones that shape day-to-day code:

| Banned                                               | Instead                                              |
| ---------------------------------------------------- | ---------------------------------------------------- |
| `useEffect` from `react`                             | Derive state with an atom, or use an event handler   |
| `forwardRef` from `react`                            | React 19 passes `ref` as an ordinary prop            |
| `createContext` / `useContext`                       | Jotai for client state, React Query for server state |
| `getDefaultStore` from `jotai`                       | The explicit store in `src/lib/store.ts`             |
| `@/features/*/*`                                     | The feature's `index.ts`                             |
| `useMutation` / `useQueryClient` in a feature `.tsx` | A named hook in `<feature>.queries.ts`               |

Each has the same escape hatch: an inline `// oxlint-disable-next-line no-restricted-imports` plus
a comment saying why.

Also on: no `any`, no non-null `!`, no `console`, no `@ts-ignore`. Exported functions declare their
return type, components included. `max-lines` 400, `max-lines-per-function` 40, `complexity` 15,
with test files exempt from the first two. `import/no-cycle` as the backstop for direction mistakes
the path patterns cannot name. Three Jotai rules from `lint/jotai.ts`, because nothing published
lints Jotai.

`tsconfig.json` runs `strict` plus `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
`noPropertyAccessFromIndexSignature` and `noImplicitReturns`.

The pre-commit hook in `.githooks/` formats and lint-fixes staged files, re-stages the fixes, then
runs `tsc -b`. It refuses a partially staged file rather than sweeping its unstaged changes into the
commit. Bypass with `git commit --no-verify`.

## Build output

`bun run build` typechecks, then writes a static bundle to `dist/`. Three local Vite plugins in
`build/` run after it:

- `build/images.ts` re-encodes png, jpeg, webp and avif through
  [sharp](https://sharp.pixelplumbing.com) and runs SVGs through [svgo](https://svgo.dev). It only
  ever rewrites downwards. An asset that is already optimised comes out untouched.
- `build/brotli.ts` writes a `.br` beside every text asset over one MTU, since below that a smaller
  file still costs the same round trip. Fonts and images are skipped: both come back larger.
- `build/report.ts` prints the size tables, grouped by asset kind, showing transfer size rather
  than raw size.

Vendor code is split into `vendor-react`, `vendor-tanstack` and a catch-all `vendor` chunk, so
adding a dependency does not rehash the chunk your users already have cached.

## Configuration

Copy `.env.example` to `.env`. `src/lib/env.ts` is the only module that reads `import.meta.env`;
everything else imports the parsed `env` object. A bad value throws at module load with the key
named. It fails the first paint instead of becoming `undefined` three layers down.

- Adding a variable is one line in `envSchema` and one in `.env.example`. Both, always.
- Every variable needs a `.default()`. A fresh clone with no `.env` has to run, which means
  validation is there to catch a wrong value rather than a missing one.
- Raw values are always strings: `z.stringbool()` for booleans, `z.coerce.number()` for numbers.
- Only `VITE_`-prefixed variables reach the browser.
- `.env` is read at build time, so `dist/` is baked per environment. Anything that must change
  without a rebuild needs a runtime mechanism, such as a `/config.json` fetched at startup.

## Deployment

The output is a static single-page app, so any static host works: Netlify, Vercel, Cloudflare
Pages, S3 with CloudFront, or nginx. Two things to configure:

1. An SPA fallback, rewriting unmatched paths to `/index.html`. Without it a deep link returns 404.
   Leave hashed assets under `/assets/` out of the rewrite.
2. Serving the precompressed files, which is the point of the brotli step. nginx needs
   `brotli_static on`; object storage needs `Content-Encoding: br` set on upload. Netlify, Vercel
   and Cloudflare already compress at their edge, so there the `.br` files are harmless and you may
   as well drop the plugin from `vite.config.ts`.

There is no server-side rendering here. See the [FAQ](#faq) if that is a requirement.

## Starting your own project

1. Delete `src/features/counter/` and replace the body of `src/routes/index.tsx`. It is a worked
   example, not a dependency; nothing else imports it.
2. In `index.html`, replace the `https://example.com/` placeholders on `og:url` and `og:image` with
   real absolute URLs. Scrapers discard relative OG URLs, and an empty `content=""` is worse than an
   absent tag. Update the sitemap line in `public/robots.txt` while you are there.
3. Keep the two `theme-color` metas in `index.html` in step with `--background` in
   `src/styles/index.css`. They are hand-mirrored hex and drift silently.
4. Add a real `favicon.ico` and `apple-touch-icon.png` to `public/` and uncomment the two links in
   `index.html`. Safari below 26 ignores the SVG icon.
5. Rewrite this README and update `LICENSE` with your own name.
6. Read [`AGENTS.md`](AGENTS.md) before adding a feature, or point your agent at it.

## FAQ

### Why Bun if Vite is still the bundler?

Bun is the package manager and script runner. Installs are fast, `bunx` needs no separate cache,
`.env` loads without `dotenv`, and `bun file.ts` runs a TypeScript script with no build step, which
is what makes the pre-commit hook readable TypeScript instead of shell. The dev server, the HMR and
the production build are all Vite.

### Can I use npm or pnpm instead?

Dependencies install and the app builds. Two things need porting: `.githooks/pre-commit.ts` uses
`Bun.spawn`, and the `prepare` script wires the hooks path. Replace the hook with the equivalent
Node script, or drop it, and the rest of the repo is package-manager agnostic.

### Why is `useEffect` banned?

Most `useEffect` calls in an app shaped like this one are a mistake with a better answer available:
state derived in an effect, which wants a derived atom, or a fetch, which wants TanStack Query.
Making it an import ban rather than a written policy means it fires while you type it. Genuine
cases exist, such as subscribing to a browser API, and those cost one comment line.

`useState` is not banned, incidentally. Local state that nothing else reads is exactly what it is
for.

### Why oxlint instead of ESLint?

Speed, mostly. The Rust rules cover the repo in milliseconds, which is what makes linting viable
inside a pre-commit hook and inside an agent loop. The type-aware tier through `oxlint-tsgolint`
covers what `typescript-eslint` covers for the rules used here.

The catch: the ESLint plugins with no oxlint equivalent (TanStack Query, TanStack Router, Testing
Library, jest-dom, and the local Jotai plugin) run through oxlint's JS plugin bridge, which is
alpha and outside semver. It is the one moving part in the setup. Worth knowing before you adopt
this.

### Why not Next.js or Remix?

This is a client-rendered SPA with no server in it. Pick a framework with a server when you need
server-side rendering, streaming, server actions, or content that has to be crawlable without
JavaScript. Pick this for something behind a login, an internal tool, a dashboard: places where a
server runtime adds deployment surface and buys nothing. The build output is static files, so
hosting is a bucket.

### Does this work with Cursor, Codex, Copilot or opencode?

Yes. The conventions live in `AGENTS.md`, the file those tools converged on, and `CLAUDE.md` is a
symlink to it. `opencode.json` and `.mcp.json` configure the shadcn MCP server for opencode and for
Claude Code respectively. If you add another agent, add its config directory to `ignorePatterns` in
`.oxfmtrc.jsonc` so the vendored skill copies stay unformatted.

### How do I add a shadcn component?

```sh
bunx shadcn@latest add dialog
```

It installs any missing dependencies itself and writes into `src/components/ui/`, which is treated
as generated output. Do not hand-edit those files, since a re-add overwrites them. Components shared
across features go in `src/components/`; anything used by exactly one feature belongs in that
feature's folder.

### Where do I put a component two features share?

`src/components/`. If it needs feature state to work then it is not really shared: it belongs to
one feature, and the other one should import that feature's barrel. `src/lib/` is infrastructure
only, so a module there that names a feature is in the wrong place.

### Is there a live demo?

No. The example feature's transport (`src/features/counter/counter.api.ts`) is an in-memory
stand-in for a server, so `bun run dev` gives you the full loop, including loading and error states,
with no backend to run.

## License

[MIT](LICENSE).
