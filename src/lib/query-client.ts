import { MutationCache, QueryClient } from '@tanstack/react-query';
import { notifyError } from './notify';

// Exported so src/test/render.tsx can build a client that behaves like this one. A test whose
// cache behaves differently from production is a test that proves the wrong thing.
export const queryDefaults = {
  // The default is 0, which refetches on every mount and every window focus. That reads as a
  // refetch storm the second time a route is visited, and it makes a route loader re-fetch on
  // every search-param change.
  staleTime: 30_000,
  // One retry, not three: three backoffs is 7s of a spinner before an error branch renders.
  retry: 1,
} as const;

export const queryClient = new QueryClient({
  // Every mutation failure reports the same way, so no feature has to remember to raise its own.
  // Query failures deliberately do not go through here: the component that asked for the data is
  // where a read failure belongs (see `LoadFailed` in todo-list.tsx), and a toast on every
  // background refetch would be noise nobody can act on.
  mutationCache: new MutationCache({
    onError: (error) => {
      notifyError(error);
    },
  }),
  defaultOptions: { queries: queryDefaults },
});
