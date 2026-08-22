import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRouter,
  RouterContextProvider,
  RouterProvider,
} from '@tanstack/react-router';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { ReactElement, ReactNode } from 'react';
import { queryDefaults } from '@/lib/query-client';
import { routerDefaults } from '@/lib/router';
import { routeTree } from '@/routeTree.gen';

// Jotai does not re-export its store type from the package root, so derive it.
type Store = ReturnType<typeof createStore>;

type Providers = { store?: Store; queryClient?: QueryClient };

type Options = Omit<RenderOptions, 'wrapper'> & Providers & { path?: string };

// The production defaults, minus retries: without `retry: false` a test of an error branch waits
// out the backoff and times out. Everything else is shared, so a test sees the same staleness rules
// the app does and a loader that skips a refetch here skips it there.
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { ...queryDefaults, retry: false } },
  });
}

// `RouterContextProvider`, not `RouterProvider`: this puts the router in context without rendering
// the matched route, so a test still renders the component it named. It uses the real route tree so
// a `<Link to="/todos/$todoId">` resolves against the paths the app actually has, rather than a
// stub list that would drift the first time a route is renamed.
function createTestRouter(queryClient: QueryClient, path: string) {
  return createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
    ...routerDefaults,
  });
}

type TestRouter = ReturnType<typeof createTestRouter>;

type Rendered = RenderResult & { store: Store; queryClient: QueryClient; router: TestRouter };

/**
 * Renders `ui` in the same provider stack as src/main.tsx, over a store, a QueryClient and a
 * router created per call. To start from a specific state, seed a store with `store.set(...)`
 * and pass it in:
 *
 *     const store = createStore();
 *     store.set(newTodoPriorityAtom, 'high');
 *     renderWithProviders(<PriorityPicker />, { store });
 *
 * State the URL owns is not seeded here: it reaches a component as a prop, so a test passes it
 * directly. `path` only sets where the router thinks it is, for components that read the location.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    store = createStore(),
    queryClient = createTestQueryClient(),
    path = '/todos',
    ...options
  }: Options = {},
): Rendered {
  const router = createTestRouter(queryClient, path);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <RouterContextProvider router={router}>
        <Provider store={store}>{children}</Provider>
      </RouterContextProvider>
    </QueryClientProvider>
  );

  return { store, queryClient, router, ...render(ui, { wrapper, ...options }) };
}

/**
 * Renders the app's real route tree at `path`, which is what a test needs when the thing under
 * test is the route itself: its `validateSearch`, its loader, or what a click does to the URL.
 * Everything else should name a component and use `renderWithProviders` above, which is faster
 * and says what it is testing.
 *
 *     const { router } = renderRoute('/todos?filter=done');
 *     expect(router.state.location.searchStr).toBe('?filter=done');
 */
export function renderRoute(
  path: string,
  { store = createStore(), queryClient = createTestQueryClient() }: Providers = {},
): Rendered {
  const router = createTestRouter(queryClient, path);

  return {
    store,
    queryClient,
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      </QueryClientProvider>,
    ),
  };
}
