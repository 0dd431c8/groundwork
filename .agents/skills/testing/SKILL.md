---
name: testing
description: Write or fix tests in this repo. Use when adding a colocated .test.ts or .test.tsx file, seeding a Jotai store for a test, rendering with renderWithProviders, mocking a feature's api module, querying by role and accessible name, waiting for async UI, or dealing with a coverage threshold failure.
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
