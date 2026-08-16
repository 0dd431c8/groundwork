import {
  queryOptions,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { fetchScores, saveScore, type Score } from './counter.api';

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
  // Wrapped rather than `queryFn: fetchScores`: React Query calls query and mutation
  // functions with a context object, and the transport should not quietly receive it.
  // Same reason for the arrow in useSaveScore below.
  queryFn: () => fetchScores(),
});

/**
 * Saving a score makes the score list stale. That is a fact about the data, not about
 * whatever widget triggered the save, so it lives here rather than in a component - any
 * other trigger we add later gets the invalidation for free instead of copying it.
 *
 * `onSuccess` belongs on these options rather than on the `mutate()` call: callbacks
 * passed to `mutate()` are dropped if the caller unmounts before the request settles,
 * so navigating away mid-save would skip the invalidation.
 *
 * Still one `useMutation` per call site, which is what gives each caller its own
 * `isPending`. Sharing that would need a `mutationKey` and `useMutationState`.
 */
export function useSaveScore(): UseMutationResult<Score, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (value: number) => saveScore(value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scoresKey }),
  });
}
