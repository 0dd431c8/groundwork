import type { JSX } from 'react';
import { Counter } from './counter';
import { SaveScoreButton } from './save-score-button';
import { ScoreList } from './score-list';

export function CounterPanel(): JSX.Element {
  return (
    <section className="flex flex-col items-center gap-8">
      <Counter />
      <SaveScoreButton />
      <ScoreList />
    </section>
  );
}
