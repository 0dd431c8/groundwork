import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SavedCount } from './counter.api';
import { countsQuery } from './counter.queries';

const formatTime = (savedAt: number) =>
  new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function SavedCountRow({ saved }: { saved: SavedCount }) {
  return (
    <li className="flex justify-between gap-8 py-1">
      <span>
        {saved.label} <span className="tabular-nums">{saved.value}</span>
      </span>
      <span className="text-muted-foreground tabular-nums">{formatTime(saved.savedAt)}</span>
    </li>
  );
}

export function SavedCountList(): JSX.Element {
  const { data, isPending, isError } = useQuery(countsQuery);

  if (isPending) return <p className="text-sm text-muted-foreground">Loading counts...</p>;

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Could not load counts.
      </p>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No counts saved yet.</p>;
  }

  return (
    <ul aria-label="Saved counts" className="text-sm">
      {data.map((saved) => (
        <SavedCountRow key={saved.id} saved={saved} />
      ))}
    </ul>
  );
}
