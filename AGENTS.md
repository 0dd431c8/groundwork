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
- Vite only exposes env vars prefixed `VITE_`, via `import.meta.env`. App code reads them
  through `src/lib/env.ts`, never directly; see "Configuration"

## Layout

- `index.html` is the Vite entry. See "Theme" below for the inline script in its `<head>`,
  and "Document head" for what the static metadata can and cannot do.
- `public/` is copied into `dist/` under the same names and served at `/`, for files that need
  an exact name at a known URL: `icon.svg` and `robots.txt` today, plus `favicon.ico` and
  `apple-touch-icon.png` when someone makes them. Anything a module can `import` belongs in
  `src/` instead, so it gets hashed and revved. Names survive the copy but bytes do not:
  `images()` re-encodes anything it recognises, here and in `dist/assets/` alike. See "Build
  and tooling".
- `build/` is the build-time code `vite.config.ts` imports, so the config itself stays a list
  of options: `report.ts` draws the three tables, `brotli.ts` and `images.ts` are the two local
  plugins. It is Node code, tested under its own Vitest project against a temporary `dist/`.
  See "Build and tooling" and "Testing".
- `lint/` is the local oxlint plugin, `jotai.ts`, loaded through `jsPlugins` because nothing
  published lints Jotai. Node code like `build/`, with its own Vitest project; its tests drive
  the real oxlint binary rather than a RuleTester, which oxlint does not ship. See "Lint rules
  worth knowing" and "Testing".
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
  up (`router.ts`, `query-client.ts`, `store.ts`), the validated `env.ts` (see "Configuration"),
  and generic utilities (`utils.ts`). Feature code does not go here. If a module names a
  feature, it belongs in `src/features/`.
- `src/components/` is for components shared across features. Right now that is only the
  vendored `ui/` directory.
- `src/styles/index.css` is the single stylesheet: Tailwind v4 import, theme tokens for
  `:root` and `.dark`, and `@layer base` rules.

## Feature structure

A feature folder is flat. Stay that way until it hurts, which in practice is somewhere past
15-20 source files, and is about scrolling to find things rather than anything structural.
`src/features/counter/` is six source modules, nowhere near it.

- Every feature has an `index.ts` naming what it exports, and that is the only path anything
  outside may import: `@/features/counter`, never `@/features/counter/count-list`. What a
  feature exports is its own business - one component, several, a hook, a type - so nothing
  here prescribes what the entry has to be or what it is called. `src/features/counter/`
  happens to export a single `CounterPanel` that composes `Counter`, `SaveCountButton` and
  `SavedCountList`, which keeps `src/routes/index.tsx` from owning how a feature's pieces stack,
  but
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
  needs both, since it subscribes the component to the value. `jotai/prefer-narrow-hook` in
  `lint/jotai.ts` enforces this, along with the `Atom` suffix and the ban on creating an atom
  during render; see "Lint rules worth knowing".
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

- `src/features/counter/save-count-button.tsx` is where the two layers meet, and is the
  clearest thing to read first: the value being saved comes from `countAtom`, the saved list
  comes from the query cache, and nothing copies one into the other.
- Define queries with `queryOptions` in `<feature>.queries.ts`, exporting the key separately
  (`countsKey`) so the definition and every `invalidateQueries` call cannot drift apart. Pass
  the whole object to `useQuery(countsQuery)`.
- Mutations get a custom hook in the same file (`useSaveCount`), never an inline `useMutation`
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
- Wrap the call: `queryFn: () => fetchCounts()`, not `queryFn: fetchCounts`. React Query passes
  a context object into query and mutation functions, and a bare reference means the transport
  silently receives it.
- `src/lib/query-client.ts` is left on the library defaults on purpose, including `staleTime: 0`,
  so refetch-on-focus is visible in the devtools rather than a mystery later.
- `jotai-tanstack-query` is deliberately not installed. Plain `useQuery`/`useMutation` next to
  plain atoms is what keeps the boundary above legible. The thing that would justify adopting it
  is a derived atom that has to read server data; until an atom needs that, it buys nothing.

## Configuration

`src/lib/env.ts` is the only module that reads a `VITE_` variable off `import.meta.env`.
Everything else imports the parsed `env` object from it. The schema is a zod `z.object()`, and
a failed parse throws at module load with `z.prettifyError` naming the key, so a bad value
fails the first paint rather than becoming `undefined` three layers down.

