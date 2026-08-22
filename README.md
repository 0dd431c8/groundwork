<h1>
  <img src="public/icon.svg" width="28" height="28" align="absmiddle" alt="groundwork mark">
  groundwork
</h1>

A React 19 and TypeScript starter built on Vite 8, TanStack Router, TanStack Query, TanStack Form,
Jotai, Tailwind CSS v4, shadcn and zod. Lint rules enforce the architecture, so violations fail the
build.

![React 19](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white) ![Vite 8](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite&logoColor=white) ![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178c6?style=flat-square&logo=typescript&logoColor=white) ![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white) ![Bun 1.3](https://img.shields.io/badge/Bun-1.3-fbf0df?style=flat-square&logo=bun&logoColor=black) ![MIT license](https://img.shields.io/badge/License-MIT-green?style=flat-square)

`bun run check` verifies the dependency direction between feature layers, the split between client
and server state, and the bans on `useEffect` and React Context. Each failure explains what to write
instead, which keeps the conventions tied to the code as it changes.

|              |                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| Build        | [Vite 8](https://vite.dev) (Rolldown), TypeScript 7                                                          |
| UI           | React 19, [Tailwind v4](https://tailwindcss.com), [shadcn](https://ui.shadcn.com) on Base UI                 |
| Routing      | [TanStack Router](https://tanstack.com/router), file-based with auto code splitting                          |
| Server state | [TanStack Query](https://tanstack.com/query)                                                                 |
| Client state | [Jotai](https://jotai.org)                                                                                   |
| Forms        | [TanStack Form](https://tanstack.com/form) with [zod](https://zod.dev)                                       |
| Quality      | [oxlint](https://oxc.rs) (type-aware, React Compiler), oxfmt, [Vitest](https://vitest.dev) + Testing Library |
| Tooling      | [Bun](https://bun.com) as package manager and script runner, pinned in `.bun-version`                        |

The template also validates environment variables with zod at startup. Its build re-encodes images,
precompresses assets with brotli, and prints a bundle size report. A pre-commit hook formats,
lint-fixes and typechecks, while GitHub Actions runs the same gate on pushes to `main` and pull
requests.

## Contents

- [Quick start](#quick-start)
- [Why this starter](#why-this-starter)
- [Built for coding agents](#built-for-coding-agents)
- [Architecture](#architecture)
- [Scripts](#scripts)
- [Testing](#testing)
- [Quality gates](#quality-gates)
- [Continuous integration](#continuous-integration)
- [Build output](#build-output)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Starting your own project](#starting-your-own-project)
- [FAQ](#faq)
- [License](#license)

## Quick start

Requires [Bun](https://bun.com). CI installs the version in `.bun-version`, and the `engines` field
in `package.json` repeats it to keep local and CI environments in sync. Bun is the package manager
and script runner. Vite remains the dev server and bundler.

```sh
bun create 0dd431c8/groundwork my-app
cd my-app
bun run dev
```

The command clones the template, installs dependencies, and initialises a git repository. During
installation, the `prepare` script points `core.hooksPath` at `.githooks/`, enabling the pre-commit
hook from the first commit. Open the URL Vite prints.

In an existing clone, `bun install` performs the same setup.

Before pushing anything:

```sh
bun run check
```

This runs the format check, lint, duplication check, typecheck and all three test suites. CI uses
the same command.

## Why this starter

- Importing `./<feature>.queries` from a `.state.ts` file, or `@/features/<name>/<file>` in place of
  `@/features/<name>`, produces a lint error with an explanation. The executable rules in
  `.oxlintrc.jsonc` stay tied to the code even when a written style guide falls out of date.
- oxlint runs its type-aware rules against the real TypeScript program. Floating promises and React
  APIs deprecated by an upstream update therefore fail the build as soon as the new version lands.
- `react/react-compiler` runs the React Compiler's own analysis in lint mode. It catches setState
  during render, reading a ref during render, mutating props, and components defined inside other
  components, which the Rules of Hooks lint tier never sees.
- State ownership depends on who needs to see a value. TanStack Query owns server data, the URL owns
  shareable views, and Jotai owns the remaining client state. Server data is never copied into an
  atom. `useEffect`, `createContext` and `useContext` are banned imports, with a written reason
  required for the escape hatch.
- The build brotli-precompresses text assets, re-encodes images through sharp and svgo, and prints a
  size table.
- Before adding a component, grep for one that already does the job. Duplicate implementations
  drift over time. `src/features/todos/segmented-field.tsx` is the worked example: the priority
  picker and filter bar use one control with two option sets. A grep is necessary because the
  linter can detect copied code but cannot tell that two separately written components solve the
  same problem.
- `src/features/todos/` shows every layer doing its job: a schema, an atom, a transport, three
  mutations, a validated form, a detail view behind a route loader, and a list with real loading,
  error, empty and filtered-to-nothing states. The list reads the server collection and the URL's
  view in the same component without either one absorbing the other, which is the rule the whole
  layout follows. Every file has a test beside it, and no other code imports the folder, so deleting
  it takes one line.

## Built for coding agents

In an unfamiliar repository, a coding agent can write plausible code that violates the
architecture. Written guidance alone cannot provide automatic feedback, so the linter checks those
decisions while the agent works.

- [`AGENTS.md`](AGENTS.md) holds the conventions and `CLAUDE.md` is a symlink to it. Claude Code,
  Codex, Cursor, opencode and anything else that follows the [AGENTS.md](https://agents.md)
  convention read the same document, keeping the guidance consistent across tools.
- The document is 167 lines because every turn of every session reads it. Keeping it short saves
  context and makes it easier to follow. It contains the commands, layout, dependency arrows and
  banned imports that apply to every task. Details about feature layers, forms, styling and
  accessibility, testing, environment variables, and lint plugins live in separate files under
  `.agents/skills/` and load only when needed. Skill-aware agents find those files automatically;
  other agents use the table at the top of `AGENTS.md`.
- The linter does not say "unexpected import". It says:

  > A mutation gets a named hook in `<feature>.queries.ts`, because what it invalidates is a fact
  > about the data, not about the widget that triggered it - a component should never name a
  > query key. Reading a query with `useQuery(<feature>Query)` stays fine here.

  An agent can apply that correction from its tool output during the same turn instead of waiting
  for a review comment three days later.

- `bun run check` covers formatting, lint, copy-paste detection, types and every test in one
  deterministic command that finishes in seconds. CI runs the same command, giving an agent loop a
  single result to act on.
- A constant goes in `<feature>.schema.ts`, an atom in `.state.ts`, a fetch in `.api.ts`, a
  mutation in `.queries.ts`. The layer determines the file, so each task follows the same
  structure.
- Tests sit next to the code they cover. The file to change and the file that proves it still
  works turn up in the same directory listing.
- Two pieces of agent config ship with the repo. `.mcp.json` and `opencode.json` register the
  [shadcn MCP server](https://ui.shadcn.com), which lets an agent search the component registry.
  `.agents/skills/` holds the topic guides above alongside the
  [Jotai skill](https://github.com/jotaijs/jotai-skills), pinned by `skills-lock.json`, because
  nothing published teaches Jotai. Each first-party guide is a real directory under
  `.agents/skills/` with `.claude/skills/<name>` symlinked to it, so there is one file to edit and
  no chance of the two drifting. The vendored Jotai skill is the exception: it is a real copy in
  both directories, because that is what `bunx skills add` writes.

The included agent support is specific to this stack: an MCP server for the component registry and
a skill for the state library. The template does not choose a model. `.editorconfig` is its only
editor-facing file because oxfmt checks files such as `ci.yml` that editors may not otherwise know
how to format. It sets indentation and line endings, not editor preferences.

A new engineer gets the same feedback on their first afternoon, so none of this is agent-only.

## Architecture

```
src/
  routes/            file-based routes; routeTree.gen.ts is generated and committed
  features/<name>/   one folder per feature: schema, state, api, queries, components, tests
  lib/               router, query client, jotai store, validated env, utils
  components/ui/     vendored shadcn output
  styles/index.css   Tailwind import, theme tokens, base layer
  test/              renderWithProviders, renderRoute and the Vitest setup file
build/               Vite plugins: brotli, image optimisation, size tables
lint/                local oxlint plugins: jotai.ts, dry.ts, ui.ts
.githooks/           pre-commit hook, written in TypeScript and run by Bun
.github/workflows/   CI: the same `bun run check` on pushes to main and pull requests
public/              copied to dist/ verbatim, for files needing an exact name at a known URL
.agents/skills/      one guide per topic, loaded when the work calls for it
AGENTS.md            the conventions, symlinked as CLAUDE.md
```

### One folder per feature

Everything belonging to one feature stays in a flat folder until the feature reaches roughly 15 to
20 source files. At that point, split it by sub-domain, as in `checkout/{cart,payment}/`. A split
such as `checkout/{components,hooks,state}/` would recreate the top-level technical layout inside
the feature.

Use relative imports inside a feature (`./<feature>.state`) so its internal imports survive a folder
rename. Use the `@/...` alias when importing from outside the feature.

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

`@/features/<name>` is a legal import, while `@/features/<name>/<file>` is a lint error. The
feature's `index.ts` therefore controls its public API.

### Where state lives

Choose the owner of a value by asking who else needs to see it:

| Owner          | For                                              | Reached by                                 |
| -------------- | ------------------------------------------------ | ------------------------------------------ |
| TanStack Query | Anything that came from a server                 | `useQuery(<feature>Query)`                 |
| The URL        | A view worth sharing or worth surviving a reload | `validateSearch` on the route, then a prop |
| Jotai          | Everything else this browser owns alone          | `useAtomValue` / `useSetAtom`              |

Keep server data out of atoms and ephemeral UI state out of the query cache. When a mutation changes
server data, invalidate the key so the query refetches.

Put a view in the URL when someone should be able to paste its address and see the same result. For
example, filters belong in search parameters:

```ts
// todos.schema.ts. The view the list route keeps in the URL.
export const todoViewDefaults = { filter: 'all', search: '' } as const;
export const todoViewSchema = z.object({
  filter: todoFilterSchema.default('all').catch('all'),
  search: z.string().default('').catch(''),
});
```

```ts
// routes/todos/index.tsx
validateSearch: todoViewSchema,
search: { middlewares: [stripSearchParams(todoViewDefaults)] },
```

Calling `.catch()` on every field makes a hand-edited URL fall back to the default view.
`stripSearchParams` keeps the unfiltered list at `/todos`, without the default query string
`/todos?filter=all&search=`.

Jotai owns the remaining browser-only state. An atom is a plain value with no React dependency, so
a test can drive it through a bare `createStore()` without rendering a component:

```ts
// todos.state.ts. Not one todo lives here: the list belongs to the server, and the filter
// belongs to the address bar. A default priority belongs to this browser and nobody else.
export const newTodoPriorityAtom = atomWithStorage<TodoPriority>(
  'todos:priority',
  'normal',
  undefined,
  { getOnInit: true },
);
```

Compute values from other state with a derived atom on the Jotai side or a plain function on the
URL side. This removes a common reason to reach for `useEffect`.

### Routing

Routes live in `src/routes/`, with `__root.tsx` as the shell. Directories create nesting, so
`todos/route.tsx` is the layout for both `todos/index.tsx` and `todos/$todoId.tsx`.
The TanStack Router plugin generates `src/routeTree.gen.ts` during `dev` and `build`, and the result
is committed. Never edit that file by hand. Routes import features through their barrels and
compose them; each feature determines how its own pieces fit together.

`src/lib/router.ts` defines the router defaults:

- `defaultPendingComponent`, `defaultErrorComponent` and `defaultNotFoundComponent`, from
  `src/components/route-fallbacks.tsx`. Without them a loader failure is a blank page and an
  unmatched URL is a bare "Not Found".
- `defaultPreload: 'intent'` with `defaultPreloadStaleTime: 0`, so hovering a link starts the work
  while React Query, rather than the router's preload cache, decides what is stale.
- `context: { queryClient }`, which gives every loader the production query cache. The list route
  uses non-throwing `prefetchQuery`, so its own loading and error branches stay reachable. The
  detail route uses `fetchQuery`, which reuses fresh data but awaits a stale refetch before turning
  `TodoNotFoundError` into `notFound()`. If a row is deleted after its detail was cached, revisiting
  it returns a 404 and does not render the stale copy.

TanStack links match descendant routes by default. The detail view uses exact active matching for
its parent backlink, so "All todos" does not receive `aria-current="page"` at `/todos/:id`.

Per-route titles go through the `head` route option, which can read what the loader returned.
Site-level metadata stays static in `index.html`, because social scrapers do not run JavaScript.

### Providers

`src/main.tsx` composes the QueryClient, an explicit Jotai store from `src/lib/store.ts`, and the
router. `src/test/render.tsx` uses the same stack, so tests that seed a store exercise the production
write path. To keep that behavior consistent, importing Jotai's implicit default store is banned.

`src/lib/query-client.ts` exports `queryDefaults`, and `src/lib/router.ts` exports `routerDefaults`.
The test harness builds its client and router from those exports. This prevents tests from using a
different cache schedule or TanStack's built-in "Not Found" fallback.

The QueryClient sets `staleTime` to 30 seconds and `retry` to 1. Its `MutationCache` sends each
failure to `notifyError` in `src/lib/notify.ts`, which raises one toast. Read failures do not use
that path; they stay with the component that requested the data because background refetch toasts
would not give the user an action to take.

## Scripts

| Command                 | What it does                                                   |
| ----------------------- | -------------------------------------------------------------- |
| `bun run dev`           | Vite dev server                                                |
| `bun run build`         | `tsc -b`, then `vite build` into `dist/`                       |
| `bun run check`         | Format check, lint, duplication check, typecheck and all tests |
| `bun run test`          | Vitest in watch mode, `app` project only                       |
| `bun run test:infra`    | Vitest in watch mode, the `build` and `lint` projects          |
| `bun run test:ui`       | Vitest dashboard                                               |
| `bun run test:coverage` | All three projects, v8 report in `coverage/`                   |
| `bun run lint`          | oxlint                                                         |
| `bun run lint:fix`      | oxlint with `--fix`                                            |
| `bun run dupes`         | jscpd, copy-paste across `src`, `build` and `lint`             |
| `bun run format`        | oxfmt                                                          |
| `bun run format:check`  | oxfmt in check mode                                            |
| `bun run typecheck`     | `tsc -b`                                                       |

`bun run lint` does not cover type errors, failed tests or duplicated code. Use `bun run check` for
the complete gate.

## Testing

Vitest runs with jsdom and Testing Library across three independent projects: `app` for `src/`,
`build` for the Vite plugins, and `lint` for the local oxlint plugins. The projects share only the
runner. Tests are colocated with the files they cover.

- Globals are off. Import `describe`, `it`, `expect` and `vi` from `vitest` in every file.
- Render with `renderWithProviders` from `@/test/render`. To start from specific state, build a
  store, seed it, and pass it in.

  ```tsx
  const store = createStore();
  store.set(newTodoPriorityAtom, 'high');
  renderWithProviders(<PriorityPicker />, { store });
  ```

  This helper provides the app's route tree, allowing components with a `<Link>` to render without
  creating another router. An invalid `to` then fails the test. When active state matters, pass a
  nested `path` and assert the destination and `aria-current` state.

- To test a route, `renderRoute('/todos?filter=done')` runs its `validateSearch`, its loader, and the
  address changes caused by clicks. `src/routes/todos/index.test.tsx` is the only route test and
  uses no mocks. The remaining tests render named components for a faster, more explicit scope.

  Cache regressions stay inside one rendered route and one QueryClient. The detail regression loads
  a todo, navigates back to the list, deletes it through the UI, then revisits the detail address
  through the same router and verifies the not-found screen replaced every trace of stale content.
  Remounting with a fresh client would miss the bug.

- Mock the feature's `.api.ts` and leave the query definitions alone. That keeps the real
  `queryOptions` wiring under test. The transport layer stays free of React Query for this reason.
  Route tests ordinarily use the existing fake server. Reserve an API mock for a transport state
  it cannot produce, such as an initial failure used to establish whether the feature or router
  owns the error.
- Query by role and accessible name. `jsx-a11y` is on and the tests query the way a screen reader
  reads, so an accessibility regression fails the suite.
- Coverage thresholds are 90 across statements, branches, functions and lines. That is a floor
  against a feature landing untested. Raise the threshold as coverage improves; do not lower it.

## Quality gates

[`.oxlintrc.jsonc`](.oxlintrc.jsonc) errors on the `correctness`, `suspicious`, `pedantic` and
`perf` categories, and runs type-aware rules against the real TypeScript program. The full list is
in that file, and `.agents/skills/lint-rules/SKILL.md` explains the reasoning behind each rule. The
following bans shape day-to-day code:

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

Other rules ban `any`, non-null `!`, `console` and `@ts-ignore`. All exported functions, including
components, declare their return type. The limits are 400 lines per file, 40 lines per function,
and a complexity of 15, with tests exempt from the first two. `import/no-cycle` catches direction
mistakes that path patterns cannot express. Because no published plugin covers Jotai, three local
rules live in `lint/jotai.ts`. The `ui/no-raw-element` rule in `lint/ui.ts` allows layout, text,
lists, media and SVG while rejecting other JSX elements. A raw `<button>` or `<input>` therefore
fails lint immediately. Its allowlist also means `bunx shadcn add textarea` needs no rule change.

Duplication is checked twice: `dry/no-identical-functions` from `lint/dry.ts` rejects a second
function in one file whose body matches an earlier one, and `bun run dupes` runs
[jscpd](https://jscpd.info) across `src`, `build` and `lint` to catch the copies that span files.

`tsconfig.json` runs `strict` plus `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
`noPropertyAccessFromIndexSignature` and `noImplicitReturns`.

The pre-commit hook in `.githooks/` formats and lint-fixes staged files, re-stages the fixes, then
runs `tsc -b`. It includes every format oxfmt reads, including YAML and JSON, because `check` checks
workflow files as well as components. The hook refuses partially staged files to avoid adding their
unstaged changes to the commit. Bypass it with `git commit --no-verify`.

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to `main` and every pull
request. It installs Bun at the version in `.bun-version`, runs `bun install --frozen-lockfile`,
then `bun run check` and `bun run build`.

The workflow stays limited to those commands, making CI failures reproducible locally with the same
one-line check. `build` remains a separate step because `check` typechecks but does not confirm that
`vite build` succeeds.

[Renovate](https://docs.renovatebot.com) handles dependency updates according to
[`renovate.json`](renovate.json). TanStack packages arrive in one PR because their types reference
each other. Oxlint and its toolchain form another group because version skew can make `check` report
what looks like a code problem. Minor devDependency updates automerge after CI passes. Install the
Renovate GitHub App on the repository to enable the configuration; the file is inert until then.

## Build output

`bun run build` typechecks, then writes a static bundle to `dist/`. Three local Vite plugins in
`build/` run after it:

- `build/images.ts` re-encodes png, jpeg, webp and avif through
  [sharp](https://sharp.pixelplumbing.com) and runs SVGs through [svgo](https://svgo.dev). It only
  keeps a rewrite when the result is smaller, leaving already optimised assets untouched.
- `build/brotli.ts` writes a `.br` beside every text asset over one MTU, since below that a smaller
  file still costs the same round trip. Fonts and images are skipped: both come back larger.
- `build/report.ts` prints the size tables, grouped by asset kind, showing transfer size rather
  than raw size.

Vendor code is split into `vendor-react`, `vendor-tanstack` and a catch-all `vendor` chunk, so
adding a dependency does not rehash the chunk your users already have cached.

## Configuration

Copy `.env.example` to `.env`. Only `src/lib/env.ts` reads `import.meta.env`; other modules import
the parsed `env` object. An invalid value throws at module load and names the affected key, stopping
the app before the first paint and preventing `undefined` from propagating through later layers.

- Adding a variable takes one line in `envSchema` and one line in `.env.example`.
- Give every variable a `.default()` so a fresh clone can run without an `.env` file. Validation
  catches invalid values, while the default handles missing ones.
- Raw values are always strings: `z.stringbool()` for booleans, `z.coerce.number()` for numbers.
- Only `VITE_`-prefixed variables reach the browser.
- `.env` is read at build time, so `dist/` is baked per environment. Anything that must change
  without a rebuild needs a runtime mechanism, such as a `/config.json` fetched at startup.

## Deployment

The output is a static single-page app that can run on Netlify, Vercel, Cloudflare Pages, S3 with
CloudFront, nginx, or another static host. Configure two things:

1. An SPA fallback, rewriting unmatched paths to `/index.html`. Without it a deep link returns 404.
   Leave hashed assets under `/assets/` out of the rewrite.
2. Serving the precompressed files, which is the point of the brotli step. nginx needs
   `brotli_static on`; object storage needs `Content-Encoding: br` set on upload. Netlify, Vercel
   and Cloudflare already compress at their edge, so the `.br` files are harmless there and the
   plugin can be removed from `vite.config.ts`.

There is no server-side rendering here. See the [FAQ](#faq) if that is a requirement.

## Starting your own project

1. Delete `src/features/todos/` and `src/routes/todos/`, then point `src/routes/index.tsx` at your own
   page. The todos feature is a self-contained worked example, and no other code imports it.
2. In `index.html`, replace the `https://example.com/` placeholders on `og:url` and `og:image` with
   real absolute URLs. Scrapers discard relative OG URLs, and an empty `content=""` is worse than an
   absent tag. Update the sitemap line in `public/robots.txt` while you are there.
3. Keep the `theme-color` meta in `index.html` in step with the light `--background` in
   `src/styles/index.css`. It is hand-mirrored hex and drifts silently.
4. Replace `public/icon.svg` with your own mark, then add a real `favicon.ico` and
   `apple-touch-icon.png` beside it and uncomment the two links in `index.html`. Safari below 26
   ignores the SVG icon.
5. Install the Renovate GitHub App if you want `renovate.json` to do anything, and check
   `.bun-version` matches the Bun you actually run.
6. Rewrite this README and update `LICENSE` with your own name.
7. Read [`AGENTS.md`](AGENTS.md) before adding a feature, or point your agent at it. It links the
   topic guides in `.agents/skills/`, which is where the layer-by-layer detail lives.

## FAQ

### Why Bun if Vite is still the bundler?

Bun is the package manager and script runner. It provides fast installs, runs `bunx` without a
separate cache, loads `.env` without `dotenv`, and executes TypeScript files without a build step.
That last feature allows the pre-commit hook to use readable TypeScript. Vite handles the dev
server, HMR and production build.

### Can I use npm or pnpm instead?

Yes. Dependencies install and the app builds, but three pieces need porting:
`.githooks/pre-commit.ts` uses `Bun.spawn`, the `prepare` script wires the hooks path, and
`.github/workflows/ci.yml` installs Bun from `.bun-version`. Replace or remove the hook and change
the CI setup step. The rest of the repository is package-manager agnostic, including everything in
`src/`.

### Why is `useEffect` banned?

In this architecture, most `useEffect` calls are derived state or data fetching. Derived state
belongs in a derived atom, and TanStack Query handles fetching. The import ban catches these cases
while you type. An effect still makes sense for work such as subscribing to a browser API, and that
exception requires one comment line.

`useState` remains available for local state that no other component reads.

### Why oxlint instead of ESLint?

Mostly speed. The Rust rules cover the repository in milliseconds, so linting fits inside a
pre-commit hook and an agent loop. For the rules used here, the type-aware tier through
`oxlint-tsgolint` provides the same coverage as `typescript-eslint`.

ESLint plugins without an oxlint equivalent (TanStack Query, TanStack Router, Testing Library,
jest-dom, and the local Jotai plugin) run through oxlint's JS plugin bridge. That bridge is alpha,
outside semver, and the one moving part to consider before adopting this setup.

### Why not Next.js or Remix?

This is a client-rendered SPA with no server. Use a server framework for server-side rendering,
streaming, server actions, or content that must be crawlable without JavaScript. This template fits
apps behind a login, internal tools, and dashboards that do not benefit from a server runtime or its
additional deployment surface. Its build output is a set of static files that can be hosted in a
bucket.

### Does this work with Cursor, Codex, Copilot or opencode?

Yes. The conventions live in `AGENTS.md`, the shared convention these tools have converged on, and
`CLAUDE.md` is a symlink to it. Topic guides under `.agents/skills/` follow the
[Agent Skills](https://agentskills.io) format. Agents that support skills load the relevant guide
automatically; other agents find the same guide through the table at the top of `AGENTS.md`. There
is only one copy of each guide. `opencode.json` and `.mcp.json` configure the shadcn MCP server for
opencode and Claude Code, respectively. When adding another agent, add its config directory to
`ignorePatterns` in `.oxfmtrc.jsonc` so oxfmt leaves vendored skill copies unchanged.

### How do I add a shadcn component?

```sh
bunx shadcn@latest add dialog
```

The command writes to `src/components/ui/`, which is treated as generated output. Oxlint, oxfmt and
the coverage config skip that directory because a later CLI run would overwrite manual lint fixes.
Review what the CLI installed, and add new packages to `package.json` if they appear only in
`node_modules`. Put components shared across features in `src/components/`; components used by one
feature belong in that feature's folder.

### Where do I put a component two features share?

Put it in `src/components/`. A component that depends on feature state belongs to that feature, and
other features should import it through the feature's barrel. Keep `src/lib/` for infrastructure;
modules that name a feature do not belong there.

### Is there a live demo?

No. The example transport (`src/features/todos/todos.api.ts`) is an in-memory server substitute.
Run `bun run dev` to exercise loading, error and not-found states without a backend.

## License

[MIT](LICENSE).
