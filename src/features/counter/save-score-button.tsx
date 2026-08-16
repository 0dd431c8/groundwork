import type { JSX } from 'react';
import { useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { countAtom } from './counter.state';
import { useSaveScore } from './counter.queries';

/**
 * Where the two state layers meet. The value being saved is client state, read from an
 * atom; the saved list is server state, owned by the query cache. This component knows
 * nothing about query keys - useSaveScore owns what saving invalidates.
 */
export function SaveScoreButton(): JSX.Element {
  const count = useAtomValue(countAtom);
  const { mutate, isPending, isError } = useSaveScore();

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
