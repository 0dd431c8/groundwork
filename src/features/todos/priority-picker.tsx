import type { JSX } from 'react';
import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { todoPriorities } from './todos.schema';
import { newTodoPriorityAtom } from './todos.state';

// Sits beside the form rather than inside it, which is the whole point: add-todo-form.tsx
// reads this atom at submit instead of seeding a field from it and going stale.
export function PriorityPicker(): JSX.Element {
  const [priority, setPriority] = useAtom(newTodoPriorityAtom);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-semibold tracking-wide uppercase">Priority</legend>
      <div className="flex gap-2">
        {todoPriorities.map((option) => (
          <Button
            key={option}
            type="button"
            size="xs"
            variant={option === priority ? 'default' : 'outline'}
            aria-pressed={option === priority}
            onClick={() => setPriority(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
