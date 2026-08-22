import type { JSX } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { todoQuery } from './todos.queries';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const exactActiveOptions = { exact: true } as const;

// `useSuspenseQuery`, not `useQuery`: the route's loader has already awaited this exact key, so
// there is no pending branch left to render. Reading the query rather than the loader's return
// value is what keeps this view subscribed, so a mutation that invalidates the list updates the
// detail too. It is why this component has no loading state of its own while todo-list.tsx does.
export function TodoDetail({ todoId }: { todoId: string }): JSX.Element {
  const { data: todo } = useSuspenseQuery(todoQuery(todoId));

  return (
    <article className="flex w-full max-w-lg flex-col gap-6">
      <Link
        to="/todos"
        activeOptions={exactActiveOptions}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
        All todos
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl leading-tight">{todo.title}</h1>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {todo.priority} priority
        </p>
      </header>

      <Separator />

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Status</dt>
        <dd>{todo.done ? 'Done' : 'Open'}</dd>
        <dt className="text-muted-foreground">Added</dt>
        <dd className="tabular-nums">{dateFormat.format(todo.addedAt)}</dd>
      </dl>
    </article>
  );
}
