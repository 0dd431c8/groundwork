import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Score } from './counter.api';
import { scoresQuery } from './counter.queries';

const formatTime = (savedAt: number) =>
  new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function ScoreRow({ score }: { score: Score }) {
  return (
    <li className="flex justify-between gap-8 py-1">
      <span className="tabular-nums">{score.value}</span>
      <span className="text-muted-foreground tabular-nums">{formatTime(score.savedAt)}</span>
    </li>
  );
}

export function ScoreList(): JSX.Element {
  const { data, isPending, isError } = useQuery(scoresQuery);

  if (isPending) return <p className="text-sm text-muted-foreground">Loading scores...</p>;

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Could not load scores.
      </p>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No scores saved yet.</p>;
  }

  return (
    <ul aria-label="Saved scores" className="text-sm">
      {data.map((score) => (
        <ScoreRow key={score.id} score={score} />
      ))}
    </ul>
  );
}
