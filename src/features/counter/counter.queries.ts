import { queryOptions } from '@tanstack/react-query';
import { fetchScores } from './counter.api';

export const scoresKey = ['scores'] as const;

/**
 * Shared query definition. `queryOptions` ties the key to the function's return type,
 * so `useQuery(scoresQuery)` and `queryClient.invalidateQueries({ queryKey: scoresKey })`
 * cannot drift apart.
 *
 * Kept out of counter.api.ts so tests can mock the transport with
 * `vi.mock('./counter.api')` while this real query config still runs.
 */
export const scoresQuery = queryOptions({
  queryKey: scoresKey,
  // Wrapped rather than `queryFn: fetchScores`: React Query calls the query function
  // with a context object, and the transport should not quietly receive it.
  queryFn: () => fetchScores(),
});