- Adding a variable is one line in `envSchema` and one in `.env.example`. Both, always: a
  variable nobody can discover is a variable nobody sets.
- Every variable needs a `.default()`. A fresh clone with no `.env` has to run, so validation
  is there to catch a _wrong_ value, not a missing one.
- Raw values are always strings. Use `z.stringbool()` for booleans, which takes `true`, `1`,
  `yes`, `on`, `y`, `enabled` and their opposites case-insensitively, and `z.coerce.number()`
  for numbers.
- `.default()` takes the **output** type, so it is `z.stringbool().default(false)`, not
  `.default('false')`. `.prefault()` is the one that takes the input type and runs it through
  the parse. Getting this backwards type-errors, but the error points at the wrong thing.
- The whole `import.meta.env` object is handed to `safeParse`, rather than a hand-written map
  of keys. Vite's `define` plugin replaces a bare `import.meta.env` with the full serialised
  object at build time, not just literal member accesses, so this works in a bundle and not
  only under the dev server. `safeParse` takes `unknown`, so nothing untyped escapes, and it
  saves augmenting `ImportMetaEnv` - which `noPropertyAccessFromIndexSignature` would otherwise
  force for every single dot access.
- `import.meta.env.DEV`, `.PROD` and `.MODE` stay directly accessible everywhere. Being
  statically replaced is the entire point of them, and `z.object` strips them from `env`.
- `src/routes/__root.tsx` keeps the `import.meta.env.DEV` guard in front of
  `env.VITE_ENABLE_DEVTOOLS`, so the variable can only turn the devtools off in dev, never on in
  prod. That is a statement of intent, not a bundle optimisation: measured both ways, and with
  the `DEV` guard removed outright, the built output is the same to within 0.2 kB, because the
  two TanStack devtools packages already resolve to production no-ops. Keep the guard anyway -
  it is what makes the branch provably dead if that ever stops being true.
- `envPrefix` and `envDir` are left at their defaults. `.env` is read at build time, so `dist/`
  is baked per environment; anything that has to change without a rebuild needs a different
  mechanism, such as a `/config.json` fetched at startup.
- `.env.example` is committed. `.env`, `.env.local` and `.env.*.local` are gitignored.
- zod is the one dependency here that is not free: it costs 14.45 kB brotli, taking the bundle
  from 105.52 kB to 119.97 kB. `zod/mini` was measured at 3.78 kB and passed over, because its
  functional form is `z._default(z.stringbool(), ...)`, which trips `no-underscore-dangle` and
  reads worse with every variable added. The bet is that a real app wants zod for forms and API
  parsing anyway, at which point this is paid for. If that never happens and the bundle matters,
  `zod/mini` is a ten-line swap plus one lint exception.
- Deliberately not installed: `@t3-oss/env-core`, whose value is the server/client split and the
  runtime guard against reading a server variable in client code, neither of which means
  anything without a server; and `vite-plugin-validate-env`, which would need the schema to live
  outside `src` so `vite.config.ts` could import it, crossing the tsconfig project split for a
  build-time error the boot-time throw already gives.
- Tailwind v4's automatic source detection used to scan this file too, so a plain English word
  in this prose could emit a utility class and its breakpoint media queries into `dist`. That
  is where a mysterious 270 bytes of CSS came from once, while writing the section above, and
  the word "container" in a `vite.config.ts` comment later cost 272 more. Detection is now
  explicit rather than automatic, so prose anywhere is inert; see "Build and tooling".

## Theme

`<html>` carries no class in the markup. A synchronous inline script in `index.html` puts
`.dark` on it before first paint, which is what makes both the `:root` and `.dark` token
blocks in `src/styles/index.css` live rather than one of them dead code.

- The contract is `localStorage['theme']`: `'light' | 'dark'`, and **absent means follow
  `prefers-color-scheme`**. Nothing writes the key yet, so today the script reduces to
  honouring the OS, which is the correct default with no toggle UI.
- A toggle should be a `theme.state.ts` atom using `atomWithStorage` on the same key with
  `{ getOnInit: true }`, per "State" above. It needs no change to `index.html`.
- The script has to stay inline and untyped. `type="module"` is deferred, so the page would
  paint the wrong palette and correct itself on mount. That also makes it the one thing in
  the repo needing a nonce or hash if a Content-Security-Policy is ever added.
- The two `theme-color` metas are hand-mirrored hex copies of `--background` (`#ffffff` and
  `#0c0a09`). They drift silently, which is exactly how the previous `#111213` got there, so
  change them with the token. They are media-scoped, so browser chrome follows the OS even
  when a stored value overrides the page; fix that in whatever adds the toggle.

