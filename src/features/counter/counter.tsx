import type { JSX } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { canDecrementAtom, canIncrementAtom, countAtom, stepAtom } from './counter.state';

export function Counter(): JSX.Element {
  const count = useAtomValue(countAtom);
  const canDecrement = useAtomValue(canDecrementAtom);
  const canIncrement = useAtomValue(canIncrementAtom);
  const step = useSetAtom(stepAtom);

  return (
    <div className="flex items-center gap-4">
      <Button size="icon" aria-label="Decrement" disabled={!canDecrement} onClick={() => step(-1)}>
        -
      </Button>
      <output aria-label="Count" className="text-lg tabular-nums">
        {count}
      </output>
      <Button size="icon" aria-label="Increment" disabled={!canIncrement} onClick={() => step(1)}>
        +
      </Button>
    </div>
  );
}
