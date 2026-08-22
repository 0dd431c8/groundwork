# Routing and data states

Choose which layer owns pending and failure behavior before choosing a loader API. Then make every
remaining data state explicit.

## Pending, failure, and empty results

When the feature owns its query states, read with `useQuery` and return early for pending, error,
empty, and filtered-empty results. Do not render a component that assumes `data` exists.

```tsx
const { data, isPending, isError } = useQuery(todosQuery);

if (isPending) return <p>Loading todos...</p>;
if (isError) return <p role="alert">Could not load todos.</p>;
if (data.length === 0) return <p>Nothing to do yet.</p>;

const visible = data.filter((todo) => matchesFilter(todo, view.filter));
if (visible.length === 0) return <p>No todo matches this view.</p>;
return <ul aria-label="Todos">...</ul>;
```

An empty collection and a collection narrowed to nothing need different copy. A filtered-empty
state also needs a way to clear or change the view.

The shared router in `src/lib/runtime.tsx` already supplies pending, error, and not-found fallbacks.
Override one only when the route needs behavior the shared fallback cannot provide.

## Loader ownership

Use the query-client method whose cache and failure behavior matches the route:

- `prefetchQuery` never rejects. Use it to warm the cache when the mounted feature still owns
  pending and error branches through `useQuery`.
- `ensureQueryData` returns cached data immediately even when it is stale. With
  `revalidateIfStale`, it starts a background refresh but does not await it. Use it only when any
  cached value is sufficient for the loader's decision.
- `fetchQuery` reuses fresh data, awaits stale refetches, and rejects on failure. Use it when the
  route decision requires current server state.

When the route owns pending and failure, await the query in the loader and read it with
`useSuspenseQuery`. The component omits those branches because the loader makes them unreachable.

```tsx
export const Route = createFileRoute('/todos/')({
  loader: ({ context }) => context.queryClient.prefetchQuery(todosQuery),
  component: TodosRoute,
});
```

## Missing records

Translate only the transport's named missing-record error into `notFound()` and let every other
error reach the route error component. Prefer `fetchQuery` for this decision so stale cached detail
does not render after a deletion.

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

## Search parameters

Declare URL-owned state on the route and validate it with the feature's zod schema:

```tsx
validateSearch: todoViewSchema,
search: { middlewares: [stripSearchParams(todoViewDefaults)] },
```

- Give each field a `.default()` and `.catch()` so a hand-edited URL falls back to a usable view.
- Strip default values so the canonical unfiltered address has no redundant query string.
- Read search state once with `Route.useSearch()` and pass it to a controlled feature component
  with a navigation callback.
- Use `replace: true` for values that change per keystroke so browser history remains useful.

## Route details

- A directory nests routes: `todos/route.tsx` is the layout for `todos/index.tsx` and
  `todos/$todoId.tsx`.
- Export query options needed by loaders through the feature barrel.
- Put route titles in the `head` option. Site-wide static metadata remains in `index.html`.
- TanStack links match descendants by default. Give a parent or list backlink exact active
  matching when it also renders on detail routes, and keep the options object at module scope.
- Follow the enforced route-option order: `params`/`validateSearch`, `search`, `loaderDeps`,
  `context`, `beforeLoad`, `loader`, then `head`.