## Document head

`index.html` is the only head a social scraper sees, since Slack, LinkedIn and X do not run
JS. So site-level metadata is static there, and every tag ships with a real value: an empty
`content=""` is worse than an absent tag, because a scraper treats the property as answered
and stops looking for a fallback. An empty URL attribute is worse still, since it resolves
to the document's own URL and makes the client fetch the page as an image.

`og:url` and `og:image` are `https://example.com/…` placeholders; replace them, keeping them
absolute, since relative OG URLs are discarded.

Per-route titles are the job of TanStack Router's `head` route option plus `<HeadContent />`
in `__root.tsx`, not of more tags here. Worth adding once there is more than one route;
it does nothing for link previews.

## Build and tooling

- `bun run dev` starts Vite. `bun run build` runs `tsc -b` then `vite build`.
- Two TypeScript projects: `tsconfig.json` covers `src`, and `tsconfig.node.json` (which
  extends it) covers `*.config.ts`, `.githooks/`, `build/` and `lint/`. Build mode is what
  checks both, so use `tsc -b`; plain `tsc` silently skips the referenced project.
  `tsconfig.node.json` must emit (TS7 forbids `noEmit` on a referenced project), so it emits
  declarations only, into `node_modules/.tmp/`. Tooling files can't import from `src`: a
  composite project has to list every input file, so `@/...` there fails with TS6307.
- Everything `vite.config.ts` reaches carries an explicit `.ts` on the import, unlike `src`.
  Vite's config loader has a `native` mode, planned to become the default, that does not
  resolve an extensionless import; today it only warns, and the warning names the line.
- Tailwind v4 is configured through `@tailwindcss/vite`, not a `tailwind.config.js`. Theme
  tokens live in `@theme inline` in `src/styles/index.css`.
- That file imports Tailwind as `@import 'tailwindcss' source(none)` and then names its sources
  itself: `src/**/*.{ts,tsx}` and `index.html`. Automatic detection scans every non-gitignored
  file in the repo, so an English word in prose or in a code comment emits a utility and every
  breakpoint media query attached to it. That was not theoretical: `filter`, `fixed`, `hidden`,
  `isolate`, `static`, `table`, `transform`, `transition`, `visible` and `container` were all
  being emitted out of documentation and config comments, 2.3 kB of CSS matching nothing in the
  app. `@source not` is the documented remedy and it is not enough here, because `AGENTS.md` is
  reached through the `CLAUDE.md` symlink and excluding either name leaves it scanned. Adding a
  source is one line; the thing to avoid is going back to detection-by-default. Verify a change
  by putting a real utility in a doc and confirming the CSS does not grow, then in a component
  and confirming it does.
- oxfmt sorts Tailwind classes itself, through `sortTailwindcss` in `.oxfmtrc.jsonc`. It is
  prettier-plugin-tailwindcss's algorithm built into the formatter, so it costs no dependency
  and no second pass. Both options it is given are load-bearing. `stylesheet` points at
  `src/styles/index.css`; without it the `@theme inline` tokens are unknown classes, so
  `bg-primary` and `text-primary-foreground` get parked at the front of the list rather than
  sorted into it. `functions` names `cn` and `cva`, without which the class strings inside
  those calls are left alone, and that is most of what a component writes.
  `src/components/ui` is in `ignorePatterns`, so vendored shadcn output keeps the order
  upstream shipped. `sortImports` is the other half of the same feature and is deliberately
  off: it would rewrite the import block of 16 of the repo's source files, splitting type
  imports off and inserting blank lines between groups.
- Vendor chunking is set in `vite.config.ts` under `build.rolldownOptions.output.codeSplitting`.
  Groups match in order and the last one is a `node_modules` catch-all, so new packages land
  in a long-lived vendor chunk rather than in route chunks. The groups are deliberately
  untagged: Rolldown's `tags: ['$initial']` scopes a group to what the entry reaches
  statically, and since `autoCodeSplitting` makes every route a dynamic import, adding it
  moved 47 kB (jotai, base-ui, cva, clsx, tailwind-merge) out of the preloaded vendor chunks
  and into `routes-*.js`, which rehashes whenever any route component changes. Same total
  bytes, worse caching. If one route ever owns a genuinely heavy dependency, give that
  package its own group instead.
