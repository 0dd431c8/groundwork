import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <Button onClick={() => alert('Hello!')}>Hello, World!</Button>
    </div>
  );
}
