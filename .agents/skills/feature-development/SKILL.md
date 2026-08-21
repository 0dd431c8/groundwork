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
and a way back out. For failures that should take out the whole route rather than one widget, use
TanStack Router's `errorComponent`, `pendingComponent` and `notFoundComponent` route options.

## Routing

- Routes are files in `src/routes/`; `__root.tsx` is the shell. `src/routeTree.gen.ts` is
  generated and committed, and regenerates on `dev` and `build`. Never edit it.
- Route files are exempt from `only-export-components`, because a route module must export
  `Route` alongside its component.
- A route imports a feature through its barrel and composes it. Routes do not own how a
  feature's pieces stack.
- Per-route titles go through the `head` route option plus `<HeadContent />` in `__root.tsx`.
  Site-level metadata stays static in `index.html`, because social scrapers do not run JS.