- Path alias `@/*` is declared once, in `tsconfig.json` under `paths`. Both `vite.config.ts`
  and `vitest.config.ts` read it via `resolve.tsconfigPaths` (Vite 8, off by default) rather
  than repeating a `resolve.alias`. It only applies to files the owning tsconfig `include`s,
  which is `src` - the same reason tooling files can't use `@/...`.
- `build.target` is left at Vite's `baseline-widely-available` default. That is fixed per Vite
  major, currently 2026-01-01, resolving to chrome111, edge111, firefox114, safari16.4 and
  ios16.4. A Vite 9 upgrade will raise it silently, so pin `build.target` if the support
  matrix ever becomes a commitment. `modulePreload` stays on for the same reason: firefox114
  and safari16.4 have no `<link rel="modulepreload">`.
- Source maps are not emitted. `sourcemap: 'hidden'` only drops the `//# sourceMappingURL`
  comment, so it still writes the maps and any deploy of `dist/` publishes them at a guessable
  URL. Turn it on only together with a deploy step that uploads them to an error tracker and
  then deletes `dist/**/*.map`.
- For bundle analysis, `bun add -D @vitejs/devtools` and set `devtools: true` (build mode
  only, experimental). `rollup-plugin-visualizer` is a Rollup plugin and does not apply.
- The local `brotli()` plugin in `build/brotli.ts` writes a `.br` beside every asset matching
  `PRECOMPRESS` that is at least `MIN_BYTES`, then prints a raw-to-compressed table. On this
  bundle that is 119.6 kB against 443.7 kB uncompressed. `node:zlib` already does brotli, so
  this is a `closeBundle` hook rather than a dependency; `vite-plugin-compression2` was tried
  first and dropped, because it emits through `this.emitFile` and there is no option to keep
  the `.br` files out of Vite's own asset listing, where they sort by size in among the
  originals they duplicate.
- A second table follows it, `dist/ total`, which is what the deploy weighs: every file in
  `dist/` counted once, bucketed into js, css, fonts, images and other, raw against what a
  server sends (the `.br` where one exists, the file itself otherwise). It is there because the
  brotli table answers a narrower question - it lists only the files that got compressed, so
  the 530 kB of font subsets and everything under one MTU are missing from its total. The walk
  `stat`s every file and reads only the ones it compresses, so those fonts are never loaded
  into memory. Both tables come out of that one walk, which is why this is one plugin and not
  two.
- All three tables render through the one `table()` in `build/report.ts`, because they are the
  same shape and the padding arithmetic only has to be right once. Colour comes from `styleText` in `node:util`,
  not `picocolors`: it inspects `process.stdout` itself for TTY, `NO_COLOR`, `FORCE_COLOR` and
  `TERM=dumb`, and returns the string untouched when colour is unwanted, so a build piped into a
  log file stays plain with no flag to remember. Node and Bun both implement it, so like
  `node:zlib` above it costs no dependency. Filenames tint by the same bucket `dist/ total`
  groups on (js cyan, css magenta, fonts yellow, images blue), matching Vite's own asset
  listing; green is reserved for the output column and appears only when a file actually got
  smaller, which is what makes `fonts 530.58 kB → 530.58 kB` legible as a no-op without a column
  saying so. The one trap when editing this: column widths must be measured on the plain string,
  since `padEnd` counts escape bytes as characters and would shift every row by the width of its
  own colour codes. `build/report.test.ts` asserts exactly that, by rendering the same rows twice
  and comparing the stripped colour run to the plain one; for the real build, diff a run under
  `script -q /dev/null` with the escapes stripped against a plain piped run.
- The `images()` plugin in `build/images.ts` re-encodes every png, jpeg, webp, avif and svg in
  `dist/` in place, and prints the same shape of table above the other two. sharp does the
  rasters (`quality: 80`, mozjpeg for jpeg, `palette: true` for png, which is the quantisation
  that does the real work) and svgo the svg. It rewrites a file only when the result is smaller,
  so an already-optimised jpeg is left alone and a second pass over the same `dist/` is a no-op.
  Measured on fixtures: 67% off a 5.8 MB noise png, 72% off a 2.4 MB jpeg, and `icon.svg` 447
  bytes to 224.
