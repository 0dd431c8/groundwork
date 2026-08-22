import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TriangleAlertIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TodoItem } from './todo-item';
import { todosQuery } from './todos.queries';
import { matchesFilter, matchesSearch, todoViewDefaults, type TodoView } from './todos.schema';

// The view is owned by the URL and arrives as a prop. See todo-filters.tsx.
type ViewProps = { view: TodoView; onViewChange: (next: TodoView) => void };

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

// A view narrowed to nothing is a different state again, and the way out is the same write the
// filter bar's "Clear view" performs: one default view object that both callers hand back, so
// neither can clear half of it.
function NoMatches({ onViewChange }: Pick<ViewProps, 'onViewChange'>): JSX.Element {
  return (
    <div className="flex flex-col items-start gap-3 border border-dashed border-border p-6">
      <p className="text-sm text-muted-foreground">No todo matches this view.</p>
      <Button
        type="button"
        size="xs"
        variant="outline"
        onClick={() => onViewChange(todoViewDefaults)}
      >
        Show all todos
      </Button>
    </div>
  );
}

export function TodoList({ view, onViewChange }: ViewProps): JSX.Element {
  const { data, isPending, isError } = useQuery(todosQuery);

  if (isPending) return <PendingRows />;
  if (isError) return <LoadFailed />;
  if (data.length === 0) return <NothingYet />;

  // Server rows and the URL's view meet here, in render, and nowhere else. No cache entry holds
  // the filter and no search param holds a todo, so neither can go stale against the other and
  // there is nothing for an effect to keep in sync.
  const visible = data.filter(
    (todo) => matchesFilter(todo, view.filter) && matchesSearch(todo, view.search),
  );

  if (visible.length === 0) return <NoMatches onViewChange={onViewChange} />;

  return (
    <ul aria-label="Todos" className="w-full">
      {visible.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
