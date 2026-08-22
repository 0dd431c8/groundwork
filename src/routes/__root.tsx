import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, HeadContent, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from '@/components/toaster';
import { env } from '../lib/env';

// The context every loader receives. src/lib/router.ts is what supplies it.
type RouterContext = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      {/* Renders whatever the matched routes declare in their `head` option. */}
      <HeadContent />
      <Outlet />
      <Toaster />
      {/* DEV stays first, so the variable can only turn devtools off in dev, never on in prod. */}
      {import.meta.env.DEV && env.VITE_ENABLE_DEVTOOLS && (
        <>
          <TanStackRouterDevtools />
          <ReactQueryDevtools />
        </>
      )}
    </>
  ),
});
