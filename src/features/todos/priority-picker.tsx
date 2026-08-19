import type { JSX } from 'react';
import { useAtom } from 'jotai';
import { SegmentedField } from './segmented-field';
import { todoPriorities } from './todos.schema';
import { newTodoPriorityAtom } from './todos.state';

// Sits beside the form rather than inside it, which is the whole point: add-todo-form.tsx
// reads this atom at submit instead of seeding a field from it and going stale. todos-panel.tsx
// is what frames the two as one composer.
export function PriorityPicker(): JSX.Element {
  const [priority, setPriority] = useAtom(newTodoPriorityAtom);

  return (
    <SegmentedField
      legend="Priority"
      options={todoPriorities}
      value={priority}
      onChange={setPriority}
    />
  );
}