- Two lines in it are load-bearing. `sharp(raw).autoOrient()` has to come first, because
  `toBuffer()` strips all metadata including the EXIF orientation tag, so without it a phone
  photo ships rotated: verified with a fixture tagged `Orientation: 6`, which comes out
  1200x1600 upright rather than 1600x1200 sideways. And the svgo call passes no `overrides`,
  because v4 dropped `removeViewBox` from `preset-default` - configuring a plugin the preset
  does not contain just logs a warning on every build.
- gif and ico are deliberately skipped. sharp keeps only the first frame of a gif unless the
  input is opened with `{ animated: true }`, and a silently de-animated gif is worse than an
  unoptimised one; ico is a multi-resolution wrapper it does not round-trip.
- The work is in `writeBundle` while the table waits for `closeBundle`. That is not cosmetic:
  every `writeBundle` resolves before any `closeBundle` starts, which is what makes `brotli()`
  precompress the _minified_ svg and the `dist/ total` figures count the re-encoded bytes.
  Verified both ways - a 33 kB svg reaches brotli as its optimised 9.75 kB, and a 4.3 kB one
  that optimises to 1.29 kB correctly drops below `MIN_BYTES` and gets no `.br` at all. Vite
  copies `public/` at `renderStart`, long before either hook, so one walk covers `public/` and
  the hashed `dist/assets/` alike. Optimising after emit does mean an asset's content hash is
  of its pre-optimisation bytes, which is harmless unless something starts checking SRI.
- What `images()` cannot reach: anything under `build.assetsInlineLimit` (Vite's default 4096
  bytes) is base64'd into the JS or CSS and never becomes a file. Per import, `?no-inline` opts
  out; globally, `assetsInlineLimit: 0` does, at the cost of extra requests. Left at default.
- Three constants there are load-bearing. `PRECOMPRESS` is an allowlist rather than a woff2
  denylist: woff2 is already brotli inside, so the font subsets come back a few bytes
  _larger_, and they are 440 kB of `dist/assets/`. `MIN_BYTES` is one MTU, under which a
  smaller file still costs the same single round trip. And the hook is `closeBundle`, which
  is the part that runs after Vite has printed.
- `build.reportCompressedSize` is off. It made Vite gzip every chunk to print a column for a
  compression this build does not ship, and the table above replaces it. It cost about 18ms
  of a 170ms build, so speed was not the reason.
- The server still has to be told to prefer the `.br`: nginx wants `brotli_static on`, Caddy
  `precompressed br`, S3 behind CloudFront wants the object metadata. Netlify and Vercel
  compress on the fly and never serve a sibling `.br`, and Cloudflare will not fetch one from
  an origin, so on those three the files are inert rather than harmful.

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
do not downgrade TypeScript without removing this first. It costs about 0.2s here, taking a
run over `src`, `build` and `lint` from 0.10s to 0.30s. The rules are `no-floating-promises`,
`no-misused-promises` (an `async` function passed to `onClick`), `await-thenable`,
`require-await`, `no-unnecessary-condition`, `switch-exhaustiveness-check`,
`no-unnecessary-type-assertion`, `no-array-delete`, `prefer-promise-reject-errors`,
`no-deprecated`, and the `no-unsafe-*` set that stops `any` spreading out of an untyped edge.
`no-deprecated` is the one that keeps this file honest without a re-audit: it fails the build
the first time React, TanStack or Jotai marks something deprecated, so a version bump surfaces
the migration here rather than in a changelog nobody read.

**JS plugins.** `jsPlugins` runs real ESLint plugins through oxlint's JS bridge. Five are
loaded: `@tanstack/eslint-plugin-query` as `query`, `@tanstack/eslint-plugin-router` as
`router`, the local `./lint/jotai.ts` as `jotai`, plus `eslint-plugin-testing-library` and
`eslint-plugin-jest-dom` under their own names. The bridge is alpha and not covered by semver,
and it is the expensive half of a lint run: 0.30s to 0.60s over `src`, `build` and `lint`,
against 0.30s without it. Five things to know before touching it. The native plugin names are
reserved, `react`, `typescript`, `import`, `vitest` and the rest, so a colliding plugin needs an
alias, which is what the `{ name, specifier }` form is for and what rule names then use;
`testing-library` and `jest-dom` collide with nothing, so they are plain strings. A specifier
can be a path as well as a package, which is what makes a local plugin possible. Categories do
not reach these rules, so every one is listed in `rules` by hand; the plugins' own `recommended`
config is not readable from here. A rule that wants type information gets none:
`no-void-query-fn` returns early when `parserServices` is missing and checks nothing, which is
why it is left out rather than set to `"error"` and believed. And fixers do work, so
`oxlint --fix` reorders a `useMutation` and the pre-commit hook fixes these like any other rule.

