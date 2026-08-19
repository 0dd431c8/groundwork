import type { JSX } from 'react';
import { Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useRemoveTodo, useSetTodoDone } from './todos.queries';
import type { Todo } from './todos.schema';

export function TodoItem({ todo }: { todo: Todo }): JSX.Element {
  const setDone = useSetTodoDone();
  const remove = useRemoveTodo();
  const busy = setDone.isPending || remove.isPending;
  const titleId = `todo-${todo.id}-title`;

  return (
    <li className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
      <Checkbox
        checked={todo.done}
        disabled={busy}
        aria-labelledby={titleId}
        onCheckedChange={(checked) => setDone.mutate({ id: todo.id, done: checked })}
      />
      <span
        id={titleId}
        className={cn('flex-1 text-sm', todo.done && 'text-muted-foreground line-through')}
      >
        {todo.title}
      </span>
      <span className="text-xs tracking-wide text-muted-foreground uppercase">{todo.priority}</span>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label={`Delete ${todo.title}`}
        disabled={busy}
        onClick={() => remove.mutate(todo.id)}
      >
        <Trash2Icon />
      </Button>
    </li>
  );
}
