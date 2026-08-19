import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AddTodoForm } from './add-todo-form';
import { PriorityPicker } from './priority-picker';
import { TodoFilters } from './todo-filters';
import { TodoList } from './todo-list';
import { todosQuery } from './todos.queries';

// The count is server data, so it is read back off the same query the list reads. Keeping a
// number in an atom in step with the rows is the exact mistake this layout exists to prevent.
function OpenCount(): JSX.Element | null {
  const { data } = useQuery(todosQuery);

  if (data === undefined) return null;

  return (
    <output className="text-xs font-semibold tracking-widest text-muted-foreground uppercase tabular-nums">
      {data.filter((todo) => !todo.done).length} open
    </output>
  );
}

export function TodosPanel(): JSX.Element {
  return (
    <section className="flex w-full max-w-lg flex-col gap-8">
      <header className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
        <h1 className="text-3xl leading-none">Todos</h1>
        <OpenCount />
      </header>

      {/* The picker is the form's sibling, not its child, and this frame is where the two
          become one composer: how a feature's pieces stack is the panel's business, not
          theirs. `*:p-4` pads the <form> and the <fieldset> directly, so neither has to know
          it is being framed. */}
      <div className="flex flex-col divide-y divide-border border border-border bg-muted/50 *:p-4">
        <AddTodoForm />
        <PriorityPicker />
      </div>

      <div className="flex flex-col gap-5">
        <TodoFilters />
        <TodoList />
      </div>
    </section>
  );
}
