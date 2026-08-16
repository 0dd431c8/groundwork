import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { ReactElement, ReactNode } from 'react';

// Jotai does not re-export its store type from the package root, so derive it.
type Store = ReturnType<typeof createStore>;

type Options = Omit<RenderOptions, 'wrapper'> & {
  store?: Store;
  queryClient?: QueryClient;
};

// Without `retry: false` a test of an error branch waits out three backoffs and times out.
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

type Rendered = RenderResult & { store: Store; queryClient: QueryClient };

/**
 * Renders `ui` in the same provider stack as src/main.tsx, over a store and a
 * QueryClient created per call. To start from a specific state, seed a store with
 * `store.set(...)` and pass it in:
 *
 *     const store = createStore();
 *     store.set(countAtom, MAX_COUNT);
 *     renderWithProviders(<Counter />, { store });
 */
export function renderWithProviders(
  ui: ReactElement,
  { store = createStore(), queryClient = createTestQueryClient(), ...options }: Options = {},
): Rendered {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>{children}</Provider>
    </QueryClientProvider>
  );

  return { store, queryClient, ...render(ui, { wrapper, ...options }) };
}
