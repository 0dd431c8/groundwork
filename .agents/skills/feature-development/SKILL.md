---
name: feature-development
description: Build or change a feature under src/features/, its schema, state, api and queries layers, its route, or its loading, error and empty branches. Use when adding a feature folder, writing a zod schema or pure predicate, defining a Jotai atom, writing a fetch wrapper, defining a queryOptions or a mutation hook, writing a feature component or its index.ts barrel, adding a file to src/routes/, or deciding what to render while a query is pending, failed or empty.
---

# Feature development

The layers, the file each thing belongs in, and how a route composes them. `AGENTS.md` carries the
dependency arrows and the banned-imports table; this is the detail behind them.

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

`AGENTS.md` has the chain, the one-way rule and the split between Jotai and React Query. What
follows is what goes in each file.

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

**Check first that the value is Jotai's at all.** Anything from a server is React Query's. A view
worth sharing or worth surviving a reload - a filter, a search term, a page, a sort - is the URL's,
and goes in `validateSearch` on the route. What is left is what this browser owns alone, and that
is what an atom is for.

```ts
export const newTodoPriorityAtom = atomWithStorage<TodoPriority>(
  'todos:priority',
  'normal',
  undefined,
  { getOnInit: true },
);
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

## Loading, error and empty states

Handle every branch explicitly with early returns. Never render a component that assumes `data`
exists.

```tsx
const { data, isPending, isError } = useQuery(todosQuery);

if (isPending) return <p>Loading todos...</p>;
if (isError) return <p role="alert">Could not load todos.</p>;
if (data.length === 0) return <p>Nothing to do yet.</p>;

// Narrowing happens here, in render, from the view the route passed down. Nothing is copied
// either way: no atom holds a todo and no query key holds the filter.
const visible = data.filter((todo) => matchesFilter(todo, view.filter));
if (visible.length === 0) return <p>No todo matches this view.</p>;
return <ul aria-label="Todos">...</ul>;
```

An empty result is its own state with its own copy; an empty list is not a loading state. A
list narrowed to nothing by a filter is a different state again, and deserves different copy
and a way back out.

For failures that should take out the whole route rather than one widget, the router already has
fallbacks: `src/lib/runtime.tsx` sets `defaultPendingComponent`, `defaultErrorComponent` and
`defaultNotFoundComponent` from `src/components/route-fallbacks.tsx`, so a new route gets all three
without asking. Override one route's with the matching per-route option only when that route needs
something the shared one cannot say.

Choose the failure owner before choosing the loader API. If the feature has its own pending and
error branches, keep `useQuery` and prime it with the loader's non-throwing `prefetchQuery`; an
initial failure then reaches the feature instead of replacing the route. A throwing
`ensureQueryData` or `fetchQuery` loader makes that feature error branch unreachable on the initial
visit.

When a failure should take out the whole route, await it in the loader and read the same query with
`useSuspenseQuery`. The loader owns pending and failure, so the component has neither branch to
write. That is the only place in this repo where those states are missing on purpose.

## Routing

- Routes are files in `src/routes/`; `__root.tsx` is the shell. A directory nests them:
  `todos/route.tsx` is the layout that `todos/index.tsx` and `todos/$todoId.tsx` render inside.
  `src/routeTree.gen.ts` is generated and committed, and regenerates on `dev` and `build`. Never
  edit it.
- Route files are exempt from `only-export-components`, because a route module must export
  `Route` alongside its component.
- A route imports a feature through its barrel and composes it. Routes do not own how a
  feature's pieces stack. A loader needs the feature's `queryOptions`, so name them in the
  barrel - `@/features/<name>/<file>` is a lint error even from a route.
- TanStack links match descendants by default. A parent/list backlink rendered on a detail route
  needs exact active matching, or it receives `aria-current="page"` while it points somewhere else.
  Keep the options object at module scope so it is not a fresh object prop:

  ```tsx
  const exactActiveOptions = { exact: true } as const;

  <Link to="/todos" activeOptions={exactActiveOptions}>
    All todos
  </Link>;
  ```

- Per-route titles go through the `head` route option plus `<HeadContent />` in `__root.tsx`, and
  `head` can read what the loader returned. Site-level metadata stays static in `index.html`,
  because social scrapers do not run JS.

### Loaders

`__root.tsx` is a `createRootRouteWithContext<{ queryClient: QueryClient }>()`, so every loader
gets the client:

```tsx
export const Route = createFileRoute('/todos/')({
  loader: ({ context }) => context.queryClient.prefetchQuery(todosQuery),
  component: TodosRoute,
});
```

The component still reads the same query with `useQuery`. `prefetchQuery` warms the cache but does
not reject, so the component's own error branch remains reachable; combined with
`defaultPreload: 'intent'`, it starts on hover.

Use the client method whose cache and failure semantics match the route:

- `prefetchQuery` never rejects. Use it when the query component owns pending and failure.
- `ensureQueryData` fetches only when data is absent. Cached data is returned immediately even
  when stale; `revalidateIfStale` starts a background request but does not await it. Use it only
  when any cached value is sufficient for the loader's decision.
- `fetchQuery` reuses fresh data but awaits a stale refetch and rejects if validation fails. Use it
  when the route decision depends on current server state, especially a detail route that maps a
  missing record to `notFound()`.

`router/create-route-property-order` enforces the option order:
`params`/`validateSearch` -> `search` -> `loaderDeps` -> `context` -> `beforeLoad` -> `loader` ->
`head`. Put `head` last, not first.

A loader is also where a missing row becomes a 404. The transport throws a named error, the loader
turns that one error into `notFound()` and lets everything else through to the error component:

```tsx
loader: async ({ context, params }) => {
  try {
    return await context.queryClient.fetchQuery(todoQuery(params.todoId));
  } catch (error) {
    if (error instanceof TodoNotFoundError) throw notFound();
    throw error;
  }
},
```

This distinction matters after a mutation invalidates a cached detail. `ensureQueryData` can hand
the loader the deleted row before its background refetch fails; `fetchQuery` waits, so the named
missing-record error reaches `notFound()` and stale content never renders.

### Search params

State the URL owns is declared on the route and validated by the feature's own zod schema:

```tsx
validateSearch: todoViewSchema,
search: { middlewares: [stripSearchParams(todoViewDefaults)] },
```

- Give every field a `.default()` **and** a `.catch()`. A hand-edited URL has to render the default
  view, not an error page.
- `stripSearchParams` keeps defaults out of the address, so `/todos` stays the address of the
  unfiltered list.
- The route reads it with `Route.useSearch()` and passes it down as a prop with a callback that
  navigates. Feature components stay controlled and take no router dependency, which is what keeps
  them renderable in a test without one.
- Use `replace: true` for a value that changes per keystroke; a history entry per character makes
  the back button useless.