**Rules of React.** `react/react-compiler` runs the React Compiler's own analysis in
lint-only mode, and it is the only tier here that sees the Rules of React rather than just the
Rules of Hooks: setState during render or synchronously in an effect, reading or writing a ref
during render, mutating props, state or a value returned from a hook, calling an impure
function during render, defining a component inside another component, `useMemo` used for a
side effect, and state derived in an effect that belongs in render. The compiler ships inside
the oxlint binary, so it costs no dependency and, measured both ways, no time either. It is a
`nursery` rule, so the categories do not reach it and an oxlint minor can change what it
reports; that is the price, and it is worth paying for the only rule in the file that
understands what React actually guarantees. `react/exhaustive-deps` (correctness) and
`react/rules-of-hooks` (pedantic) arrive through the categories and stay the cheap first line.

Four `restriction` rules are named alongside it, all house style, with nothing in `src`
violating them: `button-has-type`, `no-danger`, `no-clone-element`, and
`prefer-function-component`, which is the one that says React 19 here means function components
only. `only-export-components` is the fifth, and it is off for two directories rather than
weakened: `src/components/ui`, because `buttonVariants` next to `Button` is how shadcn ships it,
and `src/routes`, because a file-based route module has to export `Route` and the component it
names lives beside it. `allowExportNames: ["Route"]` does not help there - it exempts the export
without exempting the local component, which was checked before the rule was scoped instead.

**Escape hatches.** `no-explicit-any`, `no-non-null-assertion` (`!`), `no-console`, and
`ban-ts-comment`: `@ts-ignore` is banned outright, `@ts-expect-error` needs a description and
starts failing once the underlying problem is fixed.

**Contracts.** `explicit-module-boundary-types` means exported functions declare their return
type, components included (`import type { JSX } from 'react'`, then `: JSX.Element`). An
inferred type that is subtly wrong becomes an error at the boundary rather than downstream.

- Four bans in `no-restricted-imports`, each with the same escape hatch: an inline
  `// oxlint-disable-next-line no-restricted-imports` plus a justification comment.
  `useEffect` from `react`, because derived state and event handlers cover it.
  `forwardRef` from `react`, because React 19 passes `ref` as an ordinary prop.
  `createContext` and `useContext` from `react`, because Jotai owns client state and React
  Query owns server state, so Context here would be a third place to look.
  `getDefaultStore` from `jotai`, because `src/lib/store.ts` wires an explicit `createStore()`
  that `main.tsx` hands to `<Provider>`; the default store silently bypasses it, so reads and
  writes land in a store nothing rendered against and tests stop being isolated. All four see
  named imports only: `import React from 'react'` then `React.forwardRef` slips through.
- `max-lines` 400, `max-lines-per-function` 40, `complexity` 15. Test files are exempt.
- `@/features/*/*` is restricted, so a feature is reachable only through its `index.ts` and its
  internals stay internal. Inside a feature you import relatively, which the same rule pushes
  you towards. There is no exemption for particular filenames, deliberately: the rule should not
  care what a feature chooses to call its parts.
- Three overrides make the layer boundaries from "Feature structure" enforceable rather than
  leaving them as prose. `src/features/*/*.state.ts` cannot import `./*.queries`, `./*.api`,
  `@tanstack/react-query`, or `react` at all: client state never reaches up into the
  server-state layer, and an atom is a plain value, which is what lets `counter.state.test.ts`
  drive one through a bare `createStore()`. Banning the relative path alone would still leave
  the package importable directly, which is why both are named.
  `src/features/*/*.api.ts` cannot import `@tanstack/react-query`, `react` or `jotai`: the
  transport is the one layer with no framework in it, and that is what keeps
  `vi.mock('./counter.api')` meaningful while the real `queryOptions` still runs.
  `src/features/*/*.tsx` cannot import `useMutation` or `useQueryClient`, because what a
  mutation invalidates is a fact about the data rather than about the widget that triggered it,
  so a component should never name a query key; `useQuery(countsQuery)` stays fine. That glob
  covers `*.test.tsx` deliberately - a test reaching for a raw client is testing the wiring,
  not the feature.
- `import/no-cycle` is on. It is the backstop for direction mistakes the two patterns above
  cannot name, since most of them close a loop.
