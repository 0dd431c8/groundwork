import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { ReactElement, ReactNode } from 'react';

// Jotai exports the store type from 'jotai/vanilla/store' but does not re-export it
// from the package root, so derive it rather than importing through a deep path.
type Store = ReturnType<typeof createStore>;

type Options = Omit<RenderOptions, 'wrapper'> & {
  store?: Store;
  queryClient?: QueryClient;
};

/**
 * `retry: false` is the important part. The app client retries a failed query three
 * times with exponential backoff, so without this any test of an error branch waits
 * seconds for a state that will never arrive and then fails as a timeout.
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

/**
 * Renders `ui` inside the same provider stack as src/main.tsx, defaulting both the
 * Jotai store and the QueryClient to instances created for this call so neither atom
 * state nor cached queries leak between test cases.
 *
 * To start a case from a specific state, build the store yourself and seed it with
 * `store.set(...)` before rendering - that is the same write path production code uses,
 * and it avoids `useHydrateAtoms`, which only earns its keep when you cannot reach the
 * store before the first render (SSR).
 *
 *     const store = createStore();
 *     store.set(countAtom, MAX_COUNT);
 *     renderWithProviders(<Counter />, { store });
 */
export function renderWithProviders(
  ui: ReactElement,
  { store = createStore(), queryClient = createTestQueryClient(), ...options }: Options = {},
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>{children}</Provider>
    </QueryClientProvider>
  );

  return { store, queryClient, ...render(ui, { wrapper, ...options }) };
}
