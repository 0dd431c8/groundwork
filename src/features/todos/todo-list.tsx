import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { TriangleAlertIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TodoItem } from './todo-item';
import { todosQuery } from './todos.queries';
import { matchesFilter, matchesSearch } from './todos.schema';
import { clearViewAtom, filterAtom, searchAtom } from './todos.state';

const skeletonRows = [0, 1, 2];

// Placeholders in the shape the real rows land in, so nothing below them jumps when the
// request settles. The message stays in the DOM for anyone who cannot see the shapes.
function PendingRows(): JSX.Element {
  return (
    <div>
      <output className="sr-only">Loading todos...</output>
      <ul aria-hidden="true" className="w-full">
        {skeletonRows.map((row) => (
          <li
            key={row}
            className="flex items-center gap-3 border-b border-l-2 py-2.5 pl-3 last:border-b-0"
          >
            <span className="size-4.5 bg-muted motion-safe:animate-pulse" />
            <span className="h-3 w-2/3 bg-muted motion-safe:animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoadFailed(): JSX.Element {
  return (
    <p
      role="alert"
      className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
    >
      <TriangleAlertIcon aria-hidden="true" className="size-4 shrink-0" />
      Could not load todos.
    </p>
  );
}

// An empty server is its own state with its own copy, and it says how to leave it.
function NothingYet(): JSX.Element {
  return (
    <div className="flex flex-col gap-1 border border-dashed border-border p-6">
      <p className="text-sm font-medium">Nothing to do yet.</p>
      <p className="text-sm text-muted-foreground">Add the first one with the field above.</p>
    </div>
  );
}

// A view narrowed to nothing is a different state again, and the way out is the second caller
// of clearViewAtom, the filter bar being the first. One write-only atom owning the rule is what
// stops the two of them clearing different halves of the view.
function NoMatches(): JSX.Element {
  const clearView = useSetAtom(clearViewAtom);

  return (
    <div className="flex flex-col items-start gap-3 border border-dashed border-border p-6">
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

  if (isPending) return <PendingRows />;
  if (isError) return <LoadFailed />;
  if (data.length === 0) return <NothingYet />;

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
