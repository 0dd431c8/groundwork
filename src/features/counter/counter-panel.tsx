import { Counter } from './counter';
import { SaveScoreButton } from './save-score-button';
import { ScoreList } from './score-list';

/**
 * The feature's entry point, and the only part of it a route should import. Composing
 * here rather than in the route means the number of pieces this feature has, and how
 * they stack, stay the feature's business.
 */
export function CounterPanel() {
  return (
    <section className="flex flex-col items-center gap-8">
      <Counter />
      <SaveScoreButton />
      <ScoreList />
    </section>
  );
}
