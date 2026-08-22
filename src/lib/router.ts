import { createRouter } from '@tanstack/react-router';
import { NotFound, RouteError, RoutePending } from '@/components/route-fallbacks';
import { routeTree } from '../routeTree.gen';
import { queryClient } from './query-client';

// Exported so src/test/render.tsx can build a router that behaves like this one. A test router
// missing these would render TanStack's built-in fallbacks and prove nothing about ours.
export const routerDefaults = {
  // Preload on hover or focus. Paired with a zero preload staleTime because React Query already
  // owns freshness: leaving the router's own preload cache on would serve stale data that Query
  // has no idea it needs to refetch.
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  // Without these a loader failure is a blank page and an unmatched URL is a bare "Not Found".
  defaultPendingComponent: RoutePending,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: NotFound,
} as const;

export const router = createRouter({
  routeTree,
  // Handed to every loader as `context.queryClient`, so a route can prime the cache before its
  // component renders instead of the component asking on mount.
  context: { queryClient },
  ...routerDefaults,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
