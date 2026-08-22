import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, HeadContent, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from '@/components/toaster';
import type { RuntimeContext } from '@/lib/runtime';
import { env } from '../lib/env';

export const Route = createRootRouteWithContext<RuntimeContext>()({
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
