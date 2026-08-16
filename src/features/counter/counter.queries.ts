import {
  queryOptions,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { fetchScores, saveScore, type Score } from './counter.api';

export const scoresKey = ['scores'] as const;

export const scoresQuery = queryOptions({
  queryKey: scoresKey,
  // Wrapped, not `queryFn: fetchScores`: React Query would pass its context object in.
  queryFn: () => fetchScores(),
});

/**
 * `onSuccess` belongs on these options rather than on the `mutate()` call: callbacks
 * passed to `mutate()` are dropped if the caller unmounts before the request settles,
 * so navigating away mid-save would skip the invalidation.
 */
export function useSaveScore(): UseMutationResult<Score, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (value: number) => saveScore(value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scoresKey }),
  });
}
