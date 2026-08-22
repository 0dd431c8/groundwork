import type { JSX } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { TodoDetail, TodoNotFoundError, todoQuery } from '@/features/todos';

export const Route = createFileRoute('/todos/$todoId')({
  // `fetchQuery` still reuses fresh data, but unlike `ensureQueryData` it awaits stale data's
  // refetch. That validation matters after a delete invalidates a cached detail: the missing row
  // must reach this catch instead of rendering its stale copy. An unknown id is a 404; any other
  // failure goes back up to `defaultErrorComponent`.
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.fetchQuery(todoQuery(params.todoId));
    } catch (error) {
      if (error instanceof TodoNotFoundError) throw notFound();
      throw error;
    }
  },
  // Reads what the loader returned, so the tab title names the todo without fetching it twice.
  head: ({ loaderData }) => ({ meta: [{ title: loaderData?.title ?? 'Todo' }] }),
  component: TodoDetailRoute,
});

function TodoDetailRoute(): JSX.Element {
  const { todoId } = Route.useParams();

  return <TodoDetail todoId={todoId} />;
}
