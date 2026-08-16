import {
  queryOptions,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { fetchCounts, saveCount, type SavedCount } from './counter.api';

export const countsKey = ['counts'] as const;

export const countsQuery = queryOptions({
  queryKey: countsKey,
  // Wrapped, not `queryFn: fetchCounts`: React Query would pass its context object in.
  queryFn: () => fetchCounts(),
});

/**
 * `onSuccess` belongs on these options rather than on the `mutate()` call: callbacks
 * passed to `mutate()` are dropped if the caller unmounts before the request settles,
 * so navigating away mid-save would skip the invalidation.
 */
export function useSaveCount(): UseMutationResult<SavedCount, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (value: number) => saveCount(value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: countsKey }),
  });
}
