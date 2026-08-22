import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory } from '@tanstack/react-router';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { createStore } from 'jotai';
import type { ReactElement, ReactNode } from 'react';
import {
  createAppRuntime,
  RuntimeApp,
  RuntimeScope,
  type AppRuntime,
  type RuntimeStore,
} from '@/lib/runtime';

type Providers = { store?: RuntimeStore; queryClient?: QueryClient | undefined };

type Options = Omit<RenderOptions, 'wrapper'> & Providers & { path?: string };

type Rendered = RenderResult & AppRuntime & { mutationErrors: unknown[] };

function createTestRuntime(path: string, providers: Providers): RenderedRuntime {
  const mutationErrors: unknown[] = [];
  const runtime = createAppRuntime({
    history: createMemoryHistory({ initialEntries: [path] }),
    mutationErrorReporter: (error) => {
      mutationErrors.push(error);
    },
    queryRetry: false,
    ...(providers.queryClient === undefined ? {} : { queryClient: providers.queryClient }),
    ...(providers.store === undefined ? {} : { store: providers.store }),
  });
  return { mutationErrors, runtime };
}

type RenderedRuntime = { mutationErrors: unknown[]; runtime: AppRuntime };

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
  { store = createStore(), queryClient, path = '/todos', ...options }: Options = {},
): Rendered {
  const { mutationErrors, runtime } = createTestRuntime(path, { store, queryClient });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <RuntimeScope runtime={runtime}>{children}</RuntimeScope>
  );

  return { ...runtime, mutationErrors, ...render(ui, { wrapper, ...options }) };
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
  { store = createStore(), queryClient }: Providers = {},
): Rendered {
  const { mutationErrors, runtime } = createTestRuntime(path, { store, queryClient });

  return {
    ...runtime,
    mutationErrors,
    ...render(<RuntimeApp runtime={runtime} />),
  };
}