- The `query/*` rules are the "Server state" section above made enforceable rather than left as
  prose: `exhaustive-deps` on the `queryKey`, `stable-query-client`, `no-rest-destructuring`,
  `no-unstable-deps`, and the two property-order rules. `prefer-query-options` is the one
  addition beyond the plugin's recommended set, and it is what pins a query to `queryOptions`
  in `<feature>.queries.ts` instead of an object literal at the call site.
- `router/create-route-property-order` and `router/route-param-names` are the whole router
  plugin. The first catches a `beforeLoad` written after the `loader` that reads its return.
- The `jotai/*` rules come from `lint/jotai.ts`, which exists because nothing published lints
  Jotai. `no-atom-in-render` is the one with a bug behind it: an atom factory called inside a
  component or hook hands every render a different atom config, and `useAtom` can loop on it.
  It allows module scope, a `useMemo`/`useRef`/`useState` wrapper, and a plain factory
  function, since only a component or hook name triggers it. `prefer-narrow-hook` catches
  `const [x] = useAtom(a)` and `const [, setX] = useAtom(a)`, which are the two shapes that
  should be `useAtomValue` and `useSetAtom`; it ships no fixer, because the fix has to rewrite
  the import too and a file left referencing an unimported hook is worse than the finding.
  `atom-suffix` requires a module-scope atom to be named for what it is, with `atomFamily`
  exempt because what that returns is a lookup function. All three follow the local binding
  rather than the name, so `import { atom as makeAtom }` is still matched and a locally
  declared `atom` is not.
- `react-perf` is on except `jsx-no-new-function-as-prop`. The other three,
  `jsx-no-jsx-as-prop`, `jsx-no-new-array-as-prop` and `jsx-no-new-object-as-prop`, are fixed
  by hoisting a constant out of the component. The function one is not: its only remedy is
  `useCallback` on every handler, which buys nothing while the child is not memoised. It fires
  on three inline handlers in `src/features/counter/` today, all of them the same shape as
  `onClick={() => step(-1)}`. Turn it on only together with memoising the components on the
  receiving end.
- `vitest/prefer-importing-vitest-globals` and `vitest/no-identical-title` are the two vitest
  rules the enabled categories miss. The rest of what matters arrives through them already:
  `expect-expect`, `no-focused-tests`, `valid-expect`, `no-conditional-expect`,
  `no-conditional-in-test`, `no-disabled-tests`, `no-standalone-expect`, `valid-title` and
  `no-commented-out-tests`.
- `testing-library/*` and `jest-dom/*` are scoped by an override to `src/**/*.test.{ts,tsx}`
  and `src/test/**`, so they never look at `build/` or `lint/`. The lists are
  eslint-plugin-testing-library's `flat/react` config and jest-dom's `recommended` written out
  by hand, since a JS plugin's own presets are unreachable from here; `no-debugging-utils` is
  raised from the preset's `warn` to `error`, because a stray `screen.debug()` should fail CI
  rather than scroll past in it. The one exemption is `no-manual-cleanup` on
  `src/test/setup.ts`, disabled inline: the rule assumes Testing Library auto-registered
  `cleanup`, and with Vitest globals off it did not. Testing Library is in oxlint's JS-plugin
  conformance suite at 17,016 passing cases, so the bridge is less of a risk here than its
  alpha label suggests.
- oxlint has no `import/no-restricted-paths`; the above is built from `no-restricted-imports`
  patterns plus `overrides`. Two things to know before editing them. An override **replaces**
  this rule rather than merging, so the base entries are repeated verbatim in each of the three
  overrides that redeclare it; change one and you must change all four. Where an override bans
  a whole module the named-import entries for it are dropped rather than repeated, since the
  module ban subsumes them. And a `group` glob matches path segments, so `@/features/*` does
  not match `@/features/counter/counter` - that needs `@/features/*/*`. Both are easy to get
  wrong silently, so verify a rule change by writing a file that should fail and confirming it
  does.

