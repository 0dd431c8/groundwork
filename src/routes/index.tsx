import { createFileRoute } from '@tanstack/react-router';
import { CounterPanel } from '@/features/counter';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <CounterPanel />
    </div>
  );
}
