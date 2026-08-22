import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useRemoveTodo, useSetTodoDone } from './todos.queries';
import type { Todo, TodoPriority } from './todos.schema';

// The row's one piece of colour. Three weights of a single hue rather than three hues, so
// scanning the left edge answers "what is urgent" without a legend to read first.
const priorityRail: Record<TodoPriority, string> = {
  high: 'border-l-emphasis',
  normal: 'border-l-emphasis/45',
  low: 'border-l-border',
};

function PriorityTag({ todo }: { todo: Todo }): JSX.Element {
  return (
    <span
      className={cn(
        'text-xs font-semibold tracking-widest uppercase',
        todo.priority === 'high' && !todo.done ? 'text-emphasis' : 'text-muted-foreground',
      )}
    >
      {todo.priority}
    </span>
  );
}

type DeleteButtonProps = { title: string; disabled: boolean; onDelete: () => void };

// Always there below sm, revealed on hover above it. `group-focus-within` is what keeps it
// reachable by keyboard once it is transparent.
function DeleteButton({ title, disabled, onDelete }: DeleteButtonProps): JSX.Element {
  return (
    <Button
      type="button"
      size="icon-xs"
      variant="ghost"
      aria-label={`Delete ${title}`}
      className="text-muted-foreground transition-opacity hover:text-destructive sm:opacity-0 sm:group-focus-within/row:opacity-100 sm:group-hover/row:opacity-100"
      disabled={disabled}
      onClick={onDelete}
    >
      <Trash2Icon />
    </Button>
  );
}

export function TodoItem({ todo }: { todo: Todo }): JSX.Element {
  const setDone = useSetTodoDone();
  const remove = useRemoveTodo();
  const busy = setDone.isPending || remove.isPending;
  const titleId = `todo-${todo.id}-title`;

  return (
    <li
      className={cn(
        'group/row flex items-center gap-3 border-b border-l-2 py-2.5 pl-3 transition-colors last:border-b-0 hover:bg-muted/50',
        // A todo that is done has no urgency left to report, whatever it was filed under.
        todo.done ? 'border-l-border' : priorityRail[todo.priority],
        busy && 'opacity-60',
      )}
    >
      <Checkbox
        checked={todo.done}
        disabled={busy}
        aria-labelledby={titleId}
        onCheckedChange={(checked) => setDone.mutate({ id: todo.id, done: checked })}
      />
      {/* The row's title is the way into the detail route. `params` goes in as an updater rather
          than an object literal: a literal is a fresh object every render and react-perf rejects
          it as a prop, while a new function is fine. */}
      <Link
        to="/todos/$todoId"
        params={() => ({ todoId: todo.id })}
        id={titleId}
        className={cn(
          'flex-1 text-sm hover:underline',
          todo.done && 'text-muted-foreground line-through',
        )}
      >
        {todo.title}
      </Link>
      <PriorityTag todo={todo} />
      <DeleteButton title={todo.title} disabled={busy} onDelete={() => remove.mutate(todo.id)} />
    </li>
  );
}
