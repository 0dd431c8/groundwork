import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { env } from '../lib/env';

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
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
