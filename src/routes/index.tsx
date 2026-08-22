import { createFileRoute, redirect } from '@tanstack/react-router';

// The app's front door. A real project replaces this with a home page; while the todos feature is
// the only thing here, sending `/` straight at it beats a page that says "click here".
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/todos' });
  },
});
