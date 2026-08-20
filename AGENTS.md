# React boilerplate

A production-shaped starter: Vite 8, React 19, TanStack Router (file-based), TanStack Query,
TanStack Form, Jotai, Tailwind v4, shadcn, zod. Linted by oxlint, formatted by oxfmt, tested by
Vitest. Bun is the package manager and script runner; it is not the server or the bundler.

The rules here are enforced by `.oxlintrc.jsonc` and `tsconfig.json`, so breaking one fails
`bun run check` rather than review.

## Bun

`bun install`, `bun run <script>`, `bunx <package>`, `bun <file>` for one-off scripts. Bun loads
`.env` automatically, so do not add `dotenv`. Vite exposes only `VITE_`-prefixed vars, and app
code reads them through `src/lib/env.ts`.

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

## Commands

| Command                                              | What it does                                                |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| `bun run dev`                                        | Vite dev server                                             |
| `bun run build`                                      | `tsc -b` then `vite build`                                  |
| `bun run check`                                      | `format:check` + `lint` + `dupes` + `typecheck` + app tests |
| `bun run dupes`                                      | jscpd, copy-paste across `src`, `build` and `lint`          |
| `bun run test`                                       | Vitest watch, `app` project only                            |
| `bun run test:infra`                                 | Vitest watch, `build` and `lint` projects                   |
| `bun run test:coverage`                              | All three projects, v8 report in `coverage/`                |
| `bun run lint` / `lint:fix` / `format` / `typecheck` | The individual steps                                        |

**Run `bun run check` before claiming anything is done.** `bun run lint` alone passes while
types or tests are broken. No CI is configured, so this command is the only gate.

## Layout

