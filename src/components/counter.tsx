import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { clamp, MAX_COUNT, MIN_COUNT } from '@/lib/counter';

export function Counter() {
  const [count, setCount] = useState(MIN_COUNT);
  const step = (delta: number) =>
    setCount((current) => clamp(current + delta, MIN_COUNT, MAX_COUNT));

  return (
    <div className="flex items-center gap-4">
      <Button
        size="icon"
        aria-label="Decrement"
        disabled={count === MIN_COUNT}
        onClick={() => step(-1)}
      >
        -
      </Button>
      <output aria-label="Count" className="text-lg tabular-nums">
        {count}
      </output>
      <Button
        size="icon"
        aria-label="Increment"
        disabled={count === MAX_COUNT}
        onClick={() => step(1)}
      >
        +
      </Button>
    </div>
  );
}
