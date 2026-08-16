import { Counter } from '@/features/counter/counter';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <Counter />
    </div>
  );
}
