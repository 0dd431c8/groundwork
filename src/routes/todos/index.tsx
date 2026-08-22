import type { JSX } from 'react';
import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { TodosPanel, todosQuery, todoViewDefaults, todoViewSchema } from '@/features/todos';

export const Route = createFileRoute('/todos/')({
  // The zod schema is the validator: anything the URL cannot supply falls back through `.catch()`,
  // so a mangled `?filter=nope` renders the default view instead of an error page.
  validateSearch: todoViewSchema,
  // Values equal to the default are stripped back out, which keeps `/todos` as the address of the
  // unfiltered list rather than `/todos?filter=all&search=`.
  search: { middlewares: [stripSearchParams(todoViewDefaults)] },
  // Primes the cache before the component mounts, while keeping a failed read inside TodoList's
  // explicit error branch. `prefetchQuery` settles without throwing, so a list failure cannot
  // replace the whole route with the router error page. Preloading on hover runs this too.
  loader: ({ context }) => context.queryClient.prefetchQuery(todosQuery),
  component: TodosRoute,
});

function TodosRoute(): JSX.Element {
  const view = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <TodosPanel
      view={view}
      onViewChange={(next) => {
        // Typing replaces rather than pushes: a history entry per keystroke makes the back button
        // useless. Changing the filter is a deliberate act and earns its own entry.
        void navigate({ search: next, replace: next.search !== view.search });
      }}
    />
  );
}