Relaxed on purpose, so nobody re-enables them expecting an improvement:
`react/react-in-jsx-scope` is wrong under the automatic JSX runtime and is 44 of the 47
findings `suspicious` reports; `import/no-unassigned-import` would flag the CSS and jest-dom
side-effect imports, which are correct; `prefer-readonly-parameter-types` wants `readonly` on
every object parameter including React props, 13 findings and no bugs;
`no-confusing-void-expression` keeps `ignoreArrowShorthand` so `onClick={() => step(-1)}`
stays legal. Not enabled at all: the `style` category (oxfmt's job) and `restriction` as a
category (it bans `async`/`await`).

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
- Coverage thresholds are set to 90 across the board, over `src` and `build` alike. The suite is
  at 100% once wiring is excluded from `coverage.include` (the mount call, the three `src/lib`
  singletons, the route files, feature `index.ts` barrels: all exercised only by a real browser;
  and `build/test/**`, which is the harness rather than the thing under test). Treat this as a
  floor against a feature landing with no tests at all, not as a quality bar, since an
  assertion-free test satisfies it just as well. Raise it, never quietly lower it, and if
  something genuinely untestable drags it down, exclude that file with a reason rather than
  dropping the number.
- Tests are colocated: `src/**/*.test.{ts,tsx}`, next to the file under test inside the
  feature. `src/features/counter/` is the worked example of both layers: atom logic is driven
  through a bare `createStore()` with no React, component behaviour through Testing Library.
- Three Vitest projects, `app`, `build` and `lint`, because they share nothing but the runner:
  `app` is jsdom plus the React plugin and `src/test/setup.ts`, `build` is `build/**/*.test.ts`
  and `lint` is `lint/**/*.test.ts`, both under plain node with no setup at all. `setupFiles`
  is per-project and not per-file, so a single project would run `cleanup()` and
  `localStorage.clear()` against a Node test and throw. Run one on its own with
  `vitest --project build`.
- The `lint` tests spawn the real `oxlint` binary against a fixture file and a config in a
  temporary directory, then parse `-f json`, because oxlint has no RuleTester. That is slower
  than an in-process check - hence `testTimeout: 20_000` - and it is the point: the rules are
  never asserted against a parser other than the one that will run them. `lint/**` is excluded
  from coverage for the same reason, with the reason written next to it: the rules execute
  inside oxlint's process, so v8 instruments none of them however thoroughly the tests drive
  them. Do not lower the thresholds to accommodate that.
- The `build` tests drive the plugins the way Vite does: `build/test/harness.ts` calls
  `configResolved` with a stub carrying the only two fields they read, then the test awaits
  `writeBundle`/`closeBundle` itself against a temporary directory that stands in for `dist/`.
  Fixtures are generated by sharp at run time rather than committed, so there are no binaries
  in the repo and an encoder change shows up as a size assertion rather than a stale file.
  `useColor()` there pins `NO_COLOR`/`FORCE_COLOR`, since `styleText` reads the environment on
  every call and a table would otherwise assert differently under a TTY than in CI.
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
- `eslint-plugin-testing-library` and `eslint-plugin-jest-dom` run over the test files through
  oxlint. They are what pin `screen` queries over destructured ones, `findBy*` over
  `waitFor` + `getBy*`, one assertion per `waitFor`, and `toHaveClass`/`toBeChecked` over
  poking at attributes. See "Lint rules worth knowing" for the scoping and the one exemption.
- `src/test/setup.ts` also clears `localStorage` after each test. A fresh store alone does not
  isolate `atomWithStorage` atoms, because they re-read storage in `onMount`.
- `test.execArgv` in `vitest.config.ts` passes `--no-webstorage`. Node 25 defines a global
  `localStorage` whose methods are missing unless you pass `--localstorage-file`, and Vitest's
  jsdom environment skips any window key the Node global already has, so without this jsdom's
  `Storage` never gets installed (vitest-dev/vitest#8757).
- `vitest.config.ts` is standalone and does not merge `vite.config.ts`: that config constructs
  the tanstackRouter plugin, which rewrites the committed `src/routeTree.gen.ts` as a side
  effect. It repeats `resolve.tsconfigPaths`, which is one flag rather than an alias the two
  files would have to keep in sync.
- Globals are off. Import `describe`/`it`/`expect` from `vitest` in every test file. This
  avoids adding `vitest/globals` to the `types` array in `tsconfig.json`, and
  `vitest/prefer-importing-vitest-globals` errors on a file that forgets rather than leaving it
  to fail at run time.
- `src/test/setup.ts` loads the `@testing-library/jest-dom` matchers and calls `cleanup` in an
  `afterEach`, which Testing Library would otherwise register itself only under globals.
- `.oxlintrc.jsonc` exempts `src/**/*.test.{ts,tsx}`, `src/test/**` and `build/**/*.test.ts`
  from `max-lines` and `max-lines-per-function`.
- `"e2e": "playwright test"` is still declared without `@playwright/test` installed, so that
  script fails until someone adds it.
