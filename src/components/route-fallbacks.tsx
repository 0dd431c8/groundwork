import type { JSX, ReactNode } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { TriangleAlertIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';

/**
 * The three router-level fallbacks, named in `src/lib/router.ts` as `defaultPendingComponent`,
 * `defaultErrorComponent` and `defaultNotFoundComponent`. Every route gets them without asking; a
 * route that wants its own says so with the matching per-route option.
 *
 * They live here rather than in `src/lib/router.ts` because that file is infrastructure and holds
 * no JSX.
 */

function Frame({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      {children}
    </div>
  );
}

export function RoutePending(): JSX.Element {
  return (
    <Frame>
      {/* Not a spinner: the router only shows this after its own delay, so by the time anyone
          sees it the wait is long enough to deserve words. */}
      <output className="text-sm text-muted-foreground">Loading...</output>
    </Frame>
  );
}

export function RouteError({ error }: { error: Error }): JSX.Element {
  // `invalidate()` re-runs the loaders for the matched routes, which is the retry that means
  // something here. Reloading the page would also lose whatever else is on screen.
  const router = useRouter();

  return (
    <Frame>
      <div role="alert" className="flex flex-col items-center gap-2">
        <TriangleAlertIcon aria-hidden="true" className="size-5 text-destructive" />
        <h1 className="text-2xl leading-none">Something went wrong.</h1>
        <p className="max-w-prose text-sm text-muted-foreground">{error.message}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => void router.invalidate()}>
        Try again
      </Button>
    </Frame>
  );
}

export function NotFound(): JSX.Element {
  return (
    <Frame>
      <h1 className="text-2xl leading-none">Not found.</h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        That address does not match anything here.
      </p>
      <Link to="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        Go home
      </Link>
    </Frame>
  );
}