| Path                   | Holds                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/routes/`          | File-based routes. `src/routeTree.gen.ts` is generated and committed; never hand-edit it.                                                  |
| `src/features/<name>/` | Everything belonging to one feature: schema, state, transport, queries, components, tests.                                                 |
| `src/lib/`             | Infrastructure only: `router.ts`, `query-client.ts`, `store.ts`, `env.ts`, `utils.ts`. A module that names a feature does not belong here. |
| `src/components/ui/`   | Vendored shadcn output. Treat as generated.                                                                                                |
| `src/styles/index.css` | The single stylesheet: Tailwind import, theme tokens, `@layer base`.                                                                       |
| `src/test/`            | `render.tsx` (`renderWithProviders`) and `setup.ts`.                                                                                       |
| `public/`              | Copied to `dist/` verbatim, for files needing an exact name at a known URL. Anything importable belongs in `src/` so it gets hashed.       |
| `build/`               | Vite plugins `vite.config.ts` imports (brotli, image optimisation, size tables).                                                           |
| `lint/`                | The local oxlint plugins `jotai.ts`, `dry.ts` and `ui.ts`, loaded through `jsPlugins`, and the ESTree shapes they share in `types.ts`.     |

`build/`, `lint/` and `*.config.ts` are a separate TypeScript project. They cannot import from
`src` or use the `@/*` alias.

## Reuse before writing

Grep before you write. Every new component, helper or file starts with a search for one that
already does the job, because two implementations of one idea drift and then neither is the
answer.

- Before building any UI pattern (a form field, an empty state, a filter bar, a segmented
  control), search `src/` for it. If something close exists, use it or widen it with a prop.
- **Never copy a component to change three lines.** Lift the difference into a prop, or pull the
  shared part out. `src/features/todos/segmented-field.tsx` is the worked example: the priority
  picker and the filter bar are one control given two sets of options.
- A pattern two features need moves to `src/components/`. A primitive everything needs is a
  shadcn component in `src/components/ui/`, added with the CLI rather than written by hand.
- The same rule outside the UI. A second caller for a helper means it moves up to the layer both
  callers can import, not that it gets pasted twice.
- Generalising is not guessing. Wait for the second real caller, then extract from the two you
  have, so the shape comes from use and not from a prediction.

Two of these are enforced. `dry/no-identical-functions` fails a second function in one file with
a body identical to an earlier one, from 30 tokens up; `bun run dupes` runs jscpd over `src`,
`build` and `lint` and fails on any span of 50 tokens repeated across them. Neither can see that
a new component does what an existing one already does, which is why the grep is step one.

## Adding a feature

1. Create `src/features/<name>/`. Keep it flat until roughly 15 to 20 source files.
2. Write the layers below bottom-up, only the ones you need. Not every feature has all of them.
3. Colocate a `.test.ts(x)` beside each source file as you go.
4. Render it from a route in `src/routes/`.
5. `bun run check`.

Inside a feature import relatively (`./<feature>.state`), so the folder can be renamed without
editing its own internals. Crossing out of one, use `@/...`.

When a feature outgrows flat, split it by sub-domain (`checkout/{cart,payment}/`), never by
technical type. Adding `components/`, `hooks/` and `state/` folders recreates one level down the
by-type layout this structure exists to avoid.

## Feature layers

Dependencies point one way, and the linter enforces every arrow:

```
<feature>.schema.ts <- <feature>.state.ts <- <feature>.api.ts <- <feature>.queries.ts <- *.tsx <- index.ts
```

Nothing imports back up the chain, and no feature imports another feature's internals.

Jotai owns client state; React Query owns anything that came from a server. The rule that
matters: **server data is never copied into an atom, and ephemeral UI state is never parked in
the query cache.** When a mutation changes server data, invalidate the key and let the query
refetch; do not hand the response to a `set(...)`. Do not reach for React Context to share
values, and do not lift state through props just to share it.

### `<feature>.schema.ts`: domain rules

Constants, zod schemas and pure helpers. The bottom layer: it imports zod and nothing else,
which is what lets every layer above share one definition of what is valid.

```ts
export const MAX_TITLE_LENGTH = 80;

export const addTodoSchema = z.object({
  title: z.string().trim().min(1, 'Give the todo a title.').max(MAX_TITLE_LENGTH),
  priority: z.enum(['low', 'normal', 'high']),
});

// What the server sends back is a separate schema from what it accepts.
export const todoSchema = addTodoSchema.extend({
  id: z.string(),
  done: z.boolean(),
  addedAt: z.number(),
});

export type AddTodoInput = z.infer<typeof addTodoSchema>;
export type Todo = z.infer<typeof todoSchema>;
```

Pure predicates belong here too, not in the component that calls them, so two callers cannot
drift apart about what the rule is.

### `<feature>.state.ts`: client state (Jotai)

Atoms live in the feature that owns them, named with an `Atom` suffix. No React here: an atom is
a plain value, which is what lets tests drive it through a bare `createStore()`.

```ts
export const filterAtom = atomWithStorage<TodoFilter>('todos:filter', 'all', undefined, {
  getOnInit: true,
});
export const searchAtom = atom('');
export const isViewNarrowedAtom = atom(
  (get) => get(filterAtom) !== 'all' || get(searchAtom).trim() !== '',
);
export const clearViewAtom = atom(null, (_get, set) => {
  set(filterAtom, 'all');
  set(searchAtom, '');
});
```

- Read with `useAtomValue`, write with `useSetAtom`. `useAtom` only when a component needs both.
- A value computed from other state is a derived `atom((get) => ...)`, never state kept in sync
  by hand. This is the answer to the `useEffect` ban.
- A write-only action atom owns the update rule, so no component can apply it wrongly.
- `atomWithStorage` needs `{ getOnInit: true }`, or the first render shows the initial value and
  corrects itself on mount.
- Never create an atom during render. Module scope, or wrapped in `useMemo`/`useRef`.

### `<feature>.api.ts`: transport

Fetch and its types. The one layer with no framework in it, which is what keeps
`vi.mock('./<feature>.api')` meaningful while the real query wiring still runs.

```ts
export async function addTodo(input: AddTodoInput): Promise<Todo> {
  const response = await fetch('/api/todos', { method: 'POST', body: JSON.stringify(input) });
  if (!response.ok) throw new Error('Could not add.');
  return todoSchema.parse(await response.json());
}
```

Parse responses with a zod schema at this boundary, so everything above works with a real type
instead of a hopeful cast.

### `<feature>.queries.ts`: server state (React Query)

```ts
export const todosKey = ['todos'] as const;

export const todosQuery = queryOptions({
  queryKey: todosKey,
  // Wrapped, not `queryFn: fetchTodos`: React Query would pass its context object in.
  queryFn: () => fetchTodos(),
});

export function useAddTodo(): UseMutationResult<Todo, Error, AddTodoInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddTodoInput) => addTodo(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  });
}
```

- Define queries with `queryOptions`, export the key separately, and pass the whole object to
  `useQuery(todosQuery)`. An object literal at the call site is a lint error.
- Every mutation gets a named hook here, never an inline `useMutation` in a component. What a
  mutation invalidates is a fact about the data, not about the widget that triggered it, so a
  component must never name a query key.
- Keep `onSuccess` on the hook options, not on the `mutate()` call: callbacks passed to
  `mutate()` are dropped if the caller unmounts first, so a row that disappears mid-request
  would skip the invalidation.
- Always wrap the transport call. A bare reference silently receives React Query's context
  object as its first argument.

### Components and `index.ts`

Named function declarations with an explicit `: JSX.Element`. No default exports anywhere.

```ts
// index.ts, the feature's public surface.
export { TodosPanel } from './todos-panel';
```

`@/features/<name>` is legal; `@/features/<name>/<file>` is a lint error. What a feature
exports is its own business: one component, several, a hook, a type, or nothing at all.

## Forms

TanStack Form with zod, through Standard Schema. No adapter package is needed.

```tsx
const form = useForm({
  defaultValues: { title: '' },
  // On the hook, not on a <form.Field validators={{...}}> prop: that object would be new
  // every render and trip react-perf/jsx-no-new-object-as-prop.
  validators: { onChange: addTodoFormSchema },
  onSubmit: async ({ value, formApi }) => {
    await mutateAsync({ title: value.title, priority });
    formApi.reset();
  },
});

<form onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
```

- The schema lives in `<feature>.schema.ts`. If the form collects a subset of what the API
  accepts, derive it (`addTodoSchema.pick({ title: true })`) so the two cannot drift.
- Submit through a mutation hook from `<feature>.queries.ts`.
- **Never mirror state that lives elsewhere into a form field.** Read an atom or a query at
  submit time. `defaultValues` snapshots at mount, so a field seeded from an atom goes stale the
  moment anything else changes it.
- `void form.handleSubmit()` is required: the type-aware `no-floating-promises` and
  `no-misused-promises` rules reject a bare call and an `async` handler on the element.
- Catch a rejecting mutation inside `onSubmit` and render the hook's `isError`. Letting it
  escape is an unhandled rejection.
- Read submit state through `<form.Subscribe selector={...}>`, so the whole form does not
  re-render on every keystroke.

## Loading, error and empty states

Handle every branch explicitly with early returns. Never render a component that assumes `data`
exists.

```tsx
const { data, isPending, isError } = useQuery(todosQuery);

if (isPending) return <p>Loading todos...</p>;
if (isError) return <p role="alert">Could not load todos.</p>;
if (data.length === 0) return <p>Nothing to do yet.</p>;

// Client-side narrowing happens here, in render, from atoms. Nothing is copied either way.
const visible = data.filter((todo) => matchesFilter(todo, filter));
if (visible.length === 0) return <p>No todo matches this view.</p>;
return <ul aria-label="Todos">...</ul>;
```

An empty result is its own state with its own copy; an empty list is not a loading state. A
list narrowed to nothing by a filter is a different state again, and deserves different copy
and a way back out. For
failures that should take out the whole route rather than one widget, use TanStack Router's
`errorComponent`, `pendingComponent` and `notFoundComponent` route options.

## Routing

- Routes are files in `src/routes/`; `__root.tsx` is the shell. `src/routeTree.gen.ts` is
  generated and committed, and regenerates on `dev` and `build`. Never edit it.
- Route files are exempt from `only-export-components`, because a route module must export
  `Route` alongside its component.
- A route imports a feature through its barrel and composes it. Routes do not own how a
  feature's pieces stack.
- Per-route titles go through the `head` route option plus `<HeadContent />` in `__root.tsx`.
  Site-level metadata stays static in `index.html`, because social scrapers do not run JS.

## Configuration

`src/lib/env.ts` is the only module that reads `import.meta.env`; everything else imports the
parsed `env` object. A bad value throws at module load with the key named, so it fails the first
paint instead of becoming `undefined` three layers down.

- Adding a variable is one line in `envSchema` and one in `.env.example`. Both, always.
- Every variable needs a `.default()`. A fresh clone with no `.env` has to run, so validation
  catches a wrong value, not a missing one.
- Raw values are always strings: `z.stringbool()` for booleans, `z.coerce.number()` for numbers.
- `.default()` takes the **output** type, so `z.stringbool().default(false)`, not
  `.default('false')`. `.prefault()` is the one that takes the input type.
- `.env` is read at build time, so `dist/` is baked per environment. Anything that must change
  without a rebuild needs a runtime mechanism, such as a `/config.json` fetched at startup.

## Styling and UI

- Tailwind v4 through `@tailwindcss/vite`. There is no `tailwind.config.js`; theme tokens live
  in `@theme inline` in `src/styles/index.css`.
- That file uses `@import 'tailwindcss' source(none)` and names its own sources. **Adding a
  directory of components outside `src` means adding an `@source` line for it**, or its classes
  are silently not emitted. Automatic detection is off on purpose: it scans every non-gitignored
  file, so English words in prose emit real utilities.
- Compose conditional classes with `cn()` from `@/lib/utils`. oxfmt sorts Tailwind classes,
  including inside `cn()` and `cva()`.
- Style with tokens (`bg-background`, `text-muted-foreground`), not raw colours, so both
  palettes stay live.
- Dark mode is a `.dark` class on `<html>`, set before first paint by an inline script in
  `index.html`. The contract is `localStorage['theme']` of `'light' | 'dark'`, absent meaning
  light whatever the OS prefers. A toggle is an `atomWithStorage` atom on that key and needs no
  HTML change.
- **Never hand-roll a control `src/components/ui/` already provides.** `Button`, not `<button>`;
  `Input`, not `<input>`; the same for `Label`, `Checkbox`, `Separator` and the `Field` family.
  They carry the focus rings, disabled states and token colours, and a raw element drops all
  three without a word. If the primitive is missing, `bunx shadcn@latest add <name>`.
- `ui/no-raw-element` enforces this from the other side: structure is allowed and every other
  element is an error, so a control fails before its component exists and adding a primitive
  needs no config change. Layout, text, lists, `<form>`, `<fieldset>`, `<legend>`, `<output>`,
  media and SVG stay raw. Anything else is a control until `ALLOWED` in `lint/ui.ts` says
  otherwise, and the entry wants a reason next to it. `<iframe>`, `<embed>` and `<object>` are
  the exception that is not about components: nothing is coming to replace them, and the
  disable comment is there to make somebody say what is being embedded.
- `src/components/ui/` is shadcn CLI output. Add components with `bunx shadcn@latest add <name>`,
  and do not hand-edit them: a re-add overwrites the file. oxlint, oxfmt and coverage all skip
  that directory for exactly that reason, so check what the CLI installed and add anything new
  to `package.json` yourself if it only landed in `node_modules`.
  `src/components/` is for components shared across features; anything used by one feature
  belongs in that feature.

## Accessibility

`jsx-a11y` is on and tests query by role and name, so an accessibility regression fails the suite
rather than shipping.

- Reach for the semantic element first, through its component where one exists: `Button` over
  a clickable `<div>`, `Label` over a floating `<span>`, `<ul>` and `<output>` over neither.
- Every input needs a real `<label htmlFor>` and a matching `id`.
- Invalid fields get `aria-invalid` plus `aria-describedby` pointing at the message element.
- Error text gets `role="alert"`.
- Icon-only buttons need an `aria-label`.
- Give lists an accessible name (`aria-label="Todos"`) when the page could hold more
  than one.
- Every `Button` needs an explicit `type`. It renders a bare `<button>`, so inside a form an
  untyped one submits it.

## Testing

Vitest with jsdom and Testing Library. Prefer it over `bun test`: app code imports `.tsx`, CSS
and the `@/*` alias, which need the Vite transform pipeline Vitest shares with the dev server.

- Tests are colocated next to the file under test. Cover both layers: atom logic through a bare
  `createStore()` with no React, component behaviour through Testing Library.
- **Globals are off.** Import `describe`, `it`, `expect` and `vi` from `vitest` in every file.
- Render with `renderWithProviders` from `@/test/render`, which mirrors `main.tsx`. To start from
  specific state, build the store, seed it, and pass it in. That is the same write path
  production uses, so `useHydrateAtoms` is not needed.

```tsx
const store = createStore();
store.set(filterAtom, 'done');
renderWithProviders(<TodoList />, { store });
```

- **Mock the feature's `.api.ts` with `vi.mock`, never the query definitions.** That keeps the
  real `queryOptions` wiring under test instead of a stub of it.
- Query by role and accessible name (`getByRole('button', { name: 'Add todo' })`). Prefer
  `findBy*` over `waitFor` plus `getBy*`, and keep one assertion per `waitFor`.
- Coverage thresholds are 90 across the board. Treat that as a floor against a feature landing
  with no tests, not as a quality bar. Raise it, never quietly lower it. If something is
  genuinely untestable, exclude that file with a reason rather than dropping the number.

## What the linter rejects

`.oxlintrc.jsonc` errors on the `correctness`, `suspicious`, `pedantic` and `perf` categories,
and runs type-aware rules against the real TypeScript program. Every rule below reports a message
naming the fix.

**Banned imports.** Each has the same escape hatch: an inline
`// oxlint-disable-next-line no-restricted-imports` plus a comment saying why.

| Banned                                               | Instead                                              |
| ---------------------------------------------------- | ---------------------------------------------------- |
| `useEffect` from `react`                             | Derive state with an atom, or use an event handler   |
| `forwardRef` from `react`                            | React 19 passes `ref` as an ordinary prop            |
| `createContext` / `useContext`                       | Jotai for client state, React Query for server state |
| `getDefaultStore` from `jotai`                       | The explicit store in `src/lib/store.ts`             |
| `@/features/*/*`                                     | The feature's `index.ts`                             |
| `useMutation` / `useQueryClient` in a feature `.tsx` | A named hook in `<feature>.queries.ts`               |

Per-layer bans enforce the dependency arrows: `.schema.ts` imports no framework and nothing above
it, `.state.ts` imports no React and no React Query, `.api.ts` imports no React, Jotai or React
Query. An override **replaces** `no-restricted-imports` rather than merging it, so editing the
base rule means editing all four copies.

**Also on:**

- `react/react-compiler`, the React Compiler's own analysis: setState during render, reading a ref
  during render, mutating props or state, defining a component inside another component.
- `explicit-module-boundary-types`: exported functions declare their return type, components
  included (`import type { JSX } from 'react'`, then `: JSX.Element`).
- No `any`, no non-null `!`, no `console`, no `@ts-ignore`. `@ts-expect-error` needs a description
  and fails once the underlying problem is fixed.
- `max-lines` 400, `max-lines-per-function` 40, `complexity` 15; test files are exempt from the
  first two. Extract a hook or a sub-component rather than raising a limit.
- `react-perf` bans new objects, arrays and JSX as props. Hoist a constant out of the component.
  New functions as props are allowed.
- `import/no-cycle`, the backstop for direction mistakes the path patterns cannot name.
- `ui/no-raw-element`, from `lint/ui.ts`: every JSX element not in its structural allowlist is
  an error naming the component to use, or the `bunx shadcn@latest add` that would create it.
  `react/forbid-elements` does the same job from a list of banned elements and is not used,
  because that list is right only until a primitive lands that nobody remembered to add to it.
  `src/components/ui` is exempt through `ignorePatterns`.
- `dry/no-identical-functions`, from `lint/dry.ts`, because eslint-plugin-sonarjs cannot load
  under TypeScript 7: it pulls in ts-api-utils, which reads a `ts.TypeFlags` that no longer
  exists. Off in test files, where two cases that set up alike and assert differently are two
  cases rather than one copy.
- `no-deprecated` is type-aware, so a React, TanStack or Jotai deprecation fails the build on the
  version bump rather than surfacing in a changelog nobody read.

`tsconfig.json` runs `strict` plus `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
`noPropertyAccessFromIndexSignature` and `noImplicitReturns`.

When adding a rule, first write a file that violates it and confirm it fires. A rule that fires
on nothing is not a guardrail.

## Git hooks

`bun install` points `core.hooksPath` at `.githooks/`. The pre-commit hook formats and lint-fixes
staged JS/TS/CSS files, re-stages the fixes, then runs `tsc -b`. It aborts on unfixable lint
errors, type errors, or a partially staged file. Bypass with `git commit --no-verify`.

## Agent skills

The `jotai` skill from `jotaijs/jotai-skills` is committed so every contributor gets the same
guidance regardless of which agent they run. `.agents/skills/jotai/` is the shared copy most
agents read; `.claude/skills/jotai/` is an identical copy for Claude Code, and `skills-lock.json`
pins the version. Treat these as vendored: a reinstall overwrites hand edits. Install for another
agent with `bunx skills add jotaijs/jotai-skills --copy -y --skill jotai --agent <name>`, and add
any new agent directory to `ignorePatterns` in `.oxfmtrc.jsonc`.
