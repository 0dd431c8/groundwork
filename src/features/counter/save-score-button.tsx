import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { saveScore } from './counter.api';
import { countAtom } from './counter.state';
import { scoresKey } from './counter.queries';

/**
 * Where the two state layers meet. The value being saved is client state, read from an
 * atom; the saved list is server state, owned by the query cache. Nothing copies one
 * into the other - the mutation invalidates the key and lets the query refetch.
 */
export function SaveScoreButton() {
  const count = useAtomValue(countAtom);
  const queryClient = useQueryClient();

  const { mutate, isPending, isError } = useMutation({
    // Called through an arrow rather than passed as `mutationFn: saveScore`, because
    // React Query hands the mutation function a context object as a second argument.
    // Forwarding only what the API actually takes keeps that out of the transport.
    mutationFn: (value: number) => saveScore(value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scoresKey }),
  });

  return (
    <div className="flex items-center gap-3">
      <Button disabled={isPending} onClick={() => mutate(count)}>
        {isPending ? 'Saving...' : 'Save score'}
      </Button>
      {isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not save that one.
        </p>
      )}
    </div>
  );
}
