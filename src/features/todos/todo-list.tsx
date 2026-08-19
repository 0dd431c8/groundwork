import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { TodoItem } from './todo-item';
import { todosQuery } from './todos.queries';
import { matchesFilter, matchesSearch } from './todos.schema';
import { clearViewAtom, filterAtom, searchAtom } from './todos.state';

// The second caller of clearViewAtom, the filter bar being the first. One write-only atom
// owning the rule is what stops the two of them clearing different halves of the view.
function NoMatches(): JSX.Element {
  const clearView = useSetAtom(clearViewAtom);

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm text-muted-foreground">No todo matches this view.</p>
      <Button type="button" size="xs" variant="outline" onClick={() => clearView()}>
        Show all todos
      </Button>
    </div>
  );
}

export function TodoList(): JSX.Element {
  const { data, isPending, isError } = useQuery(todosQuery);
  const filter = useAtomValue(filterAtom);
  const search = useAtomValue(searchAtom);

  if (isPending) return <p className="text-sm text-muted-foreground">Loading todos...</p>;

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Could not load todos.
      </p>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing to do yet.</p>;
  }

  // Server rows and the client-side view meet here, in render, and nowhere else. No atom
  // holds a todo and no query key holds the filter, so neither can go stale against the
  // other and there is nothing for an effect to keep in sync.
  const visible = data.filter((todo) => matchesFilter(todo, filter) && matchesSearch(todo, search));

  if (visible.length === 0) return <NoMatches />;

  return (
    <ul aria-label="Todos" className="w-full">
      {visible.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
