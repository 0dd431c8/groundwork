import { createFileRoute } from '@tanstack/react-router';
import { TodosPanel } from '@/features/todos';

export const Route = createFileRoute('/')({
  // Per-route metadata; <HeadContent /> in __root.tsx is what puts it in the document.
  head: () => ({ meta: [{ title: 'Todos' }] }),
  component: Home,
});

function Home() {
  return (
    <div className="flex min-h-dvh justify-center p-8">
      <TodosPanel />
    </div>
  );
}
