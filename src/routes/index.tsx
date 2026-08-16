import { createFileRoute } from '@tanstack/react-router';
import { Counter } from '@/features/counter/counter';
import { SaveScoreButton } from '@/features/counter/save-score-button';
import { ScoreList } from '@/features/counter/score-list';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-8">
      <Counter />
      <SaveScoreButton />
      <ScoreList />
    </div>
  );
}
