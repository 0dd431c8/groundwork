---
name: testing
description: Write or fix tests in this repo. Use when adding a colocated .test.ts or .test.tsx file, seeding a Jotai store for a test, rendering with renderWithProviders or renderRoute, testing a route's search params or loader, mocking a feature's api module, querying by role and accessible name, waiting for async UI, or dealing with a coverage threshold failure.
---

# Testing

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
store.set(newTodoPriorityAtom, 'high');
renderWithProviders(<PriorityPicker />, { store });
```

- It also puts the app's real route tree in context, through `RouterContextProvider`, so a
  component containing a `<Link>` renders without one of its own and a wrong `to` fails here rather
  than in the browser. Pass `path` when location affects the result, including active-link state.
  At a nested path, assert both navigation (`href`) and current-page semantics (`aria-current` is
  present only for the link that actually names that page); an href assertion alone misses fuzzy
  prefix matches on backlinks.
- State the URL owns is never seeded: it reaches a component as a prop, so pass it directly and
  assert on the callback.

```tsx
const onViewChange = vi.fn<(next: TodoView) => void>();
renderWithProviders(
  <TodoFilters view={{ filter: 'done', search: '' }} onViewChange={onViewChange} />,
);
```

- **When the route is the thing under test, use `renderRoute('/todos?filter=done')`.** It renders
  the real tree through `RouterProvider`, which is the only way to cover `validateSearch`, a loader,
  `notFound()`, or what a click does to the address bar. Prefer naming a component otherwise: it is
  faster and it says what it is testing.
- Treat cache-lifecycle bugs as one route test, not several fresh renders. Keep the `router` and
  `queryClient` returned by one `renderRoute`, load the first route so its query is cached, navigate
  away, complete the mutation through the UI, then revisit through `router.navigate` or history.
  Wait until the mutation's visible result has settled before revisiting, and assert both the new
  terminal state (for example, `Not found.`) and the absence of stale content. Calling
  `renderRoute` again creates a new client and cannot reproduce a stale-cache regression.
- A component test of an error branch does not prove that a loader lets the component mount. When
  a loader primes the same query, force the initial read to fail through the real route and assert
  the feature's alert rather than the router error fallback. Prefer the fake transport's own
  failure control; if it has none, a narrowly scoped `.api.ts` mock is appropriate for this
  boundary test. Keep the real query options and route loader in place.
- Both helpers use the deep App Runtime in `src/lib/runtime.tsx`. Do not hand-roll a `QueryClient`
  or a `createRouter` in a test: one that goes stale on a different schedule, skips the mutation
  reporter adapter, or falls back to TanStack's built-in "Not Found" proves something the app does
  not do.

- **Mock the feature's `.api.ts` with `vi.mock`, never the query definitions.** That keeps the
  real `queryOptions` wiring under test instead of a stub of it. Route tests ordinarily use the
  existing fake server; reserve an API mock for a transport state the fake cannot produce, such as
  proving which error boundary owns an initial read failure.
- Query by role and accessible name (`getByRole('button', { name: 'Add todo' })`). Prefer
  `findBy*` over `waitFor` plus `getBy*`, and keep one assertion per `waitFor`.
- Coverage thresholds are 90 across the board. Treat that as a floor against a feature landing
  with no tests, not as a quality bar. Raise it, never quietly lower it. If something is
  genuinely untestable, exclude that file with a reason rather than dropping the number.
