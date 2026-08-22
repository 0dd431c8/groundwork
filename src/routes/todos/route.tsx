import type { JSX } from 'react';
import { createFileRoute, Outlet } from '@tanstack/react-router';

// A layout route: it owns the frame both `/todos` and `/todos/$todoId` sit in, and the title they
// share. Neither child repeats the centering, and neither can drift from the other.
export const Route = createFileRoute('/todos')({
  head: () => ({ meta: [{ title: 'Todos' }] }),
  component: TodosLayout,
});

function TodosLayout(): JSX.Element {
  return (
    <div className="flex min-h-dvh justify-center p-8 pt-20">
      <Outlet />
    </div>
  );
}
