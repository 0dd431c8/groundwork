import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createRouter,
  RouterContextProvider,
  RouterProvider,
  type RouterHistory,
} from '@tanstack/react-router';
import { createStore, Provider } from 'jotai';
import type { JSX, ReactNode } from 'react';
import { NotFound, RouteError, RoutePending } from '@/components/route-fallbacks';
import { routeTree } from '@/routeTree.gen';
import { notifyError } from './notify';

export type RuntimeContext = { queryClient: QueryClient };
export type RuntimeStore = ReturnType<typeof createStore>;

type RuntimeOptions = {
  history?: RouterHistory;
  mutationErrorReporter?: (error: unknown) => void;
  queryClient?: QueryClient;
  queryRetry?: boolean | number;
  store?: RuntimeStore;
};

const routerDefaults = {
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultPendingComponent: RoutePending,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: NotFound,
} as const;

function buildRuntime(options: RuntimeOptions = {}) {
  const mutationErrorReporter = options.mutationErrorReporter ?? notifyError;
  const queryClient =
    options.queryClient ??
    new QueryClient({
      mutationCache: new MutationCache({
        onError: (error) => {
          mutationErrorReporter(error);
        },
      }),
      defaultOptions: {
        queries: { staleTime: 30_000, retry: options.queryRetry ?? 1 },
      },
    });
  const history = options.history;
  const router = createRouter({
    routeTree,
    context: { queryClient },
    ...routerDefaults,
    ...(history === undefined ? {} : { history }),
  });

  return { queryClient, router, store: options.store ?? createStore() };
}

export type AppRuntime = ReturnType<typeof buildRuntime>;

export function createAppRuntime(options: RuntimeOptions = {}): AppRuntime {
  return buildRuntime(options);
}

export const appRuntime = createAppRuntime();

export function RuntimeApp({ runtime }: { runtime: AppRuntime }): JSX.Element {
  return (
    <QueryClientProvider client={runtime.queryClient}>
      <Provider store={runtime.store}>
        <RouterProvider router={runtime.router} />
      </Provider>
    </QueryClientProvider>
  );
}

export function RuntimeScope({
  runtime,
  children,
}: {
  runtime: AppRuntime;
  children: ReactNode;
}): JSX.Element {
  return (
    <QueryClientProvider client={runtime.queryClient}>
      <Provider store={runtime.store}>
        <RouterContextProvider router={runtime.router}>{children}</RouterContextProvider>
      </Provider>
    </QueryClientProvider>
  );
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof appRuntime.router;
  }
}
